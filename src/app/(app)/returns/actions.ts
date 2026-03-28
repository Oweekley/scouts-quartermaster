"use server";

import { z } from "zod";
import { EquipmentCondition, EquipmentStatus, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const returnSchema = z.object({
  checkoutItemId: z.string().min(1),
  condition: z.nativeEnum(EquipmentCondition),
  notes: z.string().optional(),
  createMaintenance: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  maintenanceTitle: z.string().optional(),
  returnTo: z.string().optional(),
});

async function returnCheckoutItem(
  tx: Prisma.TransactionClient,
  {
    actorId,
    checkoutItemId,
    condition,
    notes,
    createMaintenance,
    maintenanceTitle,
  }: {
    actorId: string;
    checkoutItemId: string;
    condition: EquipmentCondition;
    notes?: string;
    createMaintenance?: boolean;
    maintenanceTitle?: string;
  },
) {
  const item = await tx.checkoutItem.findUnique({
    where: { id: checkoutItemId },
    include: { checkout: true, equipment: true },
  });
  if (!item || item.returnedAt) return;

  await tx.checkoutItem.update({
    where: { id: item.id },
    data: {
      returnedAt: new Date(),
      returnedById: actorId,
      returnCondition: condition,
      returnNotes: notes,
      conditionUpdatedAt: new Date(),
    },
  });

  const maintenanceNeeded = condition === "DAMAGED" || condition === "OUT_OF_SERVICE";

  const remainingQtyForEquipment = await tx.checkoutItem.aggregate({
    where: { equipmentId: item.equipmentId, returnedAt: null },
    _sum: { quantity: true },
  });
  const stillOut = (remainingQtyForEquipment._sum.quantity ?? 0) > 0;

  await tx.equipment.update({
    where: { id: item.equipmentId },
    data: {
      condition,
      status: stillOut ? EquipmentStatus.CHECKED_OUT : maintenanceNeeded ? EquipmentStatus.MAINTENANCE : EquipmentStatus.AVAILABLE,
      updatedById: actorId,
    },
  });

  if (maintenanceNeeded && (createMaintenance ?? true)) {
    await tx.maintenanceIssue.create({
      data: {
        equipmentId: item.equipmentId,
        title: maintenanceTitle?.trim() || `Repair needed: ${item.equipment.assetId}`,
        description: notes,
        priority: "MEDIUM",
        createdById: actorId,
      },
    });
  }

  const remaining = await tx.checkoutItem.count({
    where: { checkoutId: item.checkoutId, returnedAt: null },
  });
  if (remaining === 0) {
    await tx.checkout.update({
      where: { id: item.checkoutId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }

  await tx.auditLog.create({
    data: {
      action: "CHECKOUT_RETURNED",
      entityType: "CheckoutItem",
      entityId: item.id,
      actorId,
      summary: `Returned ${item.equipment.assetId}`,
      data: { condition },
    },
  });
}

export async function returnItemAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = returnSchema.safeParse({
    checkoutItemId: String(formData.get("checkoutItemId") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
    createMaintenance: formData.get("createMaintenance") ? String(formData.get("createMaintenance")) : undefined,
    maintenanceTitle: formData.get("maintenanceTitle") ? String(formData.get("maintenanceTitle")) : undefined,
    returnTo: formData.get("returnTo") ? String(formData.get("returnTo")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.$transaction(async (tx) => {
    await returnCheckoutItem(tx, {
      actorId: actor.id,
      checkoutItemId: parsed.data.checkoutItemId,
      condition: parsed.data.condition,
      notes: parsed.data.notes,
      createMaintenance: parsed.data.createMaintenance,
      maintenanceTitle: parsed.data.maintenanceTitle,
    });
  });

  revalidatePath("/returns");
  revalidatePath("/checkouts");
  revalidatePath("/equipment");
  revalidatePath("/maintenance");

  if (parsed.data.returnTo && parsed.data.returnTo.startsWith("/")) {
    redirect(parsed.data.returnTo);
  }
}

const bulkSchema = z.object({
  itemIdsJson: z.string().min(2),
  condition: z.nativeEnum(EquipmentCondition),
  notes: z.string().optional(),
  createMaintenance: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  maintenanceTitle: z.string().optional(),
});

export async function bulkReturnAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = bulkSchema.safeParse({
    itemIdsJson: String(formData.get("itemIdsJson") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
    createMaintenance: formData.get("createMaintenance") ? String(formData.get("createMaintenance")) : undefined,
    maintenanceTitle: formData.get("maintenanceTitle") ? String(formData.get("maintenanceTitle")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  let ids: unknown = undefined;
  try {
    ids = JSON.parse(parsed.data.itemIdsJson);
  } catch {
    ids = undefined;
  }

  const list = z.array(z.string().min(1)).safeParse(ids);
  if (!list.success || list.data.length === 0) throw new Error("Pick at least one item.");

  await prisma.$transaction(async (tx) => {
    for (const checkoutItemId of list.data) {
      await returnCheckoutItem(tx, {
        actorId: actor.id,
        checkoutItemId,
        condition: parsed.data.condition,
        notes: parsed.data.notes,
        createMaintenance: parsed.data.createMaintenance,
        maintenanceTitle: parsed.data.maintenanceTitle,
      });
    }
  });

  revalidatePath("/returns");
  revalidatePath("/checkouts");
  revalidatePath("/equipment");
  revalidatePath("/maintenance");
}
