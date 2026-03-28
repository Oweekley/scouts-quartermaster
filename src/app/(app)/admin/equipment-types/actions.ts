"use server";

import { z } from "zod";
import { AttachmentKind, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const schema = z.object({
  typeId: z.string().min(1),
  requiredDocs: z.array(z.nativeEnum(AttachmentKind)).default([]),
});

export async function updateRequiredDocsAction(formData: FormData) {
  const actor = await requireRole(Role.QUARTERMASTER);

  const parsed = schema.safeParse({
    typeId: String(formData.get("typeId") ?? ""),
    requiredDocs: formData.getAll("requiredDocs").map((v) => String(v)),
  });
  if (!parsed.success) throw new Error("Invalid request.");

  await prisma.equipmentType.update({
    where: { id: parsed.data.typeId },
    data: { requiredDocs: parsed.data.requiredDocs.length ? parsed.data.requiredDocs : Prisma.DbNull },
  });

  await prisma.auditLog.create({
    data: {
      action: "EQUIPMENT_TYPE_UPDATED",
      entityType: "EquipmentType",
      entityId: parsed.data.typeId,
      actorId: actor.id,
      summary: "Updated required docs",
      data: { requiredDocs: parsed.data.requiredDocs },
    },
  });

  revalidatePath("/admin/equipment-types");
  revalidatePath("/equipment");
}
