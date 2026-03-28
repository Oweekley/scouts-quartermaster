"use server";

import { z } from "zod";
import { MaintenancePriority, MaintenanceStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nextDueDate } from "@/lib/maintenance-schedules";

import { prisma } from "@/lib/db";
import { requireRole, roleAtLeast } from "@/lib/auth";

const createSchema = z.object({
  equipmentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
  dueAt: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function createMaintenanceAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = createSchema.safeParse({
    equipmentId: String(formData.get("equipmentId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    priority: formData.get("priority") ? String(formData.get("priority")) : MaintenancePriority.MEDIUM,
    dueAt: formData.get("dueAt") ? String(formData.get("dueAt")) : undefined,
    assignedToId: formData.get("assignedToId") ? String(formData.get("assignedToId")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const dueAt =
    parsed.data.dueAt && parsed.data.dueAt.trim().length > 0 ? new Date(parsed.data.dueAt) : null;

  const canAssign = roleAtLeast(actor.role, Role.QUARTERMASTER);

  const issue = await prisma.maintenanceIssue.create({
    data: {
      equipmentId: parsed.data.equipmentId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      dueAt,
      assignedToId: canAssign ? parsed.data.assignedToId ?? null : null,
      createdById: actor.id,
      logs: {
        create: parsed.data.description
          ? [{ message: parsed.data.description, createdById: actor.id }]
          : [],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "MAINTENANCE_CREATED",
      entityType: "MaintenanceIssue",
      entityId: issue.id,
      actorId: actor.id,
      summary: `Maintenance created: ${issue.title}`,
    },
  });

  revalidatePath("/maintenance");
  redirect(`/maintenance/${issue.id}`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  dueAt: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function updateMaintenanceAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = updateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    status: formData.get("status") ? String(formData.get("status")) : undefined,
    priority: formData.get("priority") ? String(formData.get("priority")) : undefined,
    dueAt: formData.get("dueAt") ? String(formData.get("dueAt")) : undefined,
    assignedToId: formData.get("assignedToId") ? String(formData.get("assignedToId")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const dueAt =
    parsed.data.dueAt && parsed.data.dueAt.trim().length > 0 ? new Date(parsed.data.dueAt) : null;

  await prisma.maintenanceIssue.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueAt,
      assignedToId: parsed.data.assignedToId ?? null,
      resolvedAt: parsed.data.status === MaintenanceStatus.DONE ? new Date() : null,
    },
  });

  if (parsed.data.status === MaintenanceStatus.DONE) {
    await prisma.$transaction(async (tx) => {
      const issue = await tx.maintenanceIssue.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, scheduleId: true, dueAt: true },
      });
      if (!issue?.scheduleId) return;

      const schedule = await tx.maintenanceSchedule.findUnique({
        where: { id: issue.scheduleId },
        select: { id: true, intervalMonths: true, nextDueAt: true },
      });
      if (!schedule) return;

      const base = issue.dueAt ?? schedule.nextDueAt ?? new Date();
      const nextDueAt = nextDueDate(base, schedule.intervalMonths);

      await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: { lastDoneAt: new Date(), nextDueAt, activeIssueId: null },
      });
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "MAINTENANCE_UPDATED",
      entityType: "MaintenanceIssue",
      entityId: parsed.data.id,
      actorId: actor.id,
      summary: "Maintenance updated",
    },
  });

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${parsed.data.id}`);
  revalidatePath("/maintenance/schedules");
  revalidatePath("/today");
}

const logSchema = z.object({
  issueId: z.string().min(1),
  message: z.string().min(1),
});

export async function addMaintenanceLogAction(formData: FormData) {
  const actor = await requireRole(Role.LEADER);

  const parsed = logSchema.safeParse({
    issueId: String(formData.get("issueId") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.maintenanceLog.create({
    data: { issueId: parsed.data.issueId, message: parsed.data.message, createdById: actor.id },
  });

  revalidatePath(`/maintenance/${parsed.data.issueId}`);
}
