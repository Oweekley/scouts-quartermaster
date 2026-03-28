import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { AttachmentKind, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPresignedPutUrl } from "@/lib/storage/s3";

const schema = z.object({
  equipmentId: z.string().optional(),
  locationId: z.string().optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().min(1).max(25 * 1024 * 1024),
  kind: z.nativeEnum(AttachmentKind).optional(),
});

function sanitiseFilename(filename: string) {
  return filename.replace(/[^\w.\- ()]+/g, "_").slice(0, 120);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === Role.ADMIN || user.role === Role.QUARTERMASTER))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = (await req.json()) as unknown;
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const equipmentId = parsed.data.equipmentId?.trim();
  const locationId = parsed.data.locationId?.trim();
  if (!equipmentId && !locationId) return NextResponse.json({ error: "Missing equipmentId or locationId" }, { status: 400 });
  if (equipmentId && locationId) return NextResponse.json({ error: "Provide either equipmentId or locationId" }, { status: 400 });

  const equipment = equipmentId
    ? await prisma.equipment.findUnique({
        where: { id: equipmentId },
        select: { id: true, assetId: true },
      })
    : null;
  const location = locationId
    ? await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true, name: true },
      })
    : null;

  if (equipmentId && !equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (locationId && !location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = sanitiseFilename(parsed.data.filename);
  const kind =
    parsed.data.kind ??
    (parsed.data.mimeType.startsWith("image/") ? AttachmentKind.PHOTO : AttachmentKind.DOCUMENT);

  const safeLocation = location?.name ? location.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 80) : "";
  const storageKey = equipment
    ? `equipment/${equipment.assetId}/${nanoid(10)}-${filename}`
    : `locations/${safeLocation || location!.id}/${nanoid(10)}-${filename}`;

  const attachment = await prisma.attachment.create({
    data: {
      equipmentId: equipment?.id ?? null,
      locationId: location?.id ?? null,
      kind,
      filename,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
      storageKey,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "ATTACHMENT_ADDED",
      entityType: "Attachment",
      entityId: attachment.id,
      actorId: user.id,
      summary: equipment ? `Attachment added to ${equipment.assetId}` : `Attachment added to location ${location!.name}`,
      data: { equipmentId: equipment?.id ?? null, locationId: location?.id ?? null, filename },
    },
  });

  const uploadUrl = await createPresignedPutUrl({
    key: storageKey,
    contentType: parsed.data.mimeType,
    expiresInSeconds: 120,
  });

  return NextResponse.json({
    attachmentId: attachment.id,
    uploadUrl,
    method: "PUT",
    headers: { "Content-Type": parsed.data.mimeType },
  });
}
