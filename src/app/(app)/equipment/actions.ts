"use server";

import { z } from "zod";
import { EquipmentCondition, EquipmentStatus, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const baseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  assetId: z.string().min(1),
  qrValue: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  typeId: z.string().nullable().optional(),
  quantity: z.coerce.number().int().min(0).default(1),
  isConsumable: z.coerce.boolean().optional(),
  minStock: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.nativeEnum(EquipmentStatus).default(EquipmentStatus.AVAILABLE),
  condition: z.nativeEnum(EquipmentCondition).default(EquipmentCondition.GOOD),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  value: z.string().optional(),
  notes: z.string().optional(),
  locationId: z.string().nullable().optional(),
  assignedSection: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  customFields: z.string().optional(), // JSON payload
});

export async function upsertEquipmentAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = baseSchema.safeParse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    name: String(formData.get("name") ?? ""),
    assetId: String(formData.get("assetId") ?? ""),
    qrValue: formData.get("qrValue") ? String(formData.get("qrValue")) : undefined,
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    categoryId: formData.get("categoryId") ? String(formData.get("categoryId")) : null,
    typeId: formData.get("typeId") ? String(formData.get("typeId")) : null,
    quantity: formData.get("quantity") ?? 1,
    isConsumable: formData.get("isConsumable") ? String(formData.get("isConsumable")) : undefined,
    minStock: formData.get("minStock") ? String(formData.get("minStock")) : undefined,
    serialNumber: formData.get("serialNumber") ? String(formData.get("serialNumber")) : undefined,
    status: formData.get("status") ? String(formData.get("status")) : EquipmentStatus.AVAILABLE,
    condition: formData.get("condition") ? String(formData.get("condition")) : EquipmentCondition.GOOD,
    purchaseDate: formData.get("purchaseDate") ? String(formData.get("purchaseDate")) : undefined,
    warrantyExpiry: formData.get("warrantyExpiry") ? String(formData.get("warrantyExpiry")) : undefined,
    value: formData.get("value") ? String(formData.get("value")) : undefined,
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
    locationId: formData.get("locationId") ? String(formData.get("locationId")) : null,
    assignedSection: formData.get("assignedSection") ? String(formData.get("assignedSection")) : undefined,
    isActive: formData.get("isActive") ? String(formData.get("isActive")) : undefined,
    customFields: formData.get("customFields") ? String(formData.get("customFields")) : undefined,
  });

  if (!parsed.success) throw new Error("Check the form fields.");

  const qrValue = parsed.data.qrValue?.trim() || `scouts:${parsed.data.assetId}`;
  const purchaseDate =
    parsed.data.purchaseDate && parsed.data.purchaseDate.trim().length > 0
      ? new Date(parsed.data.purchaseDate)
      : null;
  const warrantyExpiry =
    parsed.data.warrantyExpiry && parsed.data.warrantyExpiry.trim().length > 0
      ? new Date(parsed.data.warrantyExpiry)
      : null;
  const isActive = parsed.data.isActive ?? true;
  const isConsumable = parsed.data.isConsumable ?? false;
  const minStock =
    parsed.data.minStock && parsed.data.minStock.trim().length > 0 ? Number(parsed.data.minStock.trim()) : null;
  if (minStock !== null && (!Number.isFinite(minStock) || minStock < 0)) throw new Error("Min stock must be 0 or more.");

  const valueDecimal =
    parsed.data.value && parsed.data.value.trim().length > 0
      ? new Prisma.Decimal(parsed.data.value.trim())
      : null;

  const baseData = {
    name: parsed.data.name,
    assetId: parsed.data.assetId,
    qrValue,
    description: parsed.data.description,
    categoryId: parsed.data.categoryId ?? null,
    typeId: parsed.data.typeId ?? null,
    quantity: parsed.data.quantity,
    isConsumable,
    minStock,
    serialNumber: parsed.data.serialNumber,
    status: parsed.data.status,
    condition: parsed.data.condition,
    purchaseDate,
    warrantyExpiry,
    value: valueDecimal,
    notes: parsed.data.notes,
    locationId: parsed.data.locationId ?? null,
    assignedSection: parsed.data.assignedSection,
    isActive,
  } satisfies Prisma.EquipmentUncheckedCreateInput;

  const before =
    parsed.data.id
      ? await prisma.equipment.findUnique({
          where: { id: parsed.data.id },
          include: { customFieldValues: true },
        })
      : null;

  const equipment = parsed.data.id
    ? await prisma.equipment.update({
        where: { id: parsed.data.id },
        data: { ...baseData, updatedById: actor.id },
      })
    : await prisma.equipment.create({
        data: { ...baseData, createdById: actor.id, updatedById: actor.id },
      });

  await prisma.auditLog.create({
    data: {
      action: parsed.data.id ? "EQUIPMENT_UPDATED" : "EQUIPMENT_CREATED",
      entityType: "Equipment",
      entityId: equipment.id,
      actorId: actor.id,
      summary: `${parsed.data.id ? "Updated" : "Created"} equipment ${equipment.assetId}`,
      data: parsed.data.id
        ? {
            undo: {
              kind: "equipment_update",
              equipmentId: equipment.id,
              previous: before
                ? {
                    name: before.name,
                    assetId: before.assetId,
                    qrValue: before.qrValue,
                    description: before.description,
                    categoryId: before.categoryId,
                    typeId: before.typeId,
                    quantity: before.quantity,
                    isConsumable: before.isConsumable,
                    minStock: before.minStock,
                    serialNumber: before.serialNumber,
                    status: before.status,
                    condition: before.condition,
                    purchaseDate: before.purchaseDate,
                    warrantyExpiry: before.warrantyExpiry,
                    value: before.value,
                    notes: before.notes,
                    locationId: before.locationId,
                    assignedSection: before.assignedSection,
                    isActive: before.isActive,
                  }
                : null,
              previousCustomFieldValues: before
                ? before.customFieldValues.map((v) => ({
                    fieldDefinitionId: v.fieldDefinitionId,
                    valueJson: v.valueJson,
                  }))
                : [],
            },
          }
        : undefined,
    },
  });

  if (parsed.data.customFields && parsed.data.typeId) {
    let parsedJson: unknown = undefined;
    try {
      parsedJson = JSON.parse(parsed.data.customFields);
    } catch {
      parsedJson = undefined;
    }

    const fieldsPayload = z.record(z.string(), z.unknown()).safeParse(parsedJson);
    if (fieldsPayload.success) {
      const defs = await prisma.customFieldDefinition.findMany({
        where: { equipmentTypeId: parsed.data.typeId },
      });
      await Promise.all(
        defs.map((def) => {
          const valueJson = fieldsPayload.data[def.key];
          if (valueJson === undefined || valueJson === null || valueJson === "") {
            return prisma.equipmentCustomFieldValue.deleteMany({
              where: { equipmentId: equipment.id, fieldDefinitionId: def.id },
            });
          }
          return prisma.equipmentCustomFieldValue.upsert({
            where: {
              equipmentId_fieldDefinitionId: { equipmentId: equipment.id, fieldDefinitionId: def.id },
            },
            create: {
              equipmentId: equipment.id,
              fieldDefinitionId: def.id,
              valueJson,
              updatedById: actor.id,
            },
            update: { valueJson, updatedById: actor.id },
          });
        }),
      );
    }
  }

  revalidatePath("/equipment");
  redirect(`/equipment/${equipment.id}`);
}

