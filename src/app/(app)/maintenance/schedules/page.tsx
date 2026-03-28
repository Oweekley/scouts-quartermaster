import Link from "next/link";
import { MaintenancePriority, Role } from "@prisma/client";
import { format } from "date-fns";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maintenancePriorityLabel } from "@/lib/display";
import {
  createMaintenanceScheduleAction,
  markScheduleDoneAction,
  runSchedulesNowAction,
  toggleMaintenanceScheduleAction,
} from "./actions";

export default async function MaintenanceSchedulesPage() {
  await requireRole(Role.QUARTERMASTER);

  const [equipment, schedules] = await Promise.all([
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, assetId: true },
      orderBy: [{ name: "asc" }],
      take: 500,
    }),
    prisma.maintenanceSchedule.findMany({
      include: {
        equipment: { select: { id: true, assetId: true, name: true } },
        activeIssue: { select: { id: true, status: true } },
      },
      orderBy: [{ isActive: "desc" }, { nextDueAt: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Maintenance schedules</h1>
          <p className="mt-1 text-sm text-slate-600">Recurring jobs (monthly/termly) that auto-create issues.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline text-slate-700" href="/maintenance">
            Back to issues
          </Link>
          <form action={runSchedulesNowAction}>
            <Button type="submit" variant="secondary">
              Run now
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="font-medium text-slate-900">Add schedule</div>
        </CardHeader>
        <CardBody>
          <form action={createMaintenanceScheduleAction} className="grid gap-3 md:grid-cols-6">
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="equipmentId">Equipment</Label>
              <select
                id="equipmentId"
                name="equipmentId"
                defaultValue=""
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
                required
              >
                <option value="" disabled>
                  Select…
                </option>
                {equipment.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.assetId} · {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g. Quarterly first aid kit check" required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                defaultValue={MaintenancePriority.MEDIUM}
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
              >
                {Object.values(MaintenancePriority).map((p) => (
                  <option key={p} value={p}>
                    {maintenancePriorityLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="intervalPreset">Repeat</Label>
              <select
                id="intervalPreset"
                name="intervalPreset"
                defaultValue="MONTHLY"
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="TERMLY">Termly (every 3 months)</option>
                <option value="CUSTOM">Custom months</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="intervalMonths">Months</Label>
              <Input id="intervalMonths" name="intervalMonths" type="number" min={1} max={24} defaultValue={3} />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="firstDueAt">First due</Label>
              <Input id="firstDueAt" name="firstDueAt" type="date" />
            </div>
            <div className="space-y-1 md:col-span-6">
              <Label htmlFor="description">Notes</Label>
              <textarea
                id="description"
                name="description"
                className="min-h-[72px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm"
                placeholder="Optional checklist / notes"
              />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit">Create schedule</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Schedules</div>
          <div className="text-sm text-slate-600">{schedules.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>Equipment</th>
                  <th>Schedule</th>
                  <th>Repeat</th>
                  <th>Next due</th>
                  <th>Active issue</th>
                  <th className="w-[260px]"></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {schedules.map((s) => (
                  <tr key={s.id} className="border-t border-[color:var(--border)]/60 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link className="font-medium hover:underline" href={`/equipment/${s.equipmentId}`}>
                        {s.equipment.assetId}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-600">{s.equipment.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.title}</div>
                      <div className="mt-0.5 text-xs text-slate-600">{maintenancePriorityLabel(s.priority)}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.intervalMonths} mo</td>
                    <td className="px-4 py-3">{format(s.nextDueAt, "PP")}</td>
                    <td className="px-4 py-3">
                      {s.activeIssue ? (
                        <Link className="underline text-slate-700" href={`/maintenance/${s.activeIssue.id}`}>
                          {s.activeIssue.status}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={toggleMaintenanceScheduleAction}>
                          <input type="hidden" name="scheduleId" value={s.id} />
                          <input type="hidden" name="isActive" value={String(!s.isActive)} />
                          <Button type="submit" variant="secondary">
                            {s.isActive ? "Disable" : "Enable"}
                          </Button>
                        </form>
                        <form action={markScheduleDoneAction}>
                          <input type="hidden" name="scheduleId" value={s.id} />
                          <Button type="submit" variant="secondary" disabled={!s.isActive}>
                            Mark done
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                      No schedules yet.
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

