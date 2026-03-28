"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1),
  sectionId: z.string().min(1),
});

const updateSchema = z.object({
  memberId: z.string().min(1),
  name: z.string().trim().min(1),
  sectionId: z.string().min(1),
  isActive: z.enum(["true", "false"]),
});

export async function createMemberAction(formData: FormData) {
  await requireRole(Role.LEADER);

  const parsed = createSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    sectionId: String(formData.get("sectionId") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.member.create({
    data: { name: parsed.data.name, sectionId: parsed.data.sectionId },
  });

  revalidatePath("/members");
}

export async function updateMemberAction(formData: FormData) {
  await requireRole(Role.LEADER);

  const parsed = updateSchema.safeParse({
    memberId: String(formData.get("memberId") ?? ""),
    name: String(formData.get("name") ?? ""),
    sectionId: String(formData.get("sectionId") ?? ""),
    isActive: String(formData.get("isActive") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.member.update({
    where: { id: parsed.data.memberId },
    data: {
      name: parsed.data.name,
      sectionId: parsed.data.sectionId,
      isActive: parsed.data.isActive === "true",
    },
  });

  revalidatePath("/members");
}
