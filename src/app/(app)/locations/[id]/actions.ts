"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  locationId: z.string().min(1),
  label: z.string().min(1),
  x: z.coerce.number().min(0).max(1),
  y: z.coerce.number().min(0).max(1),
  w: z.coerce.number().min(0.02).max(1),
  h: z.coerce.number().min(0.02).max(1),
  targetLocationId: z.string().optional(),
});

export async function createHotspotAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = createSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    label: String(formData.get("label") ?? ""),
    x: formData.get("x") ?? 0,
    y: formData.get("y") ?? 0,
    w: formData.get("w") ?? 0.2,
    h: formData.get("h") ?? 0.2,
    targetLocationId: formData.get("targetLocationId") ? String(formData.get("targetLocationId")) : undefined,
  });
  if (!parsed.success) throw new Error("Check the form fields.");

  await prisma.locationHotspot.create({
    data: {
      locationId: parsed.data.locationId,
      label: parsed.data.label,
      x: parsed.data.x,
      y: parsed.data.y,
      w: parsed.data.w,
      h: parsed.data.h,
      targetLocationId: parsed.data.targetLocationId?.trim() ? parsed.data.targetLocationId : null,
    },
  });

  revalidatePath(`/locations/${parsed.data.locationId}`);
}

const deleteSchema = z.object({
  locationId: z.string().min(1),
  hotspotId: z.string().min(1),
});

export async function deleteHotspotAction(formData: FormData) {
  await requireRole(Role.QUARTERMASTER);

  const parsed = deleteSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    hotspotId: String(formData.get("hotspotId") ?? ""),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  await prisma.locationHotspot.delete({
    where: { id: parsed.data.hotspotId },
  });

  revalidatePath(`/locations/${parsed.data.locationId}`);
}

