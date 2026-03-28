import Link from "next/link";
import { EquipmentCondition, Role } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { conditionLabel } from "@/lib/display";
import { returnItemAction } from "./actions";
import { resolveParams } from "@/lib/next-params";
import { BulkReturns } from "./ui/bulk-returns";

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(Role.LEADER);
  const resolved = searchParams ? await resolveParams(searchParams) : {};
  const bulk = resolved.bulk === "1" || resolved.bulk === "true";

  const items = await prisma.checkoutItem.findMany({
    where: { returnedAt: null },
    include: { checkout: true, equipment: true },
    orderBy: [{ checkout: { expectedReturnAt: "asc" } }, { checkout: { checkedOutAt: "asc" } }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Returns</h1>
          <p className="mt-1 text-sm text-slate-600">Mark items as returned and update condition.</p>
        </div>
        <Link
          className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50"
          href={bulk ? "/returns" : "/returns?bulk=1"}
        >
          {bulk ? "Single mode" : "Bulk mode"}
        </Link>
      </div>

      {bulk ? (
        <BulkReturns
          items={items.map((i) => ({
            id: i.id,
            equipmentId: i.equipmentId,
            equipmentName: i.equipment.name,
            assetId: i.equipment.assetId,
            borrowerName: i.checkout.borrowerName,
            checkoutId: i.checkoutId,
            expectedReturnAt: i.checkout.expectedReturnAt ? i.checkout.expectedReturnAt.toISOString() : null,
            checkedOutAt: i.checkout.checkedOutAt.toISOString(),
          }))}
        />
      ) : (
        <div className="space-y-3">
        {items.map((i) => {
          const overdue =
            i.checkout.expectedReturnAt && i.checkout.expectedReturnAt.getTime() < new Date().getTime();
          return (
            <div key={i.id} className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs text-slate-600">
                    {i.checkout.expectedReturnAt ? (
                      <span className={overdue ? "font-medium text-red-700" : ""}>
                        Due {formatDistanceToNowStrict(i.checkout.expectedReturnAt, { addSuffix: true })}
                      </span>
                    ) : (
                      "No due date"
                    )}
                    {" · "}
                    Checked out {formatDistanceToNowStrict(i.checkout.checkedOutAt, { addSuffix: true })}
                  </div>
                  <div className="mt-1">
                    <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${i.equipmentId}`}>
                      {i.equipment.name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-slate-600">{i.equipment.assetId}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Borrower: {i.checkout.borrowerName}</div>
                </div>
                <Link className="text-sm text-slate-700 underline" href={`/checkouts/${i.checkoutId}`}>
                  View checkout
                </Link>
              </div>

              <form action={returnItemAction} className="mt-4 grid gap-3 md:grid-cols-6">
                <input type="hidden" name="checkoutItemId" value={i.id} />
                <div className="md:col-span-2">
                  <Label>Condition on return</Label>
                  <select
                    name="condition"
                    defaultValue={i.equipment.condition}
                    className="mt-1 h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
                  >
                    {Object.values(EquipmentCondition).map((c) => (
                      <option key={c} value={c}>
                        {conditionLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <Label>Return notes / damage details</Label>
                  <Input name="notes" placeholder="Optional notes (missing pegs, damaged pole…)" className="mt-1" />
                </div>
                <div className="md:col-span-4 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="createMaintenance" defaultChecked />
                    Create maintenance issue if damaged/out of service
                  </label>
                  <Input
                    name="maintenanceTitle"
                    placeholder="Maintenance title (optional)"
                    className="max-w-sm"
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-end">
                  <Button type="submit">Mark returned</Button>
                </div>
              </form>
            </div>
          );
        })}

        {items.length === 0 ? (
          <div className="rounded-md border border-[color:var(--border)] bg-white p-6 text-center text-slate-600 shadow-sm">
            Nothing currently checked out.
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}
