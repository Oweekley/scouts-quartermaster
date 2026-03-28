import Link from "next/link";
import { EquipmentCondition, EquipmentStatus, MaintenanceStatus } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { conditionLabel } from "@/lib/display";

export default async function DashboardPage() {
  await requireUser();

  const [equipmentCount, checkedOutCount, overdueReturns, maintenanceOpen, overdueItems, openIssues, damagedItems, recentItems] = await Promise.all([
    prisma.equipment.count({ where: { isActive: true } }),
    prisma.equipment.count({ where: { status: EquipmentStatus.CHECKED_OUT, isActive: true } }),
    prisma.checkoutItem.count({
      where: {
        returnedAt: null,
        checkout: { expectedReturnAt: { lt: new Date() }, status: "OPEN" },
      },
    }),
    prisma.maintenanceIssue.count({
      where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] } },
    }),
    prisma.checkoutItem.findMany({
      where: { returnedAt: null, checkout: { expectedReturnAt: { lt: new Date() }, status: "OPEN" } },
      include: { equipment: true, checkout: true },
      orderBy: [{ checkout: { expectedReturnAt: "asc" } }],
      take: 10,
    }),
    prisma.maintenanceIssue.findMany({
      where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] } },
      include: { equipment: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.equipment.findMany({
      where: { isActive: true, condition: { in: [EquipmentCondition.DAMAGED, EquipmentCondition.OUT_OF_SERVICE] } },
      select: { id: true, name: true, assetId: true, condition: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
    }),
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, assetId: true, status: true, condition: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">At-a-glance status for group kit.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="text-sm text-slate-600">Total items</div>
            <div className="mt-1 text-2xl font-semibold">{equipmentCount}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-slate-600">Checked out</div>
            <div className="mt-1 text-2xl font-semibold">{checkedOutCount}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-slate-600">Overdue returns</div>
            <div className="mt-1 text-2xl font-semibold">{overdueReturns}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm text-slate-600">Open maintenance</div>
            <div className="mt-1 text-2xl font-semibold">{maintenanceOpen}</div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Quick links</div>
          <div className="text-sm text-slate-600">Common tasks</div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-md border border-[color:var(--border)] px-3 py-2 hover:bg-slate-50" href="/equipment/new">
              Add equipment
            </Link>
            <Link className="rounded-md border border-[color:var(--border)] px-3 py-2 hover:bg-slate-50" href="/checkouts/new">
              Check out kit
            </Link>
            <Link className="rounded-md border border-[color:var(--border)] px-3 py-2 hover:bg-slate-50" href="/maintenance/new">
              Log maintenance
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="font-medium text-slate-900">Overdue returns</div>
            <Link className="text-sm text-slate-700 underline" href="/returns">
              Returns
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-[color:var(--border)]/60 text-sm">
              {overdueItems.length ? (
                overdueItems.map((i) => (
                  <div key={i.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${i.equipmentId}`}>
                        {i.equipment.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {i.equipment.assetId} · {i.checkout.borrowerName}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-red-700">
                      {i.checkout.expectedReturnAt ? formatDistanceToNowStrict(i.checkout.expectedReturnAt, { addSuffix: true }) : "Overdue"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-slate-600">Nothing overdue.</div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="font-medium text-slate-900">Open maintenance</div>
            <Link className="text-sm text-slate-700 underline" href="/maintenance">
              Maintenance
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-[color:var(--border)]/60 text-sm">
              {openIssues.length ? (
                openIssues.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link className="font-medium text-slate-900 hover:underline" href={`/maintenance/${m.id}`}>
                        {m.title}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-600">
                        <Link className="hover:underline" href={`/equipment/${m.equipmentId}`}>
                          {m.equipment.assetId}
                        </Link>
                        {m.dueAt ? ` · due ${formatDistanceToNowStrict(m.dueAt, { addSuffix: true })}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">{m.status}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-slate-600">No open issues.</div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="font-medium text-slate-900">Recently updated</div>
            <Link className="text-sm text-slate-700 underline" href="/equipment">
              Equipment
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-[color:var(--border)]/60 text-sm">
              {recentItems.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${e.id}`}>
                      {e.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {e.assetId} · {conditionLabel(e.condition)} · {e.status}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">{formatDistanceToNowStrict(e.updatedAt, { addSuffix: true })}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Damaged / out of service</div>
          <div className="text-sm text-slate-600">{damagedItems.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>Item</th>
                  <th>Asset ID</th>
                  <th>Condition</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {damagedItems.map((e) => (
                  <tr key={e.id} className="border-t border-[color:var(--border)]/60 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link className="font-medium hover:underline" href={`/equipment/${e.id}`}>
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{e.assetId}</td>
                    <td className="px-4 py-3">{conditionLabel(e.condition)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDistanceToNowStrict(e.updatedAt, { addSuffix: true })}
                    </td>
                  </tr>
                ))}
                {damagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                      Nothing flagged as damaged or out of service.
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
