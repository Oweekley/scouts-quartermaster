import { format } from "date-fns";
import { EquipmentStatus, MaintenanceStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export type WeeklyDigest = {
  subject: string;
  text: string;
};

function line(items: string[]) {
  return items.filter(Boolean).join("\n");
}

export async function buildWeeklyDigest(now = new Date()): Promise<WeeklyDigest> {
  const soon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const [overdueReturns, dueSoonReturns, lowStock, maintenanceDue] = await Promise.all([
    prisma.checkoutItem.findMany({
      where: { returnedAt: null, checkout: { status: "OPEN", expectedReturnAt: { lt: now } } },
      include: { equipment: true, checkout: true },
      orderBy: [{ checkout: { expectedReturnAt: "asc" } }],
      take: 50,
    }),
    prisma.checkoutItem.findMany({
      where: { returnedAt: null, checkout: { status: "OPEN", expectedReturnAt: { gte: now, lte: soon } } },
      include: { equipment: true, checkout: true },
      orderBy: [{ checkout: { expectedReturnAt: "asc" } }],
      take: 50,
    }),
    prisma.equipment.findMany({
      where: { isActive: true, minStock: { not: null }, status: { not: EquipmentStatus.RETIRED } },
      select: { id: true, name: true, assetId: true, quantity: true, minStock: true },
      orderBy: [{ quantity: "asc" }, { name: "asc" }],
      take: 80,
    }),
    prisma.maintenanceIssue.findMany({
      where: {
        status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] },
        dueAt: { not: null, lte: soon },
      },
      include: { equipment: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 80,
    }),
  ]);

  const lowFiltered = lowStock.filter((e) => e.minStock !== null && e.quantity <= e.minStock);

  const subject = `Scout Quartermaster weekly digest (${format(now, "dd MMM yyyy")})`;

  const overdueLines = overdueReturns.map((i) => {
    const due = i.checkout.expectedReturnAt ? format(i.checkout.expectedReturnAt, "dd MMM") : "—";
    return `- OVERDUE (${due}): ${i.equipment.assetId} ${i.equipment.name} · ${i.checkout.borrowerName}`;
  });

  const dueSoonLines = dueSoonReturns.map((i) => {
    const due = i.checkout.expectedReturnAt ? format(i.checkout.expectedReturnAt, "dd MMM") : "—";
    return `- DUE SOON (${due}): ${i.equipment.assetId} ${i.equipment.name} · ${i.checkout.borrowerName}`;
  });

  const lowLines = lowFiltered.map((e) => `- LOW STOCK: ${e.assetId} ${e.name} · qty ${e.quantity} (min ${e.minStock})`);

  const maintenanceLines = maintenanceDue.map((m) => {
    const due = m.dueAt ? format(m.dueAt, "dd MMM") : "—";
    return `- MAINTENANCE (${due}): ${m.equipment.assetId} · ${m.title} · ${m.status}`;
  });

  const text = line([
    "Weekly digest",
    "",
    `Generated: ${format(now, "PPpp")}`,
    "",
    `Overdue returns (${overdueLines.length})`,
    overdueLines.length ? overdueLines.join("\n") : "- None",
    "",
    `Due soon (next 7 days) (${dueSoonLines.length})`,
    dueSoonLines.length ? dueSoonLines.join("\n") : "- None",
    "",
    `Maintenance due (next 7 days) (${maintenanceLines.length})`,
    maintenanceLines.length ? maintenanceLines.join("\n") : "- None",
    "",
    `Low stock (${lowLines.length})`,
    lowLines.length ? lowLines.join("\n") : "- None",
    "",
    "—",
    "Tip: open /today for the live urgency list.",
  ]);

  return { subject, text };
}

export function buildCheckoutNudge({
  borrowerName,
  expectedReturnAt,
  items,
  appBaseUrl,
  checkoutId,
}: {
  borrowerName: string;
  expectedReturnAt: Date | null;
  items: { assetId: string; name: string; quantity: number }[];
  appBaseUrl?: string | null;
  checkoutId: string;
}) {
  const due = expectedReturnAt ? format(expectedReturnAt, "EEE d MMM") : null;
  const itemLines = items.map((i) => `- ${i.assetId} ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join("\n");
  const link = appBaseUrl ? `${appBaseUrl.replace(/\/$/, "")}/checkouts/${checkoutId}` : null;

  return line([
    `Hi ${borrowerName} — quick reminder to return the kit when you can${due ? ` (due ${due})` : ""}.`,
    "",
    "Items:",
    itemLines || "- (no items?)",
    link ? "" : "",
    link ? `Details: ${link}` : "",
    "",
    "Thanks!",
  ]);
}
