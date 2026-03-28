"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Hotspot = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  targetLocationId: string | null;
  targetLocationName: string | null;
};

export function HotspotEditor({
  locationId,
  canManage,
  imageUrl,
  hotspots,
  locations,
  createAction,
  deleteAction,
}: {
  locationId: string;
  canManage: boolean;
  imageUrl: string | null;
  hotspots: Hotspot[];
  locations: { id: string; name: string }[];
  createAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0.5, y: 0.5, w: 0.22, h: 0.18 });
  const [label, setLabel] = useState("");
  const [targetLocationId, setTargetLocationId] = useState("");

  const ordered = useMemo(() => hotspots.slice().sort((a, b) => a.label.localeCompare(b.label)), [hotspots]);

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-3 shadow-sm">
          <div className="text-sm text-slate-700">Tap a highlighted area to jump.</div>
          <div
            className="relative mt-3 overflow-hidden rounded-lg border border-[color:var(--border)] bg-slate-100"
            onClick={(e) => {
              if (!canManage) return;
              const el = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - el.left) / el.width;
              const y = (e.clientY - el.top) / el.height;
              setDraft((d) => ({ ...d, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }));
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Location photo" className="block w-full" loading="lazy" decoding="async" />

            {ordered.map((h) => (
              <Link
                key={h.id}
                href={h.targetLocationId ? `/locations/${h.targetLocationId}` : "#"}
                aria-disabled={!h.targetLocationId}
                className={[
                  "absolute rounded-lg border-2 border-white/80 bg-[color:var(--primary)]/25 shadow-sm",
                  h.targetLocationId ? "hover:bg-[color:var(--primary)]/35" : "pointer-events-none opacity-50",
                ].join(" ")}
                style={{
                  left: `${(h.x - h.w / 2) * 100}%`,
                  top: `${(h.y - h.h / 2) * 100}%`,
                  width: `${h.w * 100}%`,
                  height: `${h.h * 100}%`,
                }}
                title={h.label}
              >
                <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
                  {h.label}
                </span>
              </Link>
            ))}

            {canManage ? (
              <div
                className="absolute rounded-lg border-2 border-dashed border-amber-300 bg-amber-300/20"
                style={{
                  left: `${(draft.x - draft.w / 2) * 100}%`,
                  top: `${(draft.y - draft.h / 2) * 100}%`,
                  width: `${draft.w * 100}%`,
                  height: `${draft.h * 100}%`,
                }}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 text-center text-slate-600 shadow-sm">
          Upload a photo to add hotspots.
        </div>
      )}

      {canManage ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <div className="font-medium text-slate-900">Add hotspot</div>
          <div className="mt-1 text-sm text-slate-600">Tap the photo to place the draft rectangle, then save.</div>

          <form action={createAction} className="mt-4 grid gap-3 md:grid-cols-6">
            <input type="hidden" name="locationId" value={locationId} />
            <input type="hidden" name="x" value={String(draft.x)} />
            <input type="hidden" name="y" value={String(draft.y)} />
            <input type="hidden" name="w" value={String(draft.w)} />
            <input type="hidden" name="h" value={String(draft.h)} />

            <div className="md:col-span-2 space-y-1">
              <Label>Label</Label>
              <Input name="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Hall cupboard left" required />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Go to</Label>
              <select
                name="targetLocationId"
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
              >
                <option value="">— (no link)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" disabled={!imageUrl || !label.trim()}>
                Save
              </Button>
            </div>

            <div className="md:col-span-6 grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label>Width</Label>
                <Input
                  type="number"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={draft.w}
                  onChange={(e) => setDraft((d) => ({ ...d, w: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Height</Label>
                <Input
                  type="number"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={draft.h}
                  onChange={(e) => setDraft((d) => ({ ...d, h: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>X</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={draft.x}
                  onChange={(e) => setDraft((d) => ({ ...d, x: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={draft.y}
                  onChange={(e) => setDraft((d) => ({ ...d, y: Number(e.target.value) }))}
                />
              </div>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium text-slate-900">Hotspots</div>
          <div className="text-sm text-slate-600">{ordered.length} shown</div>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {ordered.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color:var(--border)]/60 p-3">
              <div>
                <div className="font-medium text-slate-900">{h.label}</div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {h.targetLocationId ? `Links to: ${h.targetLocationName ?? h.targetLocationId}` : "No link"}
                </div>
              </div>
              {canManage ? (
                <form action={deleteAction}>
                  <input type="hidden" name="locationId" value={locationId} />
                  <input type="hidden" name="hotspotId" value={h.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Delete
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
          {ordered.length === 0 ? <div className="text-slate-600">No hotspots yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
