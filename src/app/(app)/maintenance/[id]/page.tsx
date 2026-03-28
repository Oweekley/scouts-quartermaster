import Link from "next/link";
import { MaintenancePriority, MaintenanceStatus, Role } from "@prisma/client";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maintenancePriorityLabel, maintenanceStatusLabel } from "@/lib/display";
import { addMaintenanceLogAction, updateMaintenanceAction } from "../actions";
import { resolveParams } from "@/lib/next-params";

export default async function MaintenanceIssuePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const canManage = roleAtLeast(user.role, Role.QUARTERMASTER);
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const issue = await prisma.maintenanceIssue.findUnique({
    where: { id: resolved.id },
    include: {
      equipment: true,
      assignedTo: true,
      logs: { include: { createdBy: true }, orderBy: [{ createdAt: "desc" }] },
    },
  });
  if (!issue) notFound();

  const users = canManage
    ? await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ name: "asc" }] })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{issue.title}</h1>
          <div className="mt-1 text-sm text-slate-600">
            Equipment:{" "}
            <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${issue.equipmentId}`}>
              {issue.equipment.assetId} · {issue.equipment.name}
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={issue.status === "DONE" ? "success" : "warning"}>{maintenanceStatusLabel(issue.status)}</Badge>
            <Badge variant="default">{maintenancePriorityLabel(issue.priority)}</Badge>
            {issue.dueAt ? <Badge variant="default">Due {format(issue.dueAt, "PP")}</Badge> : null}
          </div>
        </div>
        <Link className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50" href="/maintenance">
          Back
        </Link>
      </div>

      {canManage ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="font-medium text-slate-900">Update</div>
          <form action={updateMaintenanceAction} className="mt-3 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="id" value={issue.id} />
            <div className="space-y-1">
              <Label>Status</Label>
              <select name="status" defaultValue={issue.status} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                {Object.values(MaintenanceStatus).map((s) => (
                  <option key={s} value={s}>
                    {maintenanceStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <select name="priority" defaultValue={issue.priority} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                {Object.values(MaintenancePriority).map((p) => (
                  <option key={p} value={p}>
                    {maintenancePriorityLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Due</Label>
              <Input name="dueAt" type="date" defaultValue={issue.dueAt ? issue.dueAt.toISOString().slice(0, 10) : ""} />
            </div>
            <div className="space-y-1">
              <Label>Assigned to</Label>
              <select name="assignedToId" defaultValue={issue.assignedToId ?? ""} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="font-medium text-slate-900">Add note</div>
        <form action={addMaintenanceLogAction} className="mt-3 flex flex-col gap-2 md:flex-row">
          <input type="hidden" name="issueId" value={issue.id} />
          <Input name="message" placeholder="Update, parts used, what was done…" className="flex-1" />
          <Button type="submit">Add</Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="font-medium text-slate-900">History</div>
        <div className="mt-3 space-y-3">
          {issue.logs.map((l) => (
            <div key={l.id} className="rounded-md border border-slate-100 p-3">
              <div className="text-xs text-slate-600">
                {l.createdBy?.name ?? "Unknown"} · {format(l.createdAt, "PPp")}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{l.message}</div>
            </div>
          ))}
          {issue.logs.length === 0 ? <div className="text-sm text-slate-600">No notes yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
