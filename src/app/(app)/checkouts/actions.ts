"use server";

import { z } from "zod";
import { EquipmentStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createSchema = z
  .object({
    borrowerSectionId: z.string().trim().min(1),
    borrowerUserId: z.string().optional(),
    expectedReturnAt: z.string().optional(),
    notes: z.string().optional(),
    itemsJson: z.string().min(2),
  });

const itemsSchema = z
  .array(
    z.object({
      equipmentId: z.string().min(1),
      quantity: z.number().int().min(1),
    }),
  )
  .min(1);

export async function createCheckoutAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = createSchema.safeParse({
    borrowerSectionId: String(formData.get("borrowerSectionId") ?? ""),
    borrowerUserId: formData.get("borrowerUserId") ? String(formData.get("borrowerUserId")) : undefined,
    expectedReturnAt: formData.get("expectedReturnAt") ? String(formData.get("expectedReturnAt")) : undefined,
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
    itemsJson: String(formData.get("itemsJson") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const section = await prisma.section.findFirst({
    where: { id: parsed.data.borrowerSectionId, isActive: true },
    select: { id: true, name: true, meetingDay: true },
  });
  if (!section) throw new Error("Selected section no longer exists.");

  const dayLabel = section.meetingDay
    ? section.meetingDay.slice(0, 1) + section.meetingDay.slice(1).toLowerCase()
    : null;
  const borrowerName = dayLabel ? `${section.name} (${dayLabel})` : section.name;

  let itemsUnknown: unknown = undefined;
  try {
    itemsUnknown = JSON.parse(parsed.data.itemsJson);
  } catch {
    itemsUnknown = undefined;
  }
  const itemsParsed = itemsSchema.safeParse(itemsUnknown);
  if (!itemsParsed.success) throw new Error("Select at least one item.");

  const expectedReturnAt =
    parsed.data.expectedReturnAt && parsed.data.expectedReturnAt.trim().length > 0
      ? new Date(parsed.data.expectedReturnAt)
      : null;

  const equipmentIds = Array.from(new Set(itemsParsed.data.map((i) => i.equipmentId)));
  const equipment = await prisma.equipment.findMany({
    where: { id: { in: equipmentIds }, isActive: true },
    select: { id: true, name: true, assetId: true, quantity: true },
  });
  const equipmentById = new Map(equipment.map((e) => [e.id, e]));

  // Validate availability against currently-open checkouts.
  const openQty = await prisma.checkoutItem.groupBy({
    by: ["equipmentId"],
    where: { returnedAt: null, equipmentId: { in: equipmentIds } },
    _sum: { quantity: true },
  });
  const openQtyByEquipmentId = new Map(openQty.map((r) => [r.equipmentId, r._sum.quantity ?? 0]));

  for (const item of itemsParsed.data) {
    const eq = equipmentById.get(item.equipmentId);
    if (!eq) throw new Error("One or more items no longer exist.");

    const alreadyOut = openQtyByEquipmentId.get(item.equipmentId) ?? 0;
    if (alreadyOut + item.quantity > eq.quantity) {
      throw new Error(`Not enough quantity available for ${eq.assetId} (${eq.name}).`);
    }
  }

  const checkout = await prisma.$transaction(async (tx) => {
    const created = await tx.checkout.create({
      data: {
        checkedOutById: actor.id,
        borrowerUserId: parsed.data.borrowerUserId ?? null,
        borrowerMemberId: null,
        borrowerName,
        borrowerSectionId: section.id,
        expectedReturnAt,
        notes: parsed.data.notes,
        items: {
          create: itemsParsed.data.map((i) => ({
            equipmentId: i.equipmentId,
            quantity: i.quantity,
          })),
        },
      },
    });

    await tx.equipment.updateMany({
      where: { id: { in: equipmentIds } },
      data: { status: EquipmentStatus.CHECKED_OUT, updatedById: actor.id },
    });

    await tx.auditLog.create({
      data: {
        action: "CHECKOUT_CREATED",
        entityType: "Checkout",
        entityId: created.id,
        actorId: actor.id,
        summary: `Checkout created for ${borrowerName}`,
        data: { equipmentIds, items: itemsParsed.data, borrowerSectionId: section.id },
      },
    });

    return created;
  });

  revalidatePath("/checkouts");
  revalidatePath("/equipment");
  redirect(`/checkouts/${checkout.id}`);
}
