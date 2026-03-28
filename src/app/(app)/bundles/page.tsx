import Link from "next/link";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBundleAction, updateBundleAction } from "./actions";

export default async function BundlesPage() {
  await requireRole(Role.QUARTERMASTER);

  const bundles = await prisma.checkoutBundle.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Checkout bundles</h1>
        <p className="mt-1 text-sm text-slate-600">Create camp kits (e.g. Campfire kit) to add multiple items to a checkout in one click.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add bundle</h2>
        <form action={createBundleAction} className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Campfire kit" required />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional notes (where it lives, what it’s for…)" />
          </div>
          <div className="flex items-end md:col-span-1">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Existing bundles</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr className="[&>th]:py-2 [&>th]:pr-4">
                <th>Name</th>
                <th>Items</th>
                <th>Status</th>
                <th className="w-[560px]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {bundles.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 [&>td]:py-2 [&>td]:pr-4">
                  <td className="whitespace-nowrap">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-slate-600">{b.description ?? "—"}</div>
                    <div className="mt-1">
                      <Link className="text-xs underline text-slate-700" href={`/bundles/${b.id}`}>
                        Edit items →
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{b._count.items}</td>
                  <td className="whitespace-nowrap">{b.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <form action={updateBundleAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="bundleId" value={b.id} />
                      <Input name="name" defaultValue={b.name} className="w-[200px]" />
                      <Input name="description" defaultValue={b.description ?? ""} className="w-[260px]" />
                      <select
                        name="isActive"
                        defaultValue={String(b.isActive)}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {bundles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-600">
                    No bundles yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

