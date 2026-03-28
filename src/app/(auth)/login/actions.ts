"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { createSession, clearSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/security";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) return { ok: false, error: "Invalid login." };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { ok: false, error: "Invalid login." };

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

