import { NextResponse } from "next/server";
import { EquipmentStatus, MaintenanceStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const soon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3);

  const [overdueReturns, dueSoonReturns, lowStock, maintenanceDue] = await Promise.all([
    prisma.checkoutItem.count({
      where: { returnedAt: null, checkout: { status: "OPEN", expectedReturnAt: { lt: now } } },
    }),
    prisma.checkoutItem.count({
      where: { returnedAt: null, checkout: { status: "OPEN", expectedReturnAt: { gte: now, lte: soon } } },
    }),
    prisma.equipment.findMany({
      where: { isActive: true, minStock: { not: null }, status: { not: EquipmentStatus.RETIRED } },
      select: { quantity: true, minStock: true },
      take: 5_000,
    }),
    prisma.maintenanceIssue.count({
      where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] }, dueAt: { not: null, lte: soon } },
    }),
  ]);

  const lowStockCount = lowStock.filter((e) => e.minStock !== null && e.quantity <= e.minStock).length;
  const total = overdueReturns + dueSoonReturns + lowStockCount + maintenanceDue;

  return NextResponse.json(
    {
      total,
      overdueReturns,
      dueSoonReturns,
      lowStock: lowStockCount,
      maintenanceDue,
      generatedAtMs: now.getTime(),
    },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
