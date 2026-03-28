"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomFieldDefinition, EquipmentCategory, EquipmentType, Location } from "@prisma/client";
import { CustomFieldType, EquipmentCondition, EquipmentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { conditionLabel, statusLabel } from "@/lib/display";
import { upsertEquipmentAction } from "../actions";

type Props = {
  categories: EquipmentCategory[];
  locations: Location[];
  types: (EquipmentType & { fields: CustomFieldDefinition[] })[];
  equipment?: {
    id: string;
    name: string;
    assetId: string;
    qrValue: string;
    description: string | null;
    categoryId: string | null;
    typeId: string | null;
    quantity: number;
    isConsumable: boolean;
    minStock: number | null;
    serialNumber: string | null;
    status: EquipmentStatus;
    condition: EquipmentCondition;
    purchaseDate: string | null;
    warrantyExpiry: string | null;
    value: string | null;
    notes: string | null;
    locationId: string | null;
    assignedSection: string | null;
    isActive: boolean;
    customFieldValues: { fieldDefinitionId: string; fieldDefinitionKey: string; valueJson: unknown }[];
  };
};

function toDateInputValue(date: string | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

type Draft = {
  savedAtMs: number;
  selectedTypeId: string;
  values: Record<string, string>;
  customFields: Record<string, unknown>;
};

export function EquipmentForm({ categories, locations, types, equipment }: Props) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>(equipment?.typeId ?? "");
  const formRef = useRef<HTMLFormElement | null>(null);
  const draftKey = useMemo(() => `sq_equipment_draft_${equipment?.id ?? "new"}`, [equipment?.id]);
  const [draftAvailable, setDraftAvailable] = useState(false);

  const defsForType = useMemo(() => {
    if (!selectedTypeId) return [] as CustomFieldDefinition[];
    const type = types.find((t) => t.id === selectedTypeId);
    return type?.fields ?? [];
  }, [selectedTypeId, types]);

  const defaultCustomFields = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const def of defsForType) map[def.key] = "";
    if (equipment?.customFieldValues) {
      for (const v of equipment.customFieldValues) map[v.fieldDefinitionKey] = v.valueJson ?? "";
    }
    return map;
  }, [defsForType, equipment]);

  const [customFieldState, setCustomFieldState] = useState<Record<string, unknown>>(defaultCustomFields);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      setDraftAvailable(Boolean(raw));
    } catch {
      setDraftAvailable(false);
    }
  }, [draftKey]);

  useEffect(() => {
    let t: number | undefined = undefined;

    function saveDraft() {
      const form = formRef.current;
      if (!form) return;
      const fd = new FormData(form);
      const values: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") values[k] = v;
      }
      const draft: Draft = {
        savedAtMs: Date.now(),
        selectedTypeId,
        values,
        customFields: customFieldState,
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftAvailable(true);
      } catch {
        // ignore
      }
    }

    function onAnyInput() {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(saveDraft, 500);
    }

    const form = formRef.current;
    if (!form) return;
    form.addEventListener("input", onAnyInput);
    form.addEventListener("change", onAnyInput);
    return () => {
      if (t) window.clearTimeout(t);
      form.removeEventListener("input", onAnyInput);
      form.removeEventListener("change", onAnyInput);
    };
  }, [customFieldState, draftKey, selectedTypeId]);

  return (
    <form ref={formRef} action={upsertEquipmentAction} className="space-y-4">
      {equipment?.id ? <input type="hidden" name="id" value={equipment.id} /> : null}
      <input type="hidden" name="customFields" value={JSON.stringify(customFieldState)} />

      {draftAvailable ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div>Draft saved on this device.</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                try {
                  const raw = localStorage.getItem(draftKey);
                  if (!raw) return;
                  const parsed = JSON.parse(raw) as Partial<Draft>;
                  if (!parsed || typeof parsed !== "object") return;

                  if (typeof parsed.selectedTypeId === "string") setSelectedTypeId(parsed.selectedTypeId);
                  if (parsed.customFields && typeof parsed.customFields === "object") {
                    setCustomFieldState(parsed.customFields as Record<string, unknown>);
                  }

                  const form = formRef.current;
                  if (form && parsed.values && typeof parsed.values === "object") {
                    for (const [k, v] of Object.entries(parsed.values as Record<string, string>)) {
                      const el = form.elements.namedItem(k);
                      if (!el) continue;
                      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
                        el.value = v;
                        el.dispatchEvent(new Event("input", { bubbles: true }));
                      }
                    }
                  }
                } catch {
                  // ignore
                }
              }}
            >
              Restore draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey);
                } catch {
                  // ignore
                }
                setDraftAvailable(false);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name">Item name</Label>
          <Input id="name" name="name" defaultValue={equipment?.name ?? ""} required autoComplete="off" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="assetId">Asset ID</Label>
          <Input id="assetId" name="assetId" defaultValue={equipment?.assetId ?? ""} required autoComplete="off" autoCapitalize="none" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="qrValue">QR value</Label>
          <Input id="qrValue" name="qrValue" defaultValue={equipment?.qrValue ?? ""} placeholder="Defaults to scouts:<assetId>" autoComplete="off" autoCapitalize="none" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min={0} inputMode="numeric" defaultValue={equipment?.quantity ?? 1} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="minStock">Min stock</Label>
          <Input
            id="minStock"
            name="minStock"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={equipment?.minStock ?? ""}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1">
          <Label>Consumable</Label>
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isConsumable" defaultChecked={equipment?.isConsumable ?? false} />
            Track as consumable (allow quantity to hit 0)
          </label>
        </div>

        <div className="space-y-1">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={equipment?.categoryId ?? ""}
            className="h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="typeId">Type</Label>
          <select
            id="typeId"
            name="typeId"
            defaultValue={equipment?.typeId ?? ""}
            className="h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
            onChange={(e) => {
              const nextTypeId = e.target.value;
              setSelectedTypeId(nextTypeId);
              const nextType = types.find((t) => t.id === nextTypeId);
              const nextFields: Record<string, unknown> = {};
              for (const def of nextType?.fields ?? []) nextFields[def.key] = "";
              setCustomFieldState(nextFields);
            }}
          >
            <option value="">—</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="locationId">Storage location</Label>
          <select
            id="locationId"
            name="locationId"
            defaultValue={equipment?.locationId ?? ""}
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm md:h-9"
          >
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="serialNumber">Serial number</Label>
          <Input id="serialNumber" name="serialNumber" defaultValue={equipment?.serialNumber ?? ""} autoComplete="off" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={equipment?.status ?? EquipmentStatus.AVAILABLE}
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm md:h-9"
          >
            {Object.values(EquipmentStatus).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="condition">Condition</Label>
          <select
            id="condition"
            name="condition"
            defaultValue={equipment?.condition ?? EquipmentCondition.GOOD}
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm md:h-9"
          >
            {Object.values(EquipmentCondition).map((c) => (
              <option key={c} value={c}>
                {conditionLabel(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="purchaseDate">Purchase date</Label>
          <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={toDateInputValue(equipment?.purchaseDate ?? null)} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="warrantyExpiry">Warranty expiry</Label>
          <Input id="warrantyExpiry" name="warrantyExpiry" type="date" defaultValue={toDateInputValue(equipment?.warrantyExpiry ?? null)} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="value">Value (£)</Label>
          <Input id="value" name="value" inputMode="decimal" defaultValue={equipment?.value ?? ""} placeholder="Optional" autoComplete="off" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="assignedSection">Assigned section</Label>
          <Input id="assignedSection" name="assignedSection" defaultValue={equipment?.assignedSection ?? ""} placeholder="e.g. Cubs / Scouts / Explorers" autoComplete="off" />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            defaultValue={equipment?.description ?? ""}
            className="min-h-[72px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={equipment?.notes ?? ""}
            className="min-h-[72px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm"
            autoComplete="off"
          />
        </div>
      </div>

      {selectedTypeId && defsForType.length > 0 ? (
        <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <div className="font-medium text-slate-900">Type-specific fields</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {defsForType.map((def) => (
              <div key={def.id} className={def.fieldType === CustomFieldType.TEXTAREA ? "md:col-span-2" : ""}>
                <Label>{def.label}</Label>
                {def.fieldType === CustomFieldType.TEXTAREA ? (
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm"
                    defaultValue={String(customFieldState[def.key] ?? "")}
                    onChange={(e) => setCustomFieldState((s) => ({ ...s, [def.key]: e.target.value }))}
                  />
                ) : def.fieldType === CustomFieldType.SELECT && Array.isArray(def.options) ? (
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm md:h-9"
                    defaultValue={String(customFieldState[def.key] ?? "")}
                    onChange={(e) => setCustomFieldState((s) => ({ ...s, [def.key]: e.target.value }))}
                  >
                    <option value="">—</option>
                    {(def.options as unknown[]).map((opt) => (
                      <option key={String(opt)} value={String(opt)}>
                        {String(opt)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="mt-1"
                    defaultValue={String(customFieldState[def.key] ?? "")}
                    type={def.fieldType === CustomFieldType.NUMBER ? "number" : def.fieldType === CustomFieldType.DATE ? "date" : "text"}
                    onChange={(e) =>
                      setCustomFieldState((s) => ({
                        ...s,
                        [def.key]:
                          def.fieldType === CustomFieldType.NUMBER
                            ? e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
