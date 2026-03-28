"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrScanner } from "@/app/(app)/qr/qr-scanner";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  clearSnapshot,
  enqueue,
  getSnapshot,
  listQueue,
  removeFromQueue,
  setSnapshot,
  type OfflineQueueItem,
  type StoreCupboardEquipment,
  type StoreCupboardSnapshot,
} from "@/lib/store-cupboard/db";

function formatTime(ms: number) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}

function uuid() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID() as string;
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type CommitResult =
  | { id: string; ok: true; equipment: { id: string; quantity: number; updatedAtMs: number } }
  | { id: string; ok: false; error: string; conflict?: { kind: "updated"; serverUpdatedAtMs: number } };

export function StoreCupboardClient() {
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [snapshot, setSnapshotState] = useState<StoreCupboardSnapshot | null>(null);
  const [queue, setQueueState] = useState<OfflineQueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Record<string, string>>({});

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 200);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>("");

  function requestBgSync() {
    try {
      if (!("serviceWorker" in navigator)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sw = navigator.serviceWorker as any;
      if (!sw?.ready) return;
      void sw.ready.then((reg: any) => reg?.sync?.register?.("sq-sync")).catch(() => undefined);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    function onOnline() {
      setOnline(true);
      requestBgSync();
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function refreshLocal() {
    const [snap, q] = await Promise.all([getSnapshot(), listQueue()]);
    setSnapshotState(snap);
    setQueueState(q);
  }

  useEffect(() => {
    void refreshLocal();
  }, []);

  const equipmentById = useMemo(() => {
    return new Map((snapshot?.equipment ?? []).map((e) => [e.id, e]));
  }, [snapshot]);

  const offlineResolve = useMemo(() => {
    const equipment = snapshot?.equipment ?? [];
    const byQr = new Map<string, string>();
    const byAssetLower = new Map<string, string>();
    for (const e of equipment) {
      if (e.qrValue) byQr.set(e.qrValue, e.id);
      if (e.assetId) byAssetLower.set(e.assetId.toLowerCase(), e.id);
    }
    return async (raw: string) => {
      const v = raw.trim();
      const id = byQr.get(v) ?? byAssetLower.get(v.toLowerCase()) ?? null;
      return id ? ({ kind: "equipment", id } as const) : null;
    };
  }, [snapshot]);

  const filtered = useMemo(() => {
    const list = snapshot?.equipment ?? [];
    const term = debouncedQ.trim().toLowerCase();
    if (!term) return list;
    return list.filter((e) => {
      const hay = `${e.name} ${e.assetId} ${e.qrValue}`.toLowerCase();
      return hay.includes(term);
    });
  }, [debouncedQ, snapshot]);

  async function downloadSnapshot() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/store-cupboard/snapshot", { method: "GET" });
      if (!res.ok) throw new Error("Could not download snapshot.");
      const data = (await res.json()) as StoreCupboardSnapshot;
      if (!data || typeof data.generatedAtMs !== "number" || !Array.isArray(data.equipment)) throw new Error("Invalid snapshot response.");
      await setSnapshot(data);
      await refreshLocal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download snapshot.");
    } finally {
      setBusy(false);
    }
  }

  async function applyLocalEquipmentUpdate(equipmentId: string, patch: Partial<StoreCupboardEquipment>) {
    const snap = await getSnapshot();
    if (!snap) return;
    const idx = snap.equipment.findIndex((e) => e.id === equipmentId);
    if (idx < 0) return;
    snap.equipment[idx] = { ...snap.equipment[idx], ...patch };
    await setSnapshot(snap);
    setSnapshotState(snap);
  }

  async function commit(items: OfflineQueueItem[]) {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/offline/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            id: it.id,
            type: it.type,
            equipmentId: it.payload.equipmentId,
            baseUpdatedAtMs: it.payload.baseUpdatedAtMs,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { results?: CommitResult[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Sync failed.");
      const results = Array.isArray(data?.results) ? data!.results : [];

      const nextConflicts: Record<string, string> = {};
      for (const r of results) {
        if (r.ok) {
          await removeFromQueue(r.id);
          await applyLocalEquipmentUpdate(r.equipment.id, { quantity: r.equipment.quantity, updatedAtMs: r.equipment.updatedAtMs });
        } else {
          nextConflicts[r.id] = r.error;
        }
      }
      setConflicts((prev) => ({ ...prev, ...nextConflicts }));
      await refreshLocal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function consumeOne(equipmentId: string) {
    const eq = equipmentById.get(equipmentId);
    if (!eq) return;
    if (!eq.isConsumable) {
      setError("This item isn’t marked as a consumable.");
      return;
    }
    if (eq.quantity <= 0) {
      setError("Nothing left to consume.");
      return;
    }

    const item: OfflineQueueItem = {
      id: uuid(),
      createdAtMs: Date.now(),
      type: "consume_one",
      payload: { equipmentId, baseUpdatedAtMs: eq.updatedAtMs },
    };

    if (online) {
      await commit([item]);
      return;
    }

    await enqueue(item);
    await applyLocalEquipmentUpdate(equipmentId, { quantity: Math.max(0, eq.quantity - 1) });
    requestBgSync();
    await refreshLocal();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className={online ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
              {online ? "Online" : "Offline"}
            </span>
            {snapshot ? (
              <span className="text-slate-600"> · snapshot {formatTime(snapshot.generatedAtMs)}</span>
            ) : (
              <span className="text-slate-600"> · no snapshot yet</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={downloadSnapshot} disabled={busy || !online}>
              {snapshot ? "Refresh snapshot" : "Download snapshot"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await clearSnapshot();
                await refreshLocal();
              }}
              disabled={busy}
            >
              Clear
            </Button>
            <Button type="button" onClick={() => void commit(queue)} disabled={busy || !online || queue.length === 0}>
              Sync changes ({queue.length})
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {Object.keys(conflicts).length ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Some queued changes couldn’t be applied. Refresh the snapshot, then try syncing again.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor="sc-q">
              Search
            </label>
            <Input
              id="sc-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, asset ID, QR value…"
              className="mt-1"
              autoComplete="off"
              inputMode="search"
            />
            {lastScanned ? <div className="mt-1 text-xs text-slate-600">Last scan: <span className="font-mono">{lastScanned}</span></div> : null}
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="text-sm text-slate-600">{filtered.length} item(s)</div>
            <Button type="button" variant="secondary" onClick={() => setCameraOpen((v) => !v)} disabled={!snapshot}>
              {cameraOpen ? "Hide camera" : "Scan offline"}
            </Button>
          </div>
        </div>

        {cameraOpen ? (
          <div className="mt-4">
            <QrScanner
              onStop={() => setCameraOpen(false)}
              offlineResolve={offlineResolve}
              onResolved={(res, raw) => {
                setLastScanned(raw);
                const eq = snapshot?.equipment.find((e) => e.id === res.id);
                if (eq) setQ(eq.assetId);
                setCameraOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      {!snapshot ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 text-center text-slate-600 shadow-sm">
          Download a snapshot while you’re online to use store cupboard mode offline.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 200).map((e) => (
            <div key={e.id} className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
              <div className="text-xs font-mono text-slate-600">{e.assetId}</div>
              <div className="mt-0.5 text-base font-semibold text-slate-900">{e.name}</div>
              <div className="mt-1 text-sm text-slate-600">{e.locationLabel ?? "—"}</div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={e.status === "AVAILABLE" ? "success" : e.status === "CHECKED_OUT" ? "warning" : e.status === "MAINTENANCE" ? "danger" : "default"}>
                  {e.status}
                </Badge>
                <Badge variant="default">{e.condition}</Badge>
                <span className="text-sm text-slate-700 tabular-nums">Qty {e.quantity}</span>
                {e.isConsumable ? <Badge variant="default">Consumable</Badge> : null}
              </div>

              <div className="mt-3 grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => consumeOne(e.id)} disabled={busy || e.quantity <= 0 || !e.isConsumable}>
                    Consume 1
                  </Button>
                  <Link
                    href={`/equipment/${e.id}`}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-[color:var(--border)] bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 md:h-9"
                  >
                    Open
                  </Link>
                </div>
                <div className="text-xs text-slate-600">
                  Updated {formatTime(e.updatedAtMs)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
