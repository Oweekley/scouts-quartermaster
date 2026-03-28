import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { resolveParams } from "@/lib/next-params";
import { sectionDisplayName } from "@/lib/sections";
import { buildCheckoutNudge } from "@/lib/reminders";
import { NudgeCard } from "./ui/nudge-card";

export default async function CheckoutDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireUser();
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();
  const checkout = await prisma.checkout.findUnique({
    where: { id: resolved.id },
    include: {
      checkedOutBy: true,
      member: true,
      section: true,
      items: { include: { equipment: true } },
    },
  });

  if (!checkout) notFound();

  const overdue =
    checkout.status === "OPEN" &&
    checkout.expectedReturnAt &&
    checkout.expectedReturnAt.getTime() < new Date().getTime();

  const nudgeText = buildCheckoutNudge({
    borrowerName: checkout.borrowerName,
    expectedReturnAt: checkout.expectedReturnAt,
    checkoutId: checkout.id,
    appBaseUrl: process.env.APP_BASE_URL ?? null,
    items: checkout.items.map((i) => ({ assetId: i.equipment.assetId, name: i.equipment.name, quantity: i.quantity })),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Checkout</h1>
          <div className="mt-1 text-sm text-slate-600">
            Borrower: <span className="font-medium text-slate-900">{checkout.borrowerName}</span>
            {checkout.member ? <span className="text-slate-600"> (member)</span> : null}
          </div>
          <div className="mt-1 text-sm text-slate-600">Section: {sectionDisplayName(checkout.section)}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={checkout.status === "OPEN" ? (overdue ? "danger" : "warning") : "default"}>
              {checkout.status === "OPEN" ? (overdue ? "Overdue" : "Open") : "Closed"}
            </Badge>
            <Badge variant="default">Created by {checkout.checkedOutBy.name}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="rounded-md border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 md:py-2" href="/scan">
            Scan next
          </Link>
          <Link className="rounded-md border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 md:py-2" href="/returns">
            Go to returns
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-600">Checked out at</dt>
            <dd className="text-sm text-slate-900">{format(checkout.checkedOutAt, "PPp")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Expected return</dt>
            <dd className="text-sm text-slate-900">
              {checkout.expectedReturnAt ? format(checkout.expectedReturnAt, "PP") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Notes</dt>
            <dd className="text-sm text-slate-900">{checkout.notes ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr className="[&>th]:px-4 [&>th]:py-3">
              <th>Item</th>
              <th>Asset</th>
              <th className="text-right">Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {checkout.items.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link className="font-medium hover:underline" href={`/equipment/${i.equipmentId}`}>
                    {i.equipment.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{i.equipment.assetId}</td>
                <td className="px-4 py-3 text-right tabular-nums">{i.quantity}</td>
                <td className="px-4 py-3">{i.returnedAt ? "Returned" : "Out"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NudgeCard text={nudgeText} />
    </div>
  );
}
