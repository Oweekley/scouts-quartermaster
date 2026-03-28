import Link from "next/link";
import { EquipmentStatus, MaintenanceStatus } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { runDueMaintenanceSchedules } from "@/lib/maintenance-schedules";
import { EnableNotifications } from "./ui/enable-notifications";

type Alert =
  | {
      kind: "return_overdue" | "return_due_soon";
      urgencyRank: number;
      dueAt: Date;
      equipmentId: string;
      equipmentName: string;
      assetId: string;
      checkoutId: string;
      borrowerName: string;
    }
  | {
      kind: "maintenance_overdue" | "maintenance_due_soon";
      urgencyRank: number;
      dueAt: Date;
      issueId: string;
      title: string;
      equipmentId: string;
      assetId: string;
      status: string;
    }
  | {
      kind: "low_stock";
      urgencyRank: number;
      equipmentId: string;
      equipmentName: string;
      assetId: string;
      quantity: number;
      minStock: number;
    };

function badge(kind: Alert["kind"]) {
  if (kind === "return_overdue") return { label: "Overdue return", className: "bg-red-50 text-red-700 border-red-200" };
  if (kind === "maintenance_overdue") return { label: "Maintenance overdue", className: "bg-red-50 text-red-700 border-red-200" };
  if (kind === "return_due_soon") return { label: "Return due soon", className: "bg-amber-50 text-amber-800 border-amber-200" };
  if (kind === "maintenance_due_soon") return { label: "Maintenance due soon", className: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: "Low stock", className: "bg-slate-50 text-slate-700 border-slate-200" };
}

export default async function TodayPage() {
  await requireUser();
  await runDueMaintenanceSchedules(new Date());

  const now = new Date();
  const soon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3);

  const [overdueReturns, dueSoonReturns, lowStock, maintenanceDue] = await Promise.all([
    prisma.checkoutItem.findMany({
      where: { returnedAt: null, checkout: { status: "OPEN", expectedReturnAt: { lt: now } } },
      include: { equipment: true, checkout: true },
      orderBy: [{ checkout: { expectedReturnAt: "asc" } }],
      take: 25,
    }),
    prisma.checkoutItem.findMany({
      where: { returnedAt: null, checkout: { status: "OPEN", expectedReturnAt: { gte: now, lte: soon } } },
      include: { equipment: true, checkout: true },
      orderBy: [{ checkout: { expectedReturnAt: "asc" } }],
      take: 25,
    }),
    prisma.equipment.findMany({
      where: {
        isActive: true,
        minStock: { not: null },
        status: { not: EquipmentStatus.RETIRED },
      },
      select: { id: true, name: true, assetId: true, quantity: true, minStock: true },
      orderBy: [{ quantity: "asc" }, { name: "asc" }],
      take: 50,
    }),
    prisma.maintenanceIssue.findMany({
      where: {
        status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] },
        dueAt: { not: null, lte: soon },
      },
      include: { equipment: true },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
      take: 30,
    }),
  ]);

  const lowFiltered = lowStock
    .filter((e) => e.minStock !== null && e.quantity <= e.minStock)
    .slice(0, 25);

  const alerts: Alert[] = [
    ...overdueReturns
      .filter((i) => i.checkout.expectedReturnAt)
      .map((i) => ({
        kind: "return_overdue" as const,
        urgencyRank: 0,
        dueAt: i.checkout.expectedReturnAt as Date,
        equipmentId: i.equipmentId,
        equipmentName: i.equipment.name,
        assetId: i.equipment.assetId,
        checkoutId: i.checkoutId,
        borrowerName: i.checkout.borrowerName,
      })),
    ...maintenanceDue
      .filter((m) => m.dueAt)
      .map((m) => ({
        kind: m.dueAt!.getTime() < now.getTime() ? ("maintenance_overdue" as const) : ("maintenance_due_soon" as const),
        urgencyRank: m.dueAt!.getTime() < now.getTime() ? 1 : 3,
        dueAt: m.dueAt as Date,
        issueId: m.id,
        title: m.title,
        equipmentId: m.equipmentId,
        assetId: m.equipment.assetId,
        status: m.status,
      })),
    ...dueSoonReturns
      .filter((i) => i.checkout.expectedReturnAt)
      .map((i) => ({
        kind: "return_due_soon" as const,
        urgencyRank: 2,
        dueAt: i.checkout.expectedReturnAt as Date,
        equipmentId: i.equipmentId,
        equipmentName: i.equipment.name,
        assetId: i.equipment.assetId,
        checkoutId: i.checkoutId,
        borrowerName: i.checkout.borrowerName,
      })),
    ...lowFiltered.map((e) => ({
      kind: "low_stock" as const,
      urgencyRank: 4,
      equipmentId: e.id,
      equipmentName: e.name,
      assetId: e.assetId,
      quantity: e.quantity,
      minStock: e.minStock as number,
    })),
  ];

  alerts.sort((a, b) => {
    if (a.urgencyRank !== b.urgencyRank) return a.urgencyRank - b.urgencyRank;
    if ("dueAt" in a && "dueAt" in b) return a.dueAt.getTime() - b.dueAt.getTime();
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Today</h1>
          <p className="mt-1 text-sm text-slate-600">What needs attention next (sorted by urgency).</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          <EnableNotifications />
          <Link className="underline text-slate-700" href="/returns">
            Returns
          </Link>
          <Link className="underline text-slate-700" href="/maintenance">
            Maintenance
          </Link>
          <Link className="underline text-slate-700" href="/stock">
            Stock
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Alerts</div>
          <div className="text-sm text-slate-600">{alerts.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-[color:var(--border)]/60 text-sm">
            {alerts.length ? (
              alerts.map((a, idx) => {
                const b = badge(a.kind);
                return (
                  <div key={idx} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${b.className}`}>
                          {b.label}
                        </span>
                        {"equipmentId" in a ? (
                          <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${a.equipmentId}`}>
                            {"equipmentName" in a ? a.equipmentName : a.assetId}
                          </Link>
                        ) : null}
                      </div>

                      {"checkoutId" in a ? (
                        <div className="mt-1 text-xs text-slate-600">
                          <span className="font-mono">{a.assetId}</span> · Borrower: {a.borrowerName} ·{" "}
                          <Link className="underline" href={`/checkouts/${a.checkoutId}`}>
                            checkout
                          </Link>
                        </div>
                      ) : null}

                      {"issueId" in a ? (
                        <div className="mt-1 text-xs text-slate-600">
                          <span className="font-mono">{a.assetId}</span> ·{" "}
                          <Link className="underline" href={`/maintenance/${a.issueId}`}>
                            {a.title}
                          </Link>{" "}
                          · {a.status}
                        </div>
                      ) : null}

                      {a.kind === "low_stock" ? (
                        <div className="mt-1 text-xs text-slate-600">
                          <span className="font-mono">{a.assetId}</span> · Qty {a.quantity} · Min {a.minStock}
                        </div>
                      ) : null}
                    </div>

                    {"dueAt" in a ? (
                      <div className={a.dueAt.getTime() < now.getTime() ? "text-xs font-medium text-red-700" : "text-xs text-slate-600"}>
                        {formatDistanceToNowStrict(a.dueAt, { addSuffix: true })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-600">Nothing urgent right now.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
