"use server";

import { z } from "zod";
import { EquipmentCondition, EquipmentStatus, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const schema = z.object({
  auditLogId: z.string().min(1),
});

const undoQuantitySetSchema = z.object({
  kind: z.literal("quantity_set"),
  equipmentId: z.string().min(1),
  previousQuantity: z.number().int().min(0),
});

const undoEquipmentUpdateSchema = z.object({
  kind: z.literal("equipment_update"),
  equipmentId: z.string().min(1),
  previous: z
    .object({
      name: z.string(),
      assetId: z.string(),
      qrValue: z.string(),
      description: z.string().nullable(),
      categoryId: z.string().nullable(),
      typeId: z.string().nullable(),
      quantity: z.number().int(),
      isConsumable: z.boolean(),
      minStock: z.number().int().nullable(),
      serialNumber: z.string().nullable(),
      status: z.nativeEnum(EquipmentStatus),
      condition: z.nativeEnum(EquipmentCondition),
      purchaseDate: z.date().nullable(),
      warrantyExpiry: z.date().nullable(),
      value: z.any().nullable(),
      notes: z.string().nullable(),
      locationId: z.string().nullable(),
      assignedSection: z.string().nullable(),
      isActive: z.boolean(),
    })
    .nullable(),
  previousCustomFieldValues: z
    .array(z.object({ fieldDefinitionId: z.string().min(1), valueJson: z.any() }))
    .default([]),
});

function parseUndoPayload(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const undo = (data as { undo?: unknown }).undo;
  if (!undo) return null;
  const q = undoQuantitySetSchema.safeParse(undo);
  if (q.success) return q.data;
  const e = undoEquipmentUpdateSchema.safeParse(undo);
  if (e.success) return e.data;
  return null;
}

export async function undoAuditLogAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = schema.safeParse({ auditLogId: String(formData.get("auditLogId") ?? "") });
  if (!parsed.success) throw new Error("Invalid request.");

  const log = await prisma.auditLog.findUnique({ where: { id: parsed.data.auditLogId } });
  if (!log) throw new Error("Audit log not found.");

  const undo = parseUndoPayload(log.data);
  if (!undo) throw new Error("This change can’t be undone automatically.");

  await prisma.$transaction(async (tx) => {
    if (undo.kind === "quantity_set") {
      const equipment = await tx.equipment.findUnique({
        where: { id: undo.equipmentId },
        select: { id: true, assetId: true, quantity: true, isActive: true },
      });
      if (!equipment || !equipment.isActive) throw new Error("Item not found.");

      await tx.equipment.update({
        where: { id: equipment.id },
        data: { quantity: undo.previousQuantity, updatedById: actor.id },
      });

      await tx.auditLog.create({
        data: {
          action: "EQUIPMENT_UPDATED",
          entityType: "Equipment",
          entityId: equipment.id,
          actorId: actor.id,
          summary: `Undid quantity change for ${equipment.assetId}`,
          data: { undoOfAuditLogId: log.id, previousQuantity: equipment.quantity, restoredQuantity: undo.previousQuantity },
        },
      });
    }

    if (undo.kind === "equipment_update") {
      if (!undo.previous) throw new Error("Nothing to restore.");
      const equipment = await tx.equipment.findUnique({
        where: { id: undo.equipmentId },
        select: { id: true, assetId: true, isActive: true },
      });
      if (!equipment || !equipment.isActive) throw new Error("Item not found.");

      await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          name: undo.previous.name,
          assetId: undo.previous.assetId,
          qrValue: undo.previous.qrValue,
          description: undo.previous.description,
          categoryId: undo.previous.categoryId,
          typeId: undo.previous.typeId,
          quantity: undo.previous.quantity,
          isConsumable: undo.previous.isConsumable,
          minStock: undo.previous.minStock,
          serialNumber: undo.previous.serialNumber,
          status: undo.previous.status,
          condition: undo.previous.condition,
          purchaseDate: undo.previous.purchaseDate,
          warrantyExpiry: undo.previous.warrantyExpiry,
          value: undo.previous.value as any,
          notes: undo.previous.notes,
          locationId: undo.previous.locationId,
          assignedSection: undo.previous.assignedSection ?? undefined,
          isActive: undo.previous.isActive,
          updatedById: actor.id,
        },
      });

      const prevMap = new Map(undo.previousCustomFieldValues.map((v) => [v.fieldDefinitionId, v.valueJson]));
      const current = await tx.equipmentCustomFieldValue.findMany({
        where: { equipmentId: equipment.id },
        select: { fieldDefinitionId: true },
      });
      const currentIds = current.map((c) => c.fieldDefinitionId);
      const prevIds = Array.from(prevMap.keys());

      if (currentIds.length) {
        const toDelete = currentIds.filter((id) => !prevMap.has(id));
        if (toDelete.length) {
          await tx.equipmentCustomFieldValue.deleteMany({
            where: { equipmentId: equipment.id, fieldDefinitionId: { in: toDelete } },
          });
        }
      }

      for (const fieldDefinitionId of prevIds) {
        const valueJson = prevMap.get(fieldDefinitionId);
        if (valueJson === undefined || valueJson === null || valueJson === "") continue;
        await tx.equipmentCustomFieldValue.upsert({
          where: { equipmentId_fieldDefinitionId: { equipmentId: equipment.id, fieldDefinitionId } },
          create: {
            equipmentId: equipment.id,
            fieldDefinitionId,
            valueJson,
            updatedById: actor.id,
          },
          update: { valueJson, updatedById: actor.id },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "EQUIPMENT_UPDATED",
          entityType: "Equipment",
          entityId: equipment.id,
          actorId: actor.id,
          summary: `Undid equipment edit for ${equipment.assetId}`,
          data: { undoOfAuditLogId: log.id },
        },
      });
    }
  });

  revalidatePath("/audit");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${log.entityId}`);
}

