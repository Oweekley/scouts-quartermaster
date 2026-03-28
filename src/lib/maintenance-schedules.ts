import { addMonths } from "date-fns";
import { MaintenanceStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function runDueMaintenanceSchedules(now = new Date()) {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { isActive: true, nextDueAt: { lte: now } },
    select: {
      id: true,
      equipmentId: true,
      title: true,
      description: true,
      priority: true,
      intervalMonths: true,
      nextDueAt: true,
      activeIssueId: true,
    },
    orderBy: [{ nextDueAt: "asc" }],
    take: 200,
  });

  if (schedules.length === 0) return { created: 0, cleared: 0 };

  return prisma.$transaction(async (tx) => {
    let created = 0;
    let cleared = 0;

    for (const s of schedules) {
      if (s.activeIssueId) {
        const issue = await tx.maintenanceIssue.findUnique({
          where: { id: s.activeIssueId },
          select: { id: true, status: true },
        });
        if (!issue || issue.status === MaintenanceStatus.DONE || issue.status === MaintenanceStatus.CANCELED) {
          await tx.maintenanceSchedule.update({
            where: { id: s.id },
            data: { activeIssueId: null },
          });
          cleared += 1;
        } else {
          continue;
        }
      }

      const issue = await tx.maintenanceIssue.create({
        data: {
          equipmentId: s.equipmentId,
          title: s.title,
          description: s.description,
          priority: s.priority,
          dueAt: s.nextDueAt,
          scheduleId: s.id,
          logs: { create: [{ message: "Created from recurring schedule." }] },
        },
        select: { id: true },
      });

      await tx.maintenanceSchedule.update({
        where: { id: s.id },
        data: { activeIssueId: issue.id },
      });

      created += 1;
    }

    return { created, cleared };
  });
}

export function nextDueDate(from: Date, intervalMonths: number) {
  const months = Number.isFinite(intervalMonths) && intervalMonths > 0 ? Math.floor(intervalMonths) : 1;
  return addMonths(from, months);
}

