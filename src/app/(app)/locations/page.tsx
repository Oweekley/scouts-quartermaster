import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocationAction, updateLocationAction } from "./actions";
import Link from "next/link";

type TreeNode = {
  id: string;
  name: string;
  notes: string | null;
  children: TreeNode[];
};

function buildTree(nodes: { id: string; name: string; notes: string | null; parentId: string | null }[]) {
  const byId = new Map<string, TreeNode>();
  for (const n of nodes) byId.set(n.id, { id: n.id, name: n.name, notes: n.notes, children: [] });
  const roots: TreeNode[] = [];
  for (const n of nodes) {
    const node = byId.get(n.id)!;
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function LocationNode({ node, depth, canManage }: { node: TreeNode; depth: number; canManage: boolean }) {
  return (
    <div className="rounded-md border border-[color:var(--border)]/60 bg-white p-3" style={{ marginLeft: depth * 12 }}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium text-slate-900">
            <Link className="hover:underline" href={`/locations/${node.id}`}>
              {node.name}
            </Link>
          </div>
          {node.notes ? <div className="mt-0.5 text-sm text-slate-600">{node.notes}</div> : null}
        </div>
        {canManage ? (
          <form action={updateLocationAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={node.id} />
            <Input name="name" defaultValue={node.name} className="w-[180px]" />
            <Input
              name="notes"
              defaultValue={node.notes ?? ""}
              className="w-[220px]"
              placeholder="Notes (optional)"
            />
            <Button type="submit" variant="secondary" size="sm">
              Save
            </Button>
          </form>
        ) : null}
      </div>
      {node.children.length ? (
        <div className="mt-3 space-y-2">
          {node.children
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <LocationNode key={child.id} node={child} depth={depth + 1} canManage={canManage} />
            ))}
        </div>
      ) : null}
    </div>
  );
}

export default async function LocationsPage() {
  const user = await requireUser();
  const canManage = roleAtLeast(user.role, Role.QUARTERMASTER);

  const locations = await prisma.location.findMany({
    orderBy: [{ name: "asc" }],
  });
  const tree = buildTree(locations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Locations</h1>
        <p className="mt-1 text-sm text-slate-600">Where kit is stored (with optional hierarchy).</p>
      </div>

      {canManage ? (
        <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <h2 className="font-medium text-slate-900">Add location</h2>
          <form action={createLocationAction} className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="parentId">Parent</Label>
              <select
                id="parentId"
                name="parentId"
                className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm"
                defaultValue=""
              >
                <option value="">—</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="md:col-span-4">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-3">
        {tree
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((node) => (
            <LocationNode key={node.id} node={node} depth={0} canManage={canManage} />
          ))}
      </div>
    </div>
  );
}
