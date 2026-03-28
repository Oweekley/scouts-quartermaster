import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPresignedGetUrl } from "@/lib/storage/s3";
import { resolveParams } from "@/lib/next-params";

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveParams(ctx.params);
  const attachment = await prisma.attachment.findUnique({
    where: { id: resolved.id },
    include: { equipment: true, location: true },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // All authenticated users can view attachments for now (same as viewing equipment).
  const url = await createPresignedGetUrl({ key: attachment.storageKey, expiresInSeconds: 120 });
  return NextResponse.redirect(url);
}
