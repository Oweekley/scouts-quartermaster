import Link from "next/link";
import { notFound } from "next/navigation";
import { EquipmentCondition, Role } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { conditionLabel } from "@/lib/display";
import { returnItemAction } from "@/app/(app)/returns/actions";
import { resolveParams } from "@/lib/next-params";

export default async function ScanReturnPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(Role.LEADER);
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const equipment = await prisma.equipment.findUnique({
    where: { id: resolved.id },
    select: { id: true, name: true, assetId: true, condition: true, isActive: true },
  });
  if (!equipment || !equipment.isActive) notFound();

  const items = await prisma.checkoutItem.findMany({
    where: { equipmentId: equipment.id, returnedAt: null },
    include: { checkout: true },
    orderBy: [{ checkout: { expectedReturnAt: "asc" } }, { checkout: { checkedOutAt: "asc" } }],
    take: 50,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Return</h1>
          <p className="mt-1 text-sm text-slate-600">
            {equipment.assetId} · {equipment.name}
          </p>
        </div>
        <Link className="text-sm underline text-slate-700" href={`/scan/equipment/${equipment.id}`}>
          Back
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 text-center text-slate-600 shadow-sm">
          This item isn’t currently checked out.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((i) => {
          const overdue = i.checkout.expectedReturnAt && i.checkout.expectedReturnAt.getTime() < new Date().getTime();
          return (
            <div key={i.id} className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm">
                  <div className="text-xs text-slate-600">
                    {i.checkout.expectedReturnAt ? (
                      <span className={overdue ? "font-medium text-red-700" : ""}>
                        Due {formatDistanceToNowStrict(i.checkout.expectedReturnAt, { addSuffix: true })}
                      </span>
                    ) : (
                      "No due date"
                    )}
                    {" · "}
                    Borrower: {i.checkout.borrowerName}
                  </div>
                </div>
                <Link className="text-sm underline text-slate-700" href={`/checkouts/${i.checkoutId}`}>
                  Checkout
                </Link>
              </div>

              <form action={returnItemAction} className="mt-4 grid gap-3 md:grid-cols-6">
                <input type="hidden" name="checkoutItemId" value={i.id} />
                <input type="hidden" name="returnTo" value="/scan" />
                <div className="md:col-span-2">
                  <Label>Condition on return</Label>
                  <select
                    name="condition"
                    defaultValue={equipment.condition}
                    className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
                  >
                    {Object.values(EquipmentCondition).map((c) => (
                      <option key={c} value={c}>
                        {conditionLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <Label>Notes / damage</Label>
                  <Input name="notes" placeholder="Optional notes (missing pegs, damaged pole…)" className="mt-1 h-11" />
                </div>
                <div className="md:col-span-4 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="createMaintenance" defaultChecked />
                    Create maintenance issue if damaged/out of service
                  </label>
                </div>
                <div className="md:col-span-2 flex items-center justify-end">
                  <Button type="submit" className="h-11 w-full text-base md:w-auto">
                    Return & scan next
                  </Button>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
