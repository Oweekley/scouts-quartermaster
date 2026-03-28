"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseCsv } from "@/lib/csv";

type Mapping = {
  assetId: string;
  name: string;
  quantity: string;
  isConsumable: string;
  minStock: string;
  serialNumber: string;
  status: string;
  condition: string;
  notes: string;
};

type ValidateResponse = {
  ok: boolean;
  errors: { row: number; message: string }[];
  preview: { row: number; values: Record<string, string> }[];
  rowsParsed: number;
};

function guess(headers: string[], key: string) {
  const lc = headers.map((h) => h.toLowerCase());
  const target = key.toLowerCase();
  const idx = lc.findIndex((h) => h === target || h.replace(/\s+/g, "") === target);
  return idx >= 0 ? headers[idx] : "";
}

export function EquipmentCsvWizard() {
  const router = useRouter();

  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [mapping, setMapping] = useState<Mapping>({
    assetId: "",
    name: "",
    quantity: "",
    isConsumable: "",
    minStock: "",
    serialNumber: "",
    status: "",
    condition: "",
    notes: "",
  });

  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mappingPayload = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      if (v) m[k] = v;
    }
    return m;
  }, [mapping]);

  const canValidate = Boolean(csvText && mapping.assetId && mapping.name);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium text-slate-900">Import equipment CSV</div>
            <div className="mt-1 text-sm text-slate-600">Upload → map columns → validate → import.</div>
          </div>
          <a
            href="/api/csv/equipment/export"
            className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50"
          >
            Download export
          </a>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="csv">CSV file</Label>
            <input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm"
              onChange={(e) => {
                setError(null);
                setValidateResult(null);
                setImportResult(null);
                const file = e.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                const reader = new FileReader();
                reader.onload = () => {
                  const text = String(reader.result ?? "");
                  setCsvText(text);
                  const parsed = parseCsv(text);
                  setHeaders(parsed.headers);
                  setMapping((prev) => ({
                    ...prev,
                    assetId: guess(parsed.headers, "assetId") || guess(parsed.headers, "asset") || prev.assetId,
                    name: guess(parsed.headers, "name") || prev.name,
                    quantity: guess(parsed.headers, "quantity") || guess(parsed.headers, "qty") || prev.quantity,
                    isConsumable: guess(parsed.headers, "isConsumable") || guess(parsed.headers, "consumable") || prev.isConsumable,
                    minStock: guess(parsed.headers, "minStock") || guess(parsed.headers, "min") || prev.minStock,
                    serialNumber: guess(parsed.headers, "serialNumber") || guess(parsed.headers, "serial") || prev.serialNumber,
                    status: guess(parsed.headers, "status") || prev.status,
                    condition: guess(parsed.headers, "condition") || prev.condition,
                    notes: guess(parsed.headers, "notes") || prev.notes,
                  }));
                };
                reader.onerror = () => setError("Could not read file.");
                reader.readAsText(file);
              }}
            />
            {fileName ? <div className="text-xs text-slate-600">{fileName}</div> : null}
          </div>

          <div className="space-y-2">
            <div className="text-sm text-slate-700">
              Import will **update** matching `assetId`s and **create** new items if they don’t exist.
            </div>
            <div className="text-xs text-slate-600">
              Required mappings: `assetId`, `name`. Optional: quantity/consumable/min stock/status/condition/notes.
            </div>
          </div>
        </div>
      </div>

      {headers.length ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <div className="font-medium text-slate-900">Mapping</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(
              [
                ["assetId", "Asset ID (required)"],
                ["name", "Name (required)"],
                ["quantity", "Quantity"],
                ["isConsumable", "Consumable"],
                ["minStock", "Min stock"],
                ["serialNumber", "Serial number"],
                ["status", "Status"],
                ["condition", "Condition"],
                ["notes", "Notes"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <select
                  className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
                  value={mapping[key]}
                  onChange={(e) => {
                    setValidateResult(null);
                    setImportResult(null);
                    setMapping((m) => ({ ...m, [key]: e.target.value }));
                  }}
                >
                  <option value="">—</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!canValidate || validating}
              onClick={async () => {
                setError(null);
                setImportResult(null);
                setValidating(true);
                try {
                  const res = await fetch("/api/csv/equipment/validate", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ csvText, mapping: mappingPayload }),
                  });
                  const data = (await res.json()) as ValidateResponse & { error?: string };
                  if (!res.ok) throw new Error(data.error || "Validation failed.");
                  setValidateResult(data);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Validation failed.");
                } finally {
                  setValidating(false);
                }
              }}
            >
              {validating ? "Validating…" : "Validate"}
            </Button>

            <Button
              type="button"
              disabled={!validateResult?.ok || importing}
              onClick={async () => {
                setError(null);
                setImportResult(null);
                setImporting(true);
                try {
                  const res = await fetch("/api/csv/equipment/import", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ csvText, mapping: mappingPayload }),
                  });
                  const data = (await res.json()) as { ok?: boolean; created?: number; updated?: number; rows?: number; error?: string };
                  if (!res.ok) throw new Error(data.error || "Import failed.");
                  setImportResult(`Imported ${data.rows ?? 0} row(s): ${data.created ?? 0} created, ${data.updated ?? 0} updated.`);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Import failed.");
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {importResult ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{importResult}</div>
      ) : null}

      {validateResult ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="font-medium text-slate-900">Validation preview</div>
            <div className="text-sm text-slate-600">
              {validateResult.ok ? "OK" : "Has errors"} · {validateResult.rowsParsed} row(s)
            </div>
          </div>

          {validateResult.errors.length ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-medium">Errors</div>
              <ul className="mt-2 list-disc pl-5">
                {validateResult.errors.slice(0, 20).map((e, idx) => (
                  <li key={idx}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
              {validateResult.errors.length > 20 ? (
                <div className="mt-2 text-xs">Showing first 20 errors.</div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>Row</th>
                  {Object.keys(validateResult.preview[0]?.values ?? {}).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {validateResult.preview.map((p) => (
                  <tr key={p.row} className="border-t border-[color:var(--border)]/60">
                    <td className="px-3 py-2 font-mono text-xs">{p.row}</td>
                    {Object.entries(p.values).map(([k, v]) => (
                      <td key={k} className="px-3 py-2">
                        {v || <span className="text-slate-400">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

