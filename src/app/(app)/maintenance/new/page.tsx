import { MaintenancePriority, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMaintenanceAction } from "../actions";
import { resolveParams } from "@/lib/next-params";

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(Role.LEADER);
  const resolved = await resolveParams(searchParams);
  const preselectEquipmentId = typeof resolved.equipmentId === "string" ? resolved.equipmentId : "";
  const prefillTitle = typeof resolved.title === "string" ? resolved.title : "";

  const [equipment, users] = await Promise.all([
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, assetId: true },
      orderBy: [{ name: "asc" }],
      take: 500,
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ name: "asc" }] }),
  ]);

  const canAssign = roleAtLeast(user.role, Role.QUARTERMASTER);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New maintenance issue</h1>
        <p className="mt-1 text-sm text-slate-600">Log a repair, check, or recurring job.</p>
      </div>

      <form action={createMaintenanceAction} className="space-y-4 rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="equipmentId">Equipment</Label>
            <select
              id="equipmentId"
              name="equipmentId"
              className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
              required
              defaultValue={preselectEquipmentId}
            >
              <option value="">—</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.assetId} · {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Reproof tent, refresh first aid kit…"
              defaultValue={prefillTitle}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              name="priority"
              className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
              defaultValue={MaintenancePriority.MEDIUM}
            >
              {Object.values(MaintenancePriority).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dueAt">Due date</Label>
            <Input id="dueAt" name="dueAt" type="date" />
          </div>
          {canAssign ? (
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="assignedToId">Assign to</Label>
              <select
                id="assignedToId"
                name="assignedToId"
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
                defaultValue=""
              >
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="description">Notes</Label>
            <textarea id="description" name="description" className="min-h-[100px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit">Create issue</Button>
        </div>
      </form>
    </div>
  );
}
