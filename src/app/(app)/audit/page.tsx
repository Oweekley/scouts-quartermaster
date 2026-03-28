import Link from "next/link";
import { AuditAction, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveParams } from "@/lib/next-params";
import { undoAuditLogAction } from "./actions";

function hasUndo(data: unknown) {
  return Boolean(data && typeof data === "object" && (data as { undo?: unknown }).undo);
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(Role.QUARTERMASTER);
  const resolved = searchParams ? await resolveParams(searchParams) : {};

  const q = typeof resolved.q === "string" ? resolved.q.trim() : "";
  const entityType = typeof resolved.entityType === "string" ? resolved.entityType.trim() : "";
  const action = typeof resolved.action === "string" ? resolved.action.trim() : "";

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(action && (Object.values(AuditAction) as string[]).includes(action) ? { action: action as AuditAction } : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Audit log</h1>
          <p className="mt-1 text-sm text-slate-600">System-wide history with filters.</p>
        </div>
        <Link className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50" href="/home">
          Quick actions
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="font-medium text-slate-900">Filters</div>
        </CardHeader>
        <CardBody>
          <form className="grid gap-3 md:grid-cols-6">
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="Summary / entity type / entity id…" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="entityType">Entity type</Label>
              <Input id="entityType" name="entityType" defaultValue={entityType} placeholder="Equipment, Checkout…" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                name="action"
                defaultValue={action}
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
              >
                <option value="">—</option>
                {Object.values(AuditAction).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Events</div>
          <div className="text-sm text-slate-600">{logs.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Summary</th>
                  <th className="w-[160px]"></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-[color:var(--border)]/60 hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                      {l.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{l.actor?.name ?? "System"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {l.entityType}:{l.entityId}
                    </td>
                    <td className="px-4 py-3">{l.summary ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {l.entityType === "Equipment" ? (
                        <Link className="underline text-slate-700" href={`/equipment/${l.entityId}`}>
                          View
                        </Link>
                      ) : null}
                      {l.entityType === "Equipment" && hasUndo(l.data) ? (
                        <form action={undoAuditLogAction} className="mt-2">
                          <input type="hidden" name="auditLogId" value={l.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Undo
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                      No matching events.
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

