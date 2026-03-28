"use client";

import { useMemo, useState } from "react";
import { DayOfWeek, EquipmentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sectionDisplayName } from "@/lib/sections";
import { createCheckoutAction } from "../../actions";

type EquipmentPick = {
  id: string;
  name: string;
  assetId: string;
  quantity: number;
  status: EquipmentStatus;
};

export function CheckoutForm({
  equipment,
  users,
  sections,
  bundles,
  initialEquipmentId,
  initialBundleId,
}: {
  equipment: EquipmentPick[];
  users: { id: string; name: string }[];
  sections: { id: string; name: string; meetingDay: DayOfWeek | null }[];
  bundles: { id: string; name: string; items: { equipmentId: string; quantity: number }[] }[];
  initialEquipmentId?: string;
  initialBundleId?: string;
}) {
  const equipmentById = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);

  const initialSelected = useMemo(() => {
    const next: Record<string, number> = {};

    if (initialBundleId) {
      const bundle = bundles.find((b) => b.id === initialBundleId);
      if (bundle) {
        for (const item of bundle.items) {
          const eq = equipmentById.get(item.equipmentId);
          const max = eq?.quantity ?? 9999;
          const current = next[item.equipmentId] ?? 0;
          next[item.equipmentId] = Math.min(max, current + item.quantity);
        }
      }
    }

    if (initialEquipmentId) {
      const eq = equipmentById.get(initialEquipmentId);
      if (eq) next[initialEquipmentId] = Math.min(eq.quantity ?? 9999, (next[initialEquipmentId] ?? 0) + 1);
    }

    return next;
  }, [bundles, equipmentById, initialBundleId, initialEquipmentId]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>(initialSelected);

  const [borrowerSectionId, setBorrowerSectionId] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return equipment;
    return equipment.filter((e) => (e.name + " " + e.assetId).toLowerCase().includes(q));
  }, [equipment, query]);

  const selectedItems = useMemo(() => {
    return Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
  }, [selected]);

  return (
    <form action={createCheckoutAction} className="space-y-4">
      <input type="hidden" name="itemsJson" value={JSON.stringify(selectedItems)} />
      <input type="hidden" name="borrowerSectionId" value={borrowerSectionId} />

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="borrowerSectionId">Section</Label>
          <select
            id="borrowerSectionId"
            value={borrowerSectionId}
            onChange={(e) => setBorrowerSectionId(e.target.value)}
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm md:h-9"
            required
          >
            <option value="" disabled>
              Select…
            </option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {sectionDisplayName(s)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-600">If you need a specific name, put it in Notes.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="borrowerUserId">Borrower (user)</Label>
          <select
            id="borrowerUserId"
            name="borrowerUserId"
            defaultValue=""
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm md:h-9"
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-600">Optional: which leader/volunteer took it.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="expectedReturnAt">Expected return date</Label>
          <Input id="expectedReturnAt" name="expectedReturnAt" type="date" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea id="notes" name="notes" className="min-h-[72px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="font-medium text-slate-900">Select items</div>
            <div className="text-sm text-slate-600">Search and add quantities.</div>
          </div>
          <div className="w-full md:max-w-sm">
            <Label htmlFor="bundle">Add bundle</Label>
            <select
              id="bundle"
              defaultValue=""
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm md:h-9"
              onChange={(e) => {
                const bundleId = e.target.value;
                if (!bundleId) return;
                const bundle = bundles.find((b) => b.id === bundleId);
                if (!bundle) return;
                setSelected((prev) => {
                  const next: Record<string, number> = { ...prev };
                  for (const item of bundle.items) {
                    const eq = equipmentById.get(item.equipmentId);
                    const max = eq?.quantity ?? 9999;
                    const current = next[item.equipmentId] ?? 0;
                    next[item.equipmentId] = Math.min(max, current + item.quantity);
                  }
                  return next;
                });
                e.target.value = "";
              }}
            >
              <option value="">—</option>
              {bundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600">Adds bundle quantities to this checkout (you can adjust after).</p>
            {initialBundleId ? (
              <p className="mt-1 text-xs text-slate-600">
                Bundle prefilled from scan — you can add more bundles or adjust quantities.
              </p>
            ) : null}
          </div>
          <div className="w-full md:max-w-sm">
            <Label htmlFor="search">Search</Label>
            <Input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or asset ID…" />
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-auto rounded-md border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Item</th>
                <th>Asset</th>
                <th className="text-right">In stock</th>
                <th className="text-right">Checkout qty</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-slate-600">
                      {e.status === EquipmentStatus.MAINTENANCE ? "In maintenance" : e.status === EquipmentStatus.RETIRED ? "Retired" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.assetId}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      className="h-11 w-24 rounded-md border border-slate-200 px-2 text-right text-sm md:h-9 md:w-20"
                      type="number"
                      min={0}
                      max={e.quantity}
                      inputMode="numeric"
                      value={selected[e.id] ?? 0}
                      onChange={(evt) => {
                        const value = Number(evt.target.value);
                        setSelected((s) => ({ ...s, [e.id]: Number.isFinite(value) ? value : 0 }));
                      }}
                      disabled={e.status === EquipmentStatus.RETIRED}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-600">
                    No matching items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="submit" disabled={selectedItems.length === 0}>
            Create checkout
          </Button>
        </div>
      </div>
    </form>
  );
}