const consumeSchema = z.object({
  equipmentId: z.string().min(1),
});

export async function consumeOneAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = consumeSchema.safeParse({
    equipmentId: String(formData.get("equipmentId") ?? ""),
  });
  if (!parsed.success) throw new Error("Invalid item.");

  const equipment = await prisma.equipment.findUnique({
    where: { id: parsed.data.equipmentId },
    select: { id: true, assetId: true, name: true, quantity: true, isConsumable: true, isActive: true },
  });
  if (!equipment || !equipment.isActive) throw new Error("Item not found.");
  if (!equipment.isConsumable) throw new Error("This item is not marked as a consumable.");
  if (equipment.quantity <= 0) throw new Error("Nothing left to consume.");

  await prisma.$transaction(async (tx) => {
    const prevQty = equipment.quantity;
    await tx.equipment.update({
      where: { id: equipment.id },
      data: { quantity: prevQty - 1, updatedById: actor.id },
    });
    await tx.auditLog.create({
      data: {
        action: "EQUIPMENT_UPDATED",
        entityType: "Equipment",
        entityId: equipment.id,
        actorId: actor.id,
        summary: `Consumed 1 × ${equipment.assetId}`,
        data: { delta: -1, reason: "consume_one", undo: { kind: "quantity_set", equipmentId: equipment.id, previousQuantity: prevQty } },
      },
    });
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipment.id}`);
  revalidatePath("/stock");
}

const consumeNSchema = z.object({
  equipmentId: z.string().min(1),
  amount: z.coerce.number().int().min(1).max(10_000),
});

export async function consumeNAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = consumeNSchema.safeParse({
    equipmentId: String(formData.get("equipmentId") ?? ""),
    amount: formData.get("amount") ?? 1,
  });
  if (!parsed.success) throw new Error("Invalid request.");

  const equipment = await prisma.equipment.findUnique({
    where: { id: parsed.data.equipmentId },
    select: { id: true, assetId: true, quantity: true, isConsumable: true, isActive: true },
  });
  if (!equipment || !equipment.isActive) throw new Error("Item not found.");
  if (!equipment.isConsumable) throw new Error("This item is not marked as a consumable.");
  if (equipment.quantity <= 0) throw new Error("Nothing left to consume.");
  if (parsed.data.amount > equipment.quantity) throw new Error("Not enough in stock.");

  await prisma.$transaction(async (tx) => {
    const prevQty = equipment.quantity;
    await tx.equipment.update({
      where: { id: equipment.id },
      data: { quantity: prevQty - parsed.data.amount, updatedById: actor.id },
    });
    await tx.auditLog.create({
      data: {
        action: "EQUIPMENT_UPDATED",
        entityType: "Equipment",
        entityId: equipment.id,
        actorId: actor.id,
        summary: `Consumed ${parsed.data.amount} × ${equipment.assetId}`,
        data: {
          delta: -parsed.data.amount,
          reason: "consume_n",
          undo: { kind: "quantity_set", equipmentId: equipment.id, previousQuantity: prevQty },
        },
      },
    });
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipment.id}`);
  revalidatePath("/stock");
}

