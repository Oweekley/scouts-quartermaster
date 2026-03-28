"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional(),
  notes: z.string().optional(),
});

export async function createLocationAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = createSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    parentId: formData.get("parentId") ? String(formData.get("parentId")) : undefined,
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.location.create({
    data: { name: parsed.data.name, parentId: parsed.data.parentId ?? null, notes: parsed.data.notes },
  });

  revalidatePath("/locations");
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().optional(),
});

export async function updateLocationAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = updateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.location.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, notes: parsed.data.notes },
  });
  revalidatePath("/locations");
}
