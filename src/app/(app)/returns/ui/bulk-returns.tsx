"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EquipmentCondition } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { conditionLabel } from "@/lib/display";
import { bulkReturnAction } from "../actions";

type BulkItem = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  assetId: string;
  borrowerName: string;
  checkoutId: string;
  expectedReturnAt: string | null;
  checkedOutAt: string;
};

export function BulkReturns({ items }: { items: BulkItem[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [condition, setCondition] = useState<EquipmentCondition>(EquipmentCondition.GOOD);
  const [notes, setNotes] = useState("");
  const [createMaintenance, setCreateMaintenance] = useState(true);
  const [maintenanceTitle, setMaintenanceTitle] = useState("");

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([id]) => id), [selected]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-medium text-slate-900">Bulk return</div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (allSelected) {
                setSelected({});
              } else {
                const next: Record<string, boolean> = {};
                for (const i of items) next[i.id] = true;
                setSelected(next);
              }
            }}
            disabled={items.length === 0}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        </div>

        <form action={bulkReturnAction} className="mt-4 grid gap-3 md:grid-cols-6">
          <input type="hidden" name="itemIdsJson" value={JSON.stringify(selectedIds)} />

          <div className="md:col-span-2">
            <Label>Condition on return</Label>
            <select
              name="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
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
            <Label>Notes</Label>
            <Input
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="One note applied to all selected items"
              className="mt-1 h-11"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="createMaintenance"
                checked={createMaintenance}
                onChange={(e) => setCreateMaintenance(e.target.checked)}
              />
              Create maintenance issue if damaged/out of service
            </label>
            <Input
              name="maintenanceTitle"
              value={maintenanceTitle}
              onChange={(e) => setMaintenanceTitle(e.target.value)}
              placeholder="Maintenance title (optional)"
              className="max-w-sm h-11"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end">
            <Button type="submit" className="h-11 w-full text-base md:w-auto" disabled={selectedIds.length === 0}>
              Mark returned ({selectedIds.length})
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {items.map((i) => {
          const overdue = i.expectedReturnAt ? new Date(i.expectedReturnAt).getTime() < Date.now() : false;
          return (
            <label
              key={i.id}
              className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm"
            >
              <input
                type="checkbox"
                className="mt-1.5"
                checked={selected[i.id] ?? false}
                onChange={(e) => setSelected((prev) => ({ ...prev, [i.id]: e.target.checked }))}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className="font-medium text-slate-900 hover:underline" href={`/equipment/${i.equipmentId}`}>
                      {i.equipmentName}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-slate-600">{i.assetId}</span>
                    <div className="mt-1 text-sm text-slate-600">Borrower: {i.borrowerName}</div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {i.expectedReturnAt ? (
                        <span className={overdue ? "font-medium text-red-700" : ""}>
                          Due {formatDistanceToNowStrict(new Date(i.expectedReturnAt), { addSuffix: true })}
                        </span>
                      ) : (
                        "No due date"
                      )}
                      {" · "}
                      Checked out {formatDistanceToNowStrict(new Date(i.checkedOutAt), { addSuffix: true })}
                    </div>
                  </div>
                  <Link className="text-sm underline text-slate-700" href={`/checkouts/${i.checkoutId}`}>
                    Checkout
                  </Link>
                </div>
              </div>
            </label>
          );
        })}

        {items.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 text-center text-slate-600 shadow-sm">
            Nothing currently checked out.
          </div>
        ) : null}
      </div>
    </div>
  );
}

