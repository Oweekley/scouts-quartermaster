import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function pathLabelById(nodes: { id: string; name: string; parentId: string | null }[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, string>();

  function labelFor(id: string): string {
    const cached = cache.get(id);
    if (cached) return cached;
    const parts: string[] = [];
    const seen = new Set<string>();
    let cur: string | null = id;
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const node = byId.get(cur);
      if (!node) break;
      parts.push(node.name);
      cur = node.parentId;
    }
    parts.reverse();
    const label = parts.join(" › ");
    cache.set(id, label);
    return label;
  }

  return { labelFor };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [locations, equipment] = await Promise.all([
    prisma.location.findMany({ select: { id: true, name: true, parentId: true } }),
    prisma.equipment.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        assetId: true,
        qrValue: true,
        quantity: true,
        isConsumable: true,
        status: true,
        condition: true,
        locationId: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 5_000,
    }),
  ]);

  const locationLabels = pathLabelById(locations);

  const generatedAtMs = Date.now();
  return NextResponse.json(
    {
      generatedAtMs,
      equipment: equipment.map((e) => ({
        id: e.id,
        name: e.name,
        assetId: e.assetId,
        qrValue: e.qrValue,
        quantity: e.quantity,
        isConsumable: e.isConsumable,
        status: e.status,
        condition: e.condition,
        locationLabel: e.locationId ? locationLabels.labelFor(e.locationId) : null,
        updatedAtMs: e.updatedAt.getTime(),
      })),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}
