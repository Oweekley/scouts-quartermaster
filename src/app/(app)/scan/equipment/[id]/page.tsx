import Link from "next/link";
import { notFound } from "next/navigation";
import { EquipmentStatus, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { consumeOneAction } from "@/app/(app)/equipment/actions";
import { resolveParams } from "@/lib/next-params";
import { conditionLabel } from "@/lib/display";

export default async function ScanEquipmentActionsPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(Role.LEADER);
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const equipment = await prisma.equipment.findUnique({
    where: { id: resolved.id },
    select: {
      id: true,
      name: true,
      assetId: true,
      status: true,
      condition: true,
      quantity: true,
      isConsumable: true,
      isActive: true,
    },
  });
  if (!equipment || !equipment.isActive) notFound();

  const openCheckoutItems = await prisma.checkoutItem.findMany({
    where: { equipmentId: equipment.id, returnedAt: null },
    include: { checkout: true },
    orderBy: [{ checkout: { expectedReturnAt: "asc" } }, { checkout: { checkedOutAt: "asc" } }],
    take: 20,
  });

  const canReturn = openCheckoutItems.length > 0;
  const canCheckout = equipment.status !== EquipmentStatus.RETIRED;
  const canConsume = equipment.isConsumable && equipment.quantity > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scanned item</h1>
          <p className="mt-1 text-sm text-slate-600">Choose an action.</p>
        </div>
        <Link className="text-sm underline text-slate-700" href="/scan">
          Scan another
        </Link>
      </div>

      <Card>
        <CardBody className="space-y-1">
          <div className="text-xs font-mono text-slate-600">{equipment.assetId}</div>
          <div className="text-lg font-semibold text-slate-900">{equipment.name}</div>
          <div className="text-sm text-slate-600">
            {conditionLabel(equipment.condition)} · {equipment.status} · Qty {equipment.quantity}
            {equipment.isConsumable ? " · Consumable" : ""}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={canCheckout ? `/checkouts/new?itemId=${encodeURIComponent(equipment.id)}` : "#"}
          aria-disabled={!canCheckout}
          className={[
            "block rounded-xl border border-[color:var(--border)] bg-[color:var(--primary)] px-4 py-5 text-center text-lg font-semibold text-white shadow-sm transition active:scale-[0.99]",
            !canCheckout ? "pointer-events-none opacity-50" : "hover:brightness-95",
          ].join(" ")}
        >
          Checkout
        </Link>

        <Link
          href={canReturn ? `/scan/equipment/${encodeURIComponent(equipment.id)}/return` : "#"}
          aria-disabled={!canReturn}
          className={[
            "block rounded-xl border border-[color:var(--border)] bg-white px-4 py-5 text-center text-lg font-semibold text-slate-900 shadow-sm transition active:scale-[0.99]",
            canReturn ? "hover:bg-slate-50" : "pointer-events-none opacity-50",
          ].join(" ")}
        >
          Return
          <div className="mt-1 text-xs font-normal text-slate-600">
            {canReturn ? `${openCheckoutItems.length} open checkout(s)` : "Not currently checked out"}
          </div>
        </Link>

        <form action={consumeOneAction}>
          <input type="hidden" name="equipmentId" value={equipment.id} />
          <Button type="submit" variant="secondary" disabled={!canConsume} className="h-[72px] w-full text-lg">
            Consume 1
          </Button>
        </form>

        <Link
          href={`/maintenance/new?equipmentId=${encodeURIComponent(equipment.id)}&title=${encodeURIComponent(`Damage report: ${equipment.assetId}`)}`}
          className="block rounded-xl border border-red-200 bg-red-600 px-4 py-5 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99]"
        >
          Report damage
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link className="underline text-slate-700" href={`/equipment/${equipment.id}`}>
          View item
        </Link>
        <div className="flex items-center gap-3">
          <Link className="underline text-slate-700" href="/scan">
            Scan next
          </Link>
          <Link className="underline text-slate-700" href="/home">
            Quick actions
          </Link>
        </div>
      </div>
    </div>
  );
}
