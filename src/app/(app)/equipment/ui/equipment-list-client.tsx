"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { EquipmentCondition, EquipmentStatus, Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conditionLabel, statusLabel } from "@/lib/display";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type FlatOption = { id: string; label: string };

export type EquipmentListRow = {
  id: string;
  name: string;
  assetId: string;
  qrValue: string;
  quantity: number;
  locationLabel: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  updatedAtRelative: string;
  categoryName: string | null;
  typeName: string | null;
};

function setOrDelete(params: URLSearchParams, key: string, value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v) params.delete(key);
  else params.set(key, v);
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase?.();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export function EquipmentListClient({
  userRole,
  rows,
  locations,
  categories,
  types,
  initial,
}: {
  userRole: Role;
  rows: EquipmentListRow[];
  locations: FlatOption[];
  categories: FlatOption[];
  types: { id: string; name: string }[];
  initial: {
    q: string;
    status: string;
    condition: string;
    locationId: string;
    categoryId: string;
    typeId: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canManage = userRole === "ADMIN" || userRole === "QUARTERMASTER";

  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [condition, setCondition] = useState(initial.condition);
  const [locationId, setLocationId] = useState(initial.locationId);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [typeId, setTypeId] = useState(initial.typeId);

  useEffect(() => {
    setQ(initial.q);
    setStatus(initial.status);
    setCondition(initial.condition);
    setLocationId(initial.locationId);
    setCategoryId(initial.categoryId);
    setTypeId(initial.typeId);
  }, [initial.categoryId, initial.condition, initial.locationId, initial.q, initial.status, initial.typeId]);

  const debouncedQ = useDebouncedValue(q, 250);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString?.() ?? "");

    setOrDelete(params, "q", debouncedQ);
    setOrDelete(params, "status", status);
    setOrDelete(params, "condition", condition);
    setOrDelete(params, "locationId", locationId);
    setOrDelete(params, "categoryId", categoryId);
    setOrDelete(params, "typeId", typeId);
    // Any filter change resets pagination.
    params.set("page", "1");

    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${(searchParams?.toString?.() ?? "")}`;
    if (next !== current) router.replace(next, { scroll: false });
  }, [categoryId, condition, debouncedQ, locationId, pathname, router, searchParams, status, typeId]);

  const [selectedId, setSelectedId] = useState<string>(rows[0]?.id ?? "");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);
  const checkedIds = useMemo(() => Object.entries(checked).filter(([, v]) => v).map(([id]) => id), [checked]);

  useEffect(() => {
    if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
    if (selectedId && !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0]?.id ?? "");
  }, [rows, selectedId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const idx = rows.findIndex((r) => r.id === selectedId);
      if (e.key === "j") {
        const next = rows[Math.min(rows.length - 1, Math.max(0, idx + 1))];
        if (next) setSelectedId(next.id);
      } else if (e.key === "k") {
        const next = rows[Math.min(rows.length - 1, Math.max(0, idx - 1))];
        if (next) setSelectedId(next.id);
      } else if (e.key === "Enter") {
        if (selectedId) router.push(`/equipment/${selectedId}`);
      } else if (e.key === "x") {
        if (selectedId) setChecked((prev) => ({ ...prev, [selectedId]: !prev[selectedId] }));
      } else if (e.key === "p") {
        if (selectedId) window.open(`/labels/${selectedId}`, "_blank", "noopener,noreferrer");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, rows, selectedId]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Equipment</h1>
          <p className="mt-1 text-sm text-slate-600">Search, filter and manage your kit.</p>
        </div>
        {canManage ? (
          <Link
            className="rounded-md bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-white hover:brightness-95"
            href="/equipment/new"
          >
            Add equipment
          </Link>
        ) : null}
      </div>

      <div className="sticky top-14 z-10 -mx-5 border-y border-[color:var(--border)] bg-white/95 px-5 py-3 backdrop-blur md:static md:top-auto md:mx-0 md:rounded-xl md:border md:p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-700" htmlFor="eq-q">
              Search
            </label>
            <Input
              id="eq-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, asset ID, QR value…"
              className="mt-1"
              autoComplete="off"
              inputMode="search"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor="eq-status">
              Status
            </label>
            <select
              id="eq-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
            >
              <option value="">Any</option>
              <option value="AVAILABLE">Available</option>
              <option value="CHECKED_OUT">Checked out</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor="eq-condition">
              Condition
            </label>
            <select
              id="eq-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
            >
              <option value="">Any</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="DAMAGED">Damaged</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor="eq-type">
              Type
            </label>
            <select
              id="eq-type"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
            >
              <option value="">Any</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor="eq-location">
              Location
            </label>
            <select
              id="eq-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
            >
              <option value="">Any</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-6">
            <label className="text-xs font-medium text-slate-700" htmlFor="eq-category">
              Category
            </label>
            <select
              id="eq-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
            >
              <option value="">Any</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-sm text-slate-600">
              {rows.length} shown
              {initial.page > 1 ? ` · page ${initial.page}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setCondition("");
                  setLocationId("");
                  setCategoryId("");
                  setTypeId("");
                }}
              >
                Reset
              </Button>
              {canManage ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={checkedIds.length === 0}
                  onClick={() => {
                    for (const id of checkedIds) window.open(`/labels/${id}`, "_blank", "noopener,noreferrer");
                  }}
                >
                  Print labels ({checkedIds.length || 0})
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {/* Mobile card list */}
          <div className="grid gap-3 md:hidden">
            {rows.map((r) => {
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={clsx(
                    "rounded-xl border bg-white p-4 text-left shadow-sm transition active:scale-[0.99]",
                    active ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/20" : "border-[color:var(--border)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-600">{r.assetId}</div>
                      <div className="mt-0.5 truncate text-base font-semibold text-slate-900">{r.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {r.categoryName ?? "Uncategorised"}
                        {r.typeName ? ` · ${r.typeName}` : ""}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={checked[r.id] ?? false}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => setChecked((p) => ({ ...p, [r.id]: !(p[r.id] ?? false) }))}
                      aria-label={`Select ${r.name}`}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        r.status === "AVAILABLE"
                          ? "success"
                          : r.status === "CHECKED_OUT"
                            ? "warning"
                            : r.status === "MAINTENANCE"
                              ? "danger"
                              : "default"
                      }
                    >
                      {statusLabel(r.status)}
                    </Badge>
                    <Badge variant="default">{conditionLabel(r.condition)}</Badge>
                    <span className="text-sm text-slate-700 tabular-nums">Qty {r.quantity}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {r.locationLabel ? `${r.locationLabel} · ` : ""}Updated {r.updatedAtRelative}
                  </div>
                </button>
              );
            })}

            {rows.length === 0 ? (
              <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 text-center text-slate-600 shadow-sm">
                No equipment found.
              </div>
            ) : null}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-[color:var(--border)] bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th className="w-[44px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={rows.length > 0 && rows.every((r) => checked[r.id])}
                      onChange={() => {
                        const allOn = rows.length > 0 && rows.every((r) => checked[r.id]);
                        setChecked(() => Object.fromEntries(rows.map((r) => [r.id, !allOn])));
                      }}
                      aria-label="Select all shown"
                    />
                  </th>
                  <th>Item</th>
                  <th>Asset ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Location</th>
                  <th>Updated</th>
                  <th className="text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {rows.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <tr
                      key={r.id}
                      className={clsx(
                        "border-t border-[color:var(--border)]/60 hover:bg-slate-50",
                        active && "bg-[color:var(--primary)]/5",
                      )}
                      onClick={() => setSelectedId(r.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked[r.id] ?? false}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => setChecked((p) => ({ ...p, [r.id]: !(p[r.id] ?? false) }))}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          {r.categoryName ?? "Uncategorised"}
                          {r.typeName ? ` · ${r.typeName}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.assetId}</td>
                      <td className="px-4 py-3">{r.typeName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            r.status === "AVAILABLE"
                              ? "success"
                              : r.status === "CHECKED_OUT"
                                ? "warning"
                                : r.status === "MAINTENANCE"
                                  ? "danger"
                                  : "default"
                          }
                        >
                          {statusLabel(r.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{conditionLabel(r.condition)}</td>
                      <td className="px-4 py-3">{r.locationLabel ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{r.updatedAtRelative}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.quantity}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-600" colSpan={9}>
                      No equipment found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={initial.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString?.() ?? "");
                const nextPage = Math.max(1, initial.page - 1);
                params.set("page", String(nextPage));
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={rows.length < initial.pageSize}
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString?.() ?? "");
                params.set("page", String(initial.page + 1));
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Desktop details panel */}
        <aside className="hidden rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm lg:block">
          {selectedRow ? (
            <div className="space-y-3">
              <div className="min-w-0">
                <div className="text-xs font-mono text-slate-600">{selectedRow.assetId}</div>
                <div className="mt-0.5 truncate text-lg font-semibold text-slate-900">{selectedRow.name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedRow.categoryName ?? "Uncategorised"}
                  {selectedRow.typeName ? ` · ${selectedRow.typeName}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    selectedRow.status === "AVAILABLE"
                      ? "success"
                      : selectedRow.status === "CHECKED_OUT"
                        ? "warning"
                        : selectedRow.status === "MAINTENANCE"
                          ? "danger"
                          : "default"
                  }
                >
                  {statusLabel(selectedRow.status)}
                </Badge>
                <Badge variant="default">{conditionLabel(selectedRow.condition)}</Badge>
                <span className="text-sm text-slate-700 tabular-nums">Qty {selectedRow.quantity}</span>
              </div>

              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-600">Location</dt>
                  <dd className="font-medium text-slate-900">{selectedRow.locationLabel ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-600">Updated</dt>
                  <dd className="font-medium text-slate-900">{selectedRow.updatedAtRelative}</dd>
                </div>
              </dl>

              <div className="grid gap-2">
                <Link
                  href={`/equipment/${selectedRow.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 md:h-9"
                >
                  Open
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(`/labels/${selectedRow.id}`, "_blank", "noopener,noreferrer")}
                  >
                    Print
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(`/checkouts/new?itemId=${encodeURIComponent(selectedRow.id)}`)}
                  >
                    Checkout
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--topbar)] p-3 text-xs text-slate-700">
                Shortcuts: <span className="font-mono">j</span>/<span className="font-mono">k</span> move,{" "}
                <span className="font-mono">x</span> select, <span className="font-mono">Enter</span> open,{" "}
                <span className="font-mono">p</span> print.
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">Select an item to see details.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

