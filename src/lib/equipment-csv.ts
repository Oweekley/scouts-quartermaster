import { EquipmentCondition, EquipmentStatus } from "@prisma/client";
import { z } from "zod";

import { parseCsv } from "@/lib/csv";

export type EquipmentCsvMapping = {
  assetId: string;
  name: string;
  quantity?: string;
  isConsumable?: string;
  minStock?: string;
  serialNumber?: string;
  status?: string;
  condition?: string;
  notes?: string;
};

export type EquipmentCsvRow = {
  assetId: string;
  name: string;
  quantity: number;
  isConsumable: boolean;
  minStock: number | null;
  serialNumber: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  notes: string | null;
};

export type EquipmentCsvValidation = {
  ok: boolean;
  errors: { row: number; message: string }[];
  preview: { row: number; values: Record<string, string> }[];
  parsed: EquipmentCsvRow[];
};

function normalizeHeader(v: string) {
  return v.trim();
}

function cellByHeader(headers: string[], row: string[], headerName: string | undefined) {
  if (!headerName) return "";
  const idx = headers.findIndex((h) => normalizeHeader(h).toLowerCase() === normalizeHeader(headerName).toLowerCase());
  if (idx < 0) return "";
  return String(row[idx] ?? "").trim();
}

function parseBool(raw: string) {
  const v = raw.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes" || v === "y";
}

function parseIntSafe(raw: string, fallback: number) {
  const v = raw.trim();
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function parseEnumInsensitive<T extends Record<string, string>>(raw: string, values: T, fallback: T[keyof T]) {
  const v = raw.trim();
  if (!v) return fallback;
  const found = Object.values(values).find((x) => String(x).toLowerCase() === v.toLowerCase());
  return (found as T[keyof T]) ?? fallback;
}

const mappingSchema = z.object({
  assetId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string().optional(),
  isConsumable: z.string().optional(),
  minStock: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.string().optional(),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

export function validateEquipmentCsv(csvText: string, mapping: EquipmentCsvMapping): EquipmentCsvValidation {
  const parsedMapping = mappingSchema.safeParse(mapping);
  if (!parsedMapping.success) {
    return { ok: false, errors: [{ row: 0, message: "Invalid mapping." }], preview: [], parsed: [] };
  }

  const { headers, rows } = parseCsv(csvText);
  const errors: { row: number; message: string }[] = [];
  const preview: { row: number; values: Record<string, string> }[] = [];
  const parsed: EquipmentCsvRow[] = [];

  if (headers.length === 0) {
    return { ok: false, errors: [{ row: 0, message: "No CSV headers found." }], preview: [], parsed: [] };
  }

  const headerSet = new Set(headers.map((h) => normalizeHeader(h).toLowerCase()));
  for (const [key, headerName] of Object.entries(parsedMapping.data)) {
    if (!headerName) continue;
    if (!headerSet.has(normalizeHeader(headerName).toLowerCase())) {
      errors.push({ row: 0, message: `Mapping for ${key} points to missing column "${headerName}".` });
    }
  }

  const takePreview = 20;

  for (let idx = 0; idx < rows.length; idx++) {
    const rowNumber = idx + 2; // 1-based lines, + header
    const row = rows[idx] ?? [];

    const assetId = cellByHeader(headers, row, parsedMapping.data.assetId);
    const name = cellByHeader(headers, row, parsedMapping.data.name);
    const rawQty = cellByHeader(headers, row, parsedMapping.data.quantity);
    const rawConsumable = cellByHeader(headers, row, parsedMapping.data.isConsumable);
    const rawMinStock = cellByHeader(headers, row, parsedMapping.data.minStock);
    const serialNumber = cellByHeader(headers, row, parsedMapping.data.serialNumber);
    const rawStatus = cellByHeader(headers, row, parsedMapping.data.status);
    const rawCondition = cellByHeader(headers, row, parsedMapping.data.condition);
    const notes = cellByHeader(headers, row, parsedMapping.data.notes);

    if (!assetId) errors.push({ row: rowNumber, message: "Missing assetId." });
    if (!name) errors.push({ row: rowNumber, message: "Missing name." });

    const quantity = parseIntSafe(rawQty, 1);
    if (quantity < 0) errors.push({ row: rowNumber, message: "Quantity must be 0 or more." });

    let minStock: number | null = null;
    if (rawMinStock.trim().length > 0) {
      minStock = parseIntSafe(rawMinStock, NaN);
      if (!Number.isFinite(minStock)) errors.push({ row: rowNumber, message: "Min stock must be a number." });
      else if (minStock < 0) errors.push({ row: rowNumber, message: "Min stock must be 0 or more." });
    }

    const isConsumable = parseBool(rawConsumable);
    const status = parseEnumInsensitive(rawStatus, EquipmentStatus, EquipmentStatus.AVAILABLE);
    const condition = parseEnumInsensitive(rawCondition, EquipmentCondition, EquipmentCondition.GOOD);

    const values: Record<string, string> = {
      assetId,
      name,
      quantity: String(quantity),
      isConsumable: String(isConsumable),
      minStock: minStock === null ? "" : String(minStock),
      serialNumber,
      status,
      condition,
      notes,
    };
    if (preview.length < takePreview) preview.push({ row: rowNumber, values });

    parsed.push({
      assetId,
      name,
      quantity,
      isConsumable,
      minStock: Number.isFinite(minStock as number) ? (minStock as number) : null,
      serialNumber: serialNumber || null,
      status,
      condition,
      notes: notes || null,
    });
  }

  const ok = errors.length === 0;
  return { ok, errors, preview, parsed };
}

