import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { EquipmentForm } from "../ui/equipment-form";

export default async function NewEquipmentPage() {
  await requireRole(Role.QUARTERMASTER);

  const [categories, types, locations] = await Promise.all([
    prisma.equipmentCategory.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.equipmentType.findMany({ orderBy: [{ name: "asc" }], include: { fields: { orderBy: [{ sortOrder: "asc" }] } } }),
    prisma.location.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Add equipment</h1>
        <p className="mt-1 text-sm text-slate-600">Create a new asset record.</p>
      </div>
      <EquipmentForm categories={categories} types={types} locations={locations} />
    </div>
  );
}
