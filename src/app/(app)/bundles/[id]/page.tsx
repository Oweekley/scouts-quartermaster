import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { resolveParams } from "@/lib/next-params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBundleItemAction, removeBundleItemAction } from "../actions";
import Link from "next/link";

export default async function BundleDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(Role.QUARTERMASTER);

  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const [bundle, equipment] = await Promise.all([
    prisma.checkoutBundle.findUnique({
      where: { id: resolved.id },
      include: {
        items: { include: { equipment: { select: { id: true, name: true, assetId: true, quantity: true, status: true } } }, orderBy: [{ equipment: { name: "asc" } }] },
      },
    }),
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, name: true, assetId: true, quantity: true, status: true },
      orderBy: [{ name: "asc" }],
      take: 500,
    }),
  ]);

  if (!bundle) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{bundle.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{bundle.description ?? "Checkout bundle items."}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline text-slate-700" href={`/labels/bundle/${bundle.id}`}>
            Print kit label
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add / update item</h2>
        <form action={addBundleItemAction} className="mt-3 grid gap-3 md:grid-cols-6">
          <input type="hidden" name="bundleId" value={bundle.id} />
          <div className="space-y-1 md:col-span-4">
            <Label htmlFor="equipmentId">Equipment</Label>
            <select
              id="equipmentId"
              name="equipmentId"
              defaultValue=""
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              required
            >
              <option value="" disabled>
                Select…
              </option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.assetId})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="quantity">Qty</Label>
            <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
          </div>
          <div className="flex items-end md:col-span-1">
            <Button type="submit">Save</Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-600">If the item already exists in the bundle, saving updates its quantity.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr className="[&>th]:px-4 [&>th]:py-3">
              <th>Item</th>
              <th>Asset</th>
              <th className="text-right">Bundle qty</th>
              <th className="text-right">In stock</th>
              <th className="w-[160px]"></th>
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {bundle.items.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{i.equipment.name}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{i.equipment.assetId}</td>
                <td className="px-4 py-3 text-right tabular-nums">{i.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{i.equipment.quantity}</td>
                <td className="px-4 py-3 text-right">
                  <form action={removeBundleItemAction}>
                    <input type="hidden" name="bundleId" value={bundle.id} />
                    <input type="hidden" name="bundleItemId" value={i.id} />
                    <Button type="submit" variant="secondary">
                      Remove
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {bundle.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                  No items in this bundle yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
