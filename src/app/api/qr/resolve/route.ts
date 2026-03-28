import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  value: z.string().min(1),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = schema.safeParse({ value: url.searchParams.get("value") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const value = parsed.data.value.trim();
  const bundleMatch = /^scouts:bundle:(.+)$/i.exec(value);
  if (bundleMatch?.[1]) {
    const bundleId = bundleMatch[1].trim();
    const bundle = await prisma.checkoutBundle.findUnique({
      where: { id: bundleId },
      select: { id: true, isActive: true },
    });
    if (bundle?.isActive) return NextResponse.json({ kind: "bundle", id: bundle.id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const equipment = await prisma.equipment.findFirst({
    where: {
      OR: [
        { qrValue: value },
        { assetId: value },
        { assetId: { equals: value, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (!equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ kind: "equipment", id: equipment.id });
}
