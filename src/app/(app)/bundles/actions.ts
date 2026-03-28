"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createBundleSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
});

const updateBundleSchema = z.object({
  bundleId: z.string().min(1),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  isActive: z.enum(["true", "false"]),
});

const addItemSchema = z.object({
  bundleId: z.string().min(1),
  equipmentId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

const removeItemSchema = z.object({
  bundleItemId: z.string().min(1),
  bundleId: z.string().min(1),
});

export async function createBundleAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = createBundleSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const exists = await prisma.checkoutBundle.findFirst({ where: { name: parsed.data.name }, select: { id: true } });
  if (exists) throw new Error("That bundle already exists.");

  await prisma.checkoutBundle.create({
    data: { name: parsed.data.name, description: parsed.data.description, createdById: actor.id },
  });

  revalidatePath("/bundles");
}

export async function updateBundleAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = updateBundleSchema.safeParse({
    bundleId: String(formData.get("bundleId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    isActive: String(formData.get("isActive") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const conflict = await prisma.checkoutBundle.findFirst({
    where: { id: { not: parsed.data.bundleId }, name: parsed.data.name },
    select: { id: true },
  });
  if (conflict) throw new Error("That bundle name is already in use.");

  await prisma.checkoutBundle.update({
    where: { id: parsed.data.bundleId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive === "true",
    },
  });

  revalidatePath("/bundles");
  revalidatePath(`/bundles/${parsed.data.bundleId}`);
  revalidatePath("/checkouts/new");
}

export async function addBundleItemAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = addItemSchema.safeParse({
    bundleId: String(formData.get("bundleId") ?? ""),
    equipmentId: String(formData.get("equipmentId") ?? ""),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.checkoutBundleItem.upsert({
    where: { bundleId_equipmentId: { bundleId: parsed.data.bundleId, equipmentId: parsed.data.equipmentId } },
    create: { bundleId: parsed.data.bundleId, equipmentId: parsed.data.equipmentId, quantity: parsed.data.quantity },
    update: { quantity: parsed.data.quantity },
  });

  revalidatePath(`/bundles/${parsed.data.bundleId}`);
  revalidatePath("/checkouts/new");
}

export async function removeBundleItemAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = removeItemSchema.safeParse({
    bundleItemId: String(formData.get("bundleItemId") ?? ""),
    bundleId: String(formData.get("bundleId") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.checkoutBundleItem.delete({ where: { id: parsed.data.bundleItemId } });
  revalidatePath(`/bundles/${parsed.data.bundleId}`);
  revalidatePath("/checkouts/new");
}

