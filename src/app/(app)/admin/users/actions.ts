"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/security";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
  password: z.string().min(8),
});

export async function createUserAction(formData: FormData) {
  const actor = await requireRole(Role.ADMIN);

  const parsed = createUserSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) throw new Error("Check the form fields.");

  const passwordHash = await hashPassword(parsed.data.password);

  const created = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "USER_CREATED",
      entityType: "User",
      entityId: created.id,
      actorId: actor.id,
      summary: `Created user ${created.email}`,
    },
  });

  revalidatePath("/admin/users");
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role).optional(),
  isActive: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  password: z.string().min(8).optional(),
});

export async function updateUserAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const parsed = updateUserSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    role: formData.get("role") ? String(formData.get("role")) : undefined,
    isActive: formData.get("isActive") ? String(formData.get("isActive")) : undefined,
    password: formData.get("password") ? String(formData.get("password")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const data: Record<string, unknown> = {};
  if (parsed.data.role) data.role = parsed.data.role;
  if (typeof parsed.data.isActive === "boolean") data.isActive = parsed.data.isActive;
  if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({ where: { id: parsed.data.userId }, data });
  revalidatePath("/admin/users");
}