const restockSchema = z.object({
  equipmentId: z.string().min(1),
  target: z.coerce.number().int().min(0).max(1_000_000),
});

export async function restockToAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = restockSchema.safeParse({
    equipmentId: String(formData.get("equipmentId") ?? ""),
    target: formData.get("target") ?? 0,
  });
  if (!parsed.success) throw new Error("Invalid request.");

  const equipment = await prisma.equipment.findUnique({
    where: { id: parsed.data.equipmentId },
    select: { id: true, assetId: true, quantity: true, isConsumable: true, isActive: true },
  });
  if (!equipment || !equipment.isActive) throw new Error("Item not found.");
  if (!equipment.isConsumable) throw new Error("This item is not marked as a consumable.");

  const delta = parsed.data.target - equipment.quantity;
  await prisma.$transaction(async (tx) => {
    const prevQty = equipment.quantity;
    await tx.equipment.update({
      where: { id: equipment.id },
      data: { quantity: parsed.data.target, updatedById: actor.id },
    });
    await tx.auditLog.create({
      data: {
        action: "EQUIPMENT_UPDATED",
        entityType: "Equipment",
        entityId: equipment.id,
        actorId: actor.id,
        summary: `Restocked ${equipment.assetId} to ${parsed.data.target}`,
        data: { delta, reason: "restock_to", target: parsed.data.target, undo: { kind: "quantity_set", equipmentId: equipment.id, previousQuantity: prevQty } },
      },
    });
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipment.id}`);
  revalidatePath("/stock");
}
