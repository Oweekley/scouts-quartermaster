import Link from "next/link";
import { MaintenanceStatus, Role } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { maintenancePriorityLabel, maintenanceStatusLabel } from "@/lib/display";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { runDueMaintenanceSchedules } from "@/lib/maintenance-schedules";

export default async function MaintenancePage() {
  const user = await requireUser();
  const canCreate = roleAtLeast(user.role, Role.LEADER);
  await runDueMaintenanceSchedules(new Date());

  const issues = await prisma.maintenanceIssue.findMany({
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: { equipment: true, assignedTo: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Maintenance</h1>
          <p className="mt-1 text-sm text-slate-600">Issues, repairs, and scheduled checks.</p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === Role.ADMIN || user.role === Role.QUARTERMASTER ? (
            <Link className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50" href="/maintenance/schedules">
              Schedules
            </Link>
          ) : null}
          {canCreate ? (
            <Link className="rounded-md bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-95" href="/maintenance/new">
              New issue
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Issues</div>
          <div className="text-sm text-slate-600">{issues.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>Issue</th>
                  <th>Equipment</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {issues.map((i) => {
                  const overdue =
                    i.status !== MaintenanceStatus.DONE && i.dueAt && i.dueAt.getTime() < new Date().getTime();
                  return (
                    <tr key={i.id} className="border-t border-[color:var(--border)]/60 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link className="font-medium hover:underline" href={`/maintenance/${i.id}`}>
                          {i.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link className="hover:underline" href={`/equipment/${i.equipmentId}`}>
                          {i.equipment.assetId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={i.status === "DONE" ? "success" : overdue ? "danger" : "warning"}>
                          {maintenanceStatusLabel(i.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{maintenancePriorityLabel(i.priority)}</td>
                      <td className="px-4 py-3">
                        {i.dueAt ? (
                          <span className={overdue ? "font-medium text-red-700" : "text-slate-700"}>
                            {formatDistanceToNowStrict(i.dueAt, { addSuffix: true })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{i.assignedTo?.name ?? "—"}</td>
                    </tr>
                  );
                })}
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                      No maintenance issues.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
