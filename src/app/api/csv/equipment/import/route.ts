import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser, roleAtLeast } from "@/lib/auth";
import { validateEquipmentCsv } from "@/lib/equipment-csv";

const schema = z.object({
  csvText: z.string().min(1),
  mapping: z.record(z.string(), z.string().optional()),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleAtLeast(user.role, Role.QUARTERMASTER)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const validated = validateEquipmentCsv(parsed.data.csvText, parsed.data.mapping as any);
  if (!validated.ok) return NextResponse.json({ error: "Validation failed", errors: validated.errors }, { status: 400 });

  const rows = validated.parsed;
  const assetIds = Array.from(new Set(rows.map((r) => r.assetId.trim()).filter(Boolean)));

  const existing = await prisma.equipment.findMany({
    where: { assetId: { in: assetIds } },
    select: { id: true, assetId: true },
  });
  const existingByAssetId = new Map(existing.map((e) => [e.assetId, e.id]));

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;

    for (const r of rows) {
      const assetId = r.assetId.trim();
      const existingId = existingByAssetId.get(assetId);

      if (existingId) {
        await tx.equipment.update({
          where: { id: existingId },
          data: {
            name: r.name,
            quantity: r.quantity,
            isConsumable: r.isConsumable,
            minStock: r.minStock,
            serialNumber: r.serialNumber,
            status: r.status,
            condition: r.condition,
            notes: r.notes,
            updatedById: user.id,
          },
        });
        updated += 1;
      } else {
        const qrValue = `scouts:${assetId}`;
        const createdRow = await tx.equipment.create({
          data: {
            assetId,
            qrValue,
            name: r.name,
            quantity: r.quantity,
            isConsumable: r.isConsumable,
            minStock: r.minStock,
            serialNumber: r.serialNumber,
            status: r.status,
            condition: r.condition,
            notes: r.notes,
            isActive: true,
            createdById: user.id,
            updatedById: user.id,
          },
          select: { id: true },
        });
        existingByAssetId.set(assetId, createdRow.id);
        created += 1;
      }
    }

    await tx.auditLog.create({
      data: {
        action: "CSV_IMPORT",
        entityType: "CsvImport",
        entityId: "equipment",
        actorId: user.id,
        summary: `CSV import: ${created} created, ${updated} updated`,
        data: { created, updated, rows: rows.length },
      },
    });

    return { created, updated, rows: rows.length };
  });

  return NextResponse.json({ ok: true, ...result });
}
