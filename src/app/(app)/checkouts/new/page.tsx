import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { CheckoutForm } from "./ui/checkout-form";
import { resolveParams } from "@/lib/next-params";

export default async function NewCheckoutPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(Role.LEADER);
  const resolved = await resolveParams(searchParams);
  const itemId = typeof resolved.itemId === "string" ? resolved.itemId : undefined;
  const bundleId = typeof resolved.bundleId === "string" ? resolved.bundleId : undefined;

  const [equipment, users, sections, bundles] = await Promise.all([
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, assetId: true, quantity: true, status: true },
      orderBy: [{ name: "asc" }],
      take: 500,
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ name: "asc" }] }),
    prisma.section.findMany({
      where: { isActive: true },
      select: { id: true, name: true, meetingDay: true },
      orderBy: [{ name: "asc" }],
      take: 100,
    }),
    prisma.checkoutBundle.findMany({
      where: { isActive: true },
      select: { id: true, name: true, items: { select: { equipmentId: true, quantity: true } } },
      orderBy: [{ name: "asc" }],
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New checkout</h1>
        <p className="mt-1 text-sm text-slate-600">Check out one or more items.</p>
      </div>
      <CheckoutForm
        equipment={equipment}
        users={users}
        sections={sections}
        bundles={bundles}
        initialEquipmentId={itemId}
        initialBundleId={bundleId}
      />
    </div>
  );
}
