import { EquipmentCondition, EquipmentStatus } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveParams } from "@/lib/next-params";
import { EquipmentListClient } from "./ui/equipment-list-client";

type FlatOption = { id: string; label: string };

function flattenTree(nodes: { id: string; name: string; parentId: string | null }[]): FlatOption[] {
  const childrenByParent = new Map<string | null, { id: string; name: string; parentId: string | null }[]>();
  for (const n of nodes) {
    const list = childrenByParent.get(n.parentId ?? null) ?? [];
    list.push(n);
    childrenByParent.set(n.parentId ?? null, list);
  }
  for (const [, list] of childrenByParent) list.sort((a, b) => a.name.localeCompare(b.name));

  const out: FlatOption[] = [];
  function walk(parentId: string | null, depth: number) {
    const kids = childrenByParent.get(parentId) ?? [];
    for (const k of kids) {
      const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
      out.push({ id: k.id, label: `${prefix}${k.name}` });
      walk(k.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}

function pathLabelById(nodes: { id: string; name: string; parentId: string | null }[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cache = new Map<string, string>();

  function labelFor(id: string): string {
    const cached = cache.get(id);
    if (cached) return cached;
    const parts: string[] = [];
    const seen = new Set<string>();
    let cur: string | null = id;
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const node = byId.get(cur);
      if (!node) break;
      parts.push(node.name);
      cur = node.parentId;
    }
    parts.reverse();
    const label = parts.join(" › ");
    cache.set(id, label);
    return label;
  }

  return { labelFor };
}

function descendantIds(
  rootId: string,
  nodes: { id: string; parentId: string | null }[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n.id);
    childrenByParent.set(n.parentId, list);
  }
  const result = new Set<string>();
  const queue: string[] = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    if (result.has(id)) continue;
    result.add(id);
    const kids = childrenByParent.get(id) ?? [];
    for (const k of kids) queue.push(k);
  }
  return Array.from(result);
}

export default async function EquipmentListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await resolveParams(searchParams);

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? (params.status as EquipmentStatus) : undefined;
  const condition = typeof params.condition === "string" ? (params.condition as EquipmentCondition) : undefined;
  const locationId = typeof params.locationId === "string" ? params.locationId : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const typeId = typeof params.typeId === "string" ? params.typeId : undefined;
  const page = typeof params.page === "string" ? Math.max(1, Number(params.page) || 1) : 1;
  const pageSize = 50;

  const [locations, categories, types] = await Promise.all([
    prisma.location.findMany({ select: { id: true, name: true, parentId: true }, orderBy: [{ name: "asc" }] }),
    prisma.equipmentCategory.findMany({ select: { id: true, name: true, parentId: true }, orderBy: [{ name: "asc" }] }),
    prisma.equipmentType.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }] }),
  ]);

  const locationIds = locationId ? descendantIds(locationId, locations) : undefined;
  const categoryIds = categoryId ? descendantIds(categoryId, categories) : undefined;
  const locationLabels = pathLabelById(locations);

  const equipment = await prisma.equipment.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { assetId: { contains: q, mode: "insensitive" } },
                { qrValue: { contains: q, mode: "insensitive" } },
                { serialNumber: { contains: q, mode: "insensitive" } },
                { category: { name: { contains: q, mode: "insensitive" } } },
                { type: { name: { contains: q, mode: "insensitive" } } },
                { location: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(condition ? { condition } : {}),
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
        ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
        ...(typeId ? { typeId } : {}),
      },
      select: {
        id: true,
        name: true,
        assetId: true,
        qrValue: true,
        quantity: true,
        locationId: true,
        status: true,
        condition: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

  const locationOptions = flattenTree(locations);
  const categoryOptions = flattenTree(categories);

  return (
    <EquipmentListClient
      userRole={user.role}
      locations={locationOptions}
      categories={categoryOptions}
      types={types.map((t) => ({ id: t.id, name: t.name }))}
      rows={equipment.map((e) => ({
        id: e.id,
        name: e.name,
        assetId: e.assetId,
        qrValue: e.qrValue,
        quantity: e.quantity,
        locationLabel: e.locationId ? locationLabels.labelFor(e.locationId) : null,
        status: e.status,
        condition: e.condition,
        updatedAtRelative: formatDistanceToNowStrict(e.updatedAt, { addSuffix: true }),
        categoryName: e.category?.name ?? null,
        typeName: e.type?.name ?? null,
      }))}
      initial={{
        q,
        status: status ?? "",
        condition: condition ?? "",
        locationId: locationId ?? "",
        categoryId: categoryId ?? "",
        typeId: typeId ?? "",
        page,
        pageSize,
      }}
    />
  );
}
