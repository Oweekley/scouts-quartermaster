import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveParams } from "@/lib/next-params";

export async function PATCH(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === Role.ADMIN || user.role === Role.QUARTERMASTER))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolved = await resolveParams(ctx.params);
  const attachment = await prisma.attachment.update({
    where: { id: resolved.id },
    data: { status: "READY", completedAt: new Date() },
  });

  return NextResponse.json({ ok: true, attachmentId: attachment.id });
}
