import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

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

  const result = validateEquipmentCsv(parsed.data.csvText, parsed.data.mapping as any);
  return NextResponse.json({
    ok: result.ok,
    errors: result.errors,
    preview: result.preview,
    rowsParsed: result.parsed.length,
  });
}

