"use server";

import { z } from "zod";
import { MaintenancePriority, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { nextDueDate, runDueMaintenanceSchedules } from "@/lib/maintenance-schedules";

const createSchema = z.object({
  equipmentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
  intervalPreset: z.enum(["MONTHLY", "TERMLY", "CUSTOM"]).default("MONTHLY"),
  intervalMonths: z.coerce.number().int().min(1).max(24).default(1),
  firstDueAt: z.string().optional(),
});

export async function createMaintenanceScheduleAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = createSchema.safeParse({
    equipmentId: String(formData.get("equipmentId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    priority: formData.get("priority") ? String(formData.get("priority")) : MaintenancePriority.MEDIUM,
    intervalPreset: formData.get("intervalPreset") ? String(formData.get("intervalPreset")) : "MONTHLY",
    intervalMonths: formData.get("intervalMonths") ?? 1,
    firstDueAt: formData.get("firstDueAt") ? String(formData.get("firstDueAt")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  const intervalMonths =
    parsed.data.intervalPreset === "MONTHLY" ? 1 : parsed.data.intervalPreset === "TERMLY" ? 3 : parsed.data.intervalMonths;

  const firstDueAt =
    parsed.data.firstDueAt && parsed.data.firstDueAt.trim().length > 0
      ? new Date(parsed.data.firstDueAt)
      : nextDueDate(new Date(), intervalMonths);

  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      equipmentId: parsed.data.equipmentId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      intervalMonths,
      nextDueAt: firstDueAt,
      createdById: actor.id,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "MAINTENANCE_SCHEDULE_CREATED",
      entityType: "MaintenanceSchedule",
      entityId: schedule.id,
      actorId: actor.id,
      summary: "Created maintenance schedule",
    },
  });

  revalidatePath("/maintenance/schedules");
  revalidatePath("/maintenance");
  revalidatePath("/today");
}

const toggleSchema = z.object({
  scheduleId: z.string().min(1),
  isActive: z.string().optional().transform((v) => v === "true"),
});

export async function toggleMaintenanceScheduleAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = toggleSchema.safeParse({
    scheduleId: String(formData.get("scheduleId") ?? ""),
    isActive: formData.get("isActive") ? String(formData.get("isActive")) : undefined,
  });
  if (!parsed.success) throw new Error("Invalid request.");

  await prisma.maintenanceSchedule.update({
    where: { id: parsed.data.scheduleId },
    data: { isActive: parsed.data.isActive },
  });

  await prisma.auditLog.create({
    data: {
      action: "MAINTENANCE_SCHEDULE_UPDATED",
      entityType: "MaintenanceSchedule",
      entityId: parsed.data.scheduleId,
      actorId: actor.id,
      summary: `Schedule ${parsed.data.isActive ? "enabled" : "disabled"}`,
    },
  });

  revalidatePath("/maintenance/schedules");
  revalidatePath("/maintenance");
  revalidatePath("/today");
}

const doneSchema = z.object({
  scheduleId: z.string().min(1),
});

export async function markScheduleDoneAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = doneSchema.safeParse({
    scheduleId: String(formData.get("scheduleId") ?? ""),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  await prisma.$transaction(async (tx) => {
    const schedule = await tx.maintenanceSchedule.findUnique({
      where: { id: parsed.data.scheduleId },
      select: { id: true, intervalMonths: true, nextDueAt: true, activeIssueId: true },
    });
    if (!schedule) return;

    if (schedule.activeIssueId) {
      await tx.maintenanceIssue.update({
        where: { id: schedule.activeIssueId },
        data: { status: "DONE", resolvedAt: new Date() },
      });
    }

    const next = nextDueDate(schedule.nextDueAt, schedule.intervalMonths);
    await tx.maintenanceSchedule.update({
      where: { id: schedule.id },
      data: { lastDoneAt: new Date(), nextDueAt: next, activeIssueId: null },
    });
  });

  await prisma.auditLog.create({
    data: {
      action: "MAINTENANCE_SCHEDULE_UPDATED",
      entityType: "MaintenanceSchedule",
      entityId: parsed.data.scheduleId,
      actorId: actor.id,
      summary: "Schedule marked done",
    },
  });

  revalidatePath("/maintenance/schedules");
  revalidatePath("/maintenance");
  revalidatePath("/today");
}

export async function runSchedulesNowAction() {
  const actor = await requireRole(Role.QUARTERMASTER);
  const result = await runDueMaintenanceSchedules(new Date());

  await prisma.auditLog.create({
    data: {
      action: "MAINTENANCE_SCHEDULE_RUN",
      entityType: "MaintenanceSchedule",
      entityId: "all",
      actorId: actor.id,
      summary: `Ran schedules (created ${result.created})`,
      data: result,
    },
  });

  revalidatePath("/maintenance/schedules");
  revalidatePath("/maintenance");
  revalidatePath("/today");
}

