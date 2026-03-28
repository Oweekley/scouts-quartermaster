"use server";

import { z } from "zod";
import { DayOfWeek, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1),
  meetingDay: z.nativeEnum(DayOfWeek).optional(),
});

const updateSchema = z.object({
  sectionId: z.string().min(1),
  name: z.string().trim().min(1),
  meetingDay: z.nativeEnum(DayOfWeek).optional(),
  isActive: z.enum(["true", "false"]),
});

export async function createSectionAction(formData: FormData) {
  await requireRole(Role.LEADER);

  const parsed = createSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    meetingDay: formData.get("meetingDay") ? (String(formData.get("meetingDay")) as DayOfWeek) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const meetingDay = parsed.data.meetingDay ?? null;
  const existing = await prisma.section.findFirst({
    where: { name: parsed.data.name, meetingDay },
    select: { id: true },
  });
  if (existing) throw new Error("That section already exists.");

  await prisma.section.create({
    data: { name: parsed.data.name, meetingDay },
  });

  revalidatePath("/sections");
  revalidatePath("/members");
  revalidatePath("/checkouts/new");
}

export async function updateSectionAction(formData: FormData) {
  await requireRole(Role.LEADER);

  const parsed = updateSchema.safeParse({
    sectionId: String(formData.get("sectionId") ?? ""),
    name: String(formData.get("name") ?? ""),
    meetingDay: formData.get("meetingDay") ? (String(formData.get("meetingDay")) as DayOfWeek) : undefined,
    isActive: String(formData.get("isActive") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const meetingDay = parsed.data.meetingDay ?? null;
  const conflict = await prisma.section.findFirst({
    where: { id: { not: parsed.data.sectionId }, name: parsed.data.name, meetingDay },
    select: { id: true },
  });
  if (conflict) throw new Error("That section already exists.");

  await prisma.section.update({
    where: { id: parsed.data.sectionId },
    data: {
      name: parsed.data.name,
      meetingDay,
      isActive: parsed.data.isActive === "true",
    },
  });

  revalidatePath("/sections");
  revalidatePath("/members");
  revalidatePath("/checkouts/new");
}
