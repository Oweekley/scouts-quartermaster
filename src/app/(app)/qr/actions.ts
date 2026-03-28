"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  qr: z.string().min(1),
});

export async function qrLookupAction(formData: FormData) {
  await requireUser();
  const parsed = schema.safeParse({ qr: String(formData.get("qr") ?? "") });
  if (!parsed.success) throw new Error("Enter a QR value.");

  const qr = parsed.data.qr.trim();
  const bundleMatch = /^scouts:bundle:(.+)$/i.exec(qr);
  if (bundleMatch?.[1]) {
    const bundleId = bundleMatch[1].trim();
    const bundle = await prisma.checkoutBundle.findUnique({
      where: { id: bundleId },
      select: { id: true, isActive: true },
    });
    if (!bundle?.isActive) throw new Error("No matching bundle found.");
    redirect(`/checkouts/new?bundleId=${encodeURIComponent(bundle.id)}`);
  }

  const equipment = await prisma.equipment.findFirst({
    where: {
      OR: [{ qrValue: qr }, { assetId: qr }, { assetId: { equals: qr, mode: "insensitive" } }],
    },
    select: { id: true },
  });

  if (!equipment) throw new Error("No matching equipment found.");
  redirect(`/equipment/${equipment.id}`);
}
