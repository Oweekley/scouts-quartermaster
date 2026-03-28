import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser, roleAtLeast } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleAtLeast(user.role, Role.QUARTERMASTER)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const equipment = await prisma.equipment.findMany({
    where: { isActive: true },
    select: {
      assetId: true,
      name: true,
      quantity: true,
      isConsumable: true,
      minStock: true,
      serialNumber: true,
      status: true,
      condition: true,
      notes: true,
    },
    orderBy: [{ name: "asc" }],
    take: 5000,
  });

  const headers = ["assetId", "name", "quantity", "isConsumable", "minStock", "serialNumber", "status", "condition", "notes"];
  const rows = equipment.map((e) => [
    e.assetId,
    e.name,
    e.quantity,
    e.isConsumable ? "true" : "false",
    e.minStock ?? "",
    e.serialNumber ?? "",
    e.status,
    e.condition,
    e.notes ?? "",
  ]);

  const csv = toCsv(headers, rows);

  await prisma.auditLog.create({
    data: {
      action: "CSV_EXPORT",
      entityType: "Equipment",
      entityId: "all",
      actorId: user.id,
      summary: "Exported equipment CSV",
      data: { rows: equipment.length },
    },
  });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="equipment-export.csv"`,
    },
  });
}
