import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { resolveParams } from "@/lib/next-params";

export default async function ScanBundlePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(Role.LEADER);
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const bundle = await prisma.checkoutBundle.findUnique({
    where: { id: resolved.id },
    select: { id: true, isActive: true },
  });
  if (!bundle || !bundle.isActive) notFound();

  redirect(`/checkouts/new?bundleId=${encodeURIComponent(bundle.id)}`);
}

