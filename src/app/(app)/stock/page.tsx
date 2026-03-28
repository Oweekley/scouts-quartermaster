import Link from "next/link";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { consumeNAction, consumeOneAction, restockToAction } from "@/app/(app)/equipment/actions";

export default async function StockPage() {
  const user = await requireRole(Role.LEADER);
  const canConsume = roleAtLeast(user.role, Role.LEADER);
  const canRestock = roleAtLeast(user.role, Role.QUARTERMASTER);

  const low = await prisma.equipment.findMany({
    where: {
      isActive: true,
      minStock: { not: null },
    },
    select: { id: true, name: true, assetId: true, quantity: true, minStock: true, isConsumable: true },
    orderBy: [{ quantity: "asc" }, { name: "asc" }],
    take: 200,
  });
  const lowFiltered = low.filter((e) => e.minStock !== null && e.quantity <= e.minStock);

  const needsSetup = await prisma.equipment.count({
    where: { isActive: true, minStock: null, isConsumable: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Stock</h1>
          <p className="mt-1 text-sm text-slate-600">Low-stock alerts for consumables and anything with a min stock set.</p>
        </div>
        <Link className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50" href="/equipment">
          Manage equipment
        </Link>
      </div>

      {needsSetup > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {needsSetup} consumable item(s) don’t have a min stock set yet.
        </div>
      ) : null}

      {lowFiltered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          Nothing low on stock right now.
        </div>
      ) : null}

      {/* Mobile cards */}
      {lowFiltered.length > 0 ? (
        <div className="grid gap-3 md:hidden">
          {lowFiltered.map((e) => {
            const danger = e.quantity <= 0;
            return (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${e.id}`}>
                      {e.name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-mono">{e.assetId}</span>
                      {e.isConsumable ? <span> · Consumable</span> : null}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className={danger ? "font-semibold text-red-700 tabular-nums" : "tabular-nums"}>
                      {e.quantity}
                    </div>
                    <div className="text-xs text-slate-600 tabular-nums">Min {e.minStock ?? "—"}</div>
                  </div>
                </div>

                {canConsume && e.isConsumable ? (
                  <div className="mt-3 space-y-2">
                    <form action={consumeOneAction}>
                      <input type="hidden" name="equipmentId" value={e.id} />
                      <Button type="submit" variant="secondary" disabled={e.quantity <= 0} className="w-full">
                        Consume 1
                      </Button>
                    </form>
                    <form action={consumeNAction} className="flex gap-2">
                      <input type="hidden" name="equipmentId" value={e.id} />
                      <input
                        name="amount"
                        type="number"
                        min={1}
                        max={e.quantity}
                        defaultValue={Math.min(1, Math.max(1, e.quantity))}
                        className="h-9 w-20 rounded-md border border-slate-200 px-2 text-right text-sm"
                      />
                      <Button type="submit" variant="secondary" disabled={e.quantity <= 0} className="flex-1">
                        Consume N
                      </Button>
                    </form>
                    {canRestock ? (
                      <form action={restockToAction} className="flex gap-2">
                        <input type="hidden" name="equipmentId" value={e.id} />
                        <input
                          name="target"
                          type="number"
                          min={0}
                          defaultValue={Math.max(e.minStock ?? 0, e.quantity)}
                          className="h-9 w-20 rounded-md border border-slate-200 px-2 text-right text-sm"
                        />
                        <Button type="submit" variant="secondary" className="flex-1">
                          Restock to X
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr className="[&>th]:px-4 [&>th]:py-3">
              <th>Item</th>
              <th>Asset</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Min</th>
              <th className="w-[160px]"></th>
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {lowFiltered.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link className="font-medium hover:underline" href={`/equipment/${e.id}`}>
                    {e.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-slate-600">{e.isConsumable ? "Consumable" : ""}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{e.assetId}</td>
                <td className="px-4 py-3 text-right tabular-nums">{e.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{e.minStock ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {canConsume && e.isConsumable ? (
                    <div className="flex items-center justify-end gap-2">
                      <form action={consumeOneAction}>
                        <input type="hidden" name="equipmentId" value={e.id} />
                        <Button type="submit" variant="secondary" disabled={e.quantity <= 0}>
                          Consume 1
                        </Button>
                      </form>
                      <form action={consumeNAction} className="flex items-center gap-2">
                        <input type="hidden" name="equipmentId" value={e.id} />
                        <input
                          name="amount"
                          type="number"
                          min={1}
                          max={e.quantity}
                          defaultValue={1}
                          className="h-9 w-20 rounded-md border border-slate-200 px-2 text-right text-sm"
                        />
                        <Button type="submit" variant="secondary" disabled={e.quantity <= 0}>
                          Consume N
                        </Button>
                      </form>
                      {canRestock ? (
                        <form action={restockToAction} className="flex items-center gap-2">
                          <input type="hidden" name="equipmentId" value={e.id} />
                          <input
                            name="target"
                            type="number"
                            min={0}
                            defaultValue={Math.max(e.minStock ?? 0, e.quantity)}
                            className="h-9 w-24 rounded-md border border-slate-200 px-2 text-right text-sm"
                          />
                          <Button type="submit" variant="secondary">
                            Restock to X
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
