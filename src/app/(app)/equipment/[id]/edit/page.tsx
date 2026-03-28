import { Role } from "@prisma/client";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { EquipmentForm } from "../../ui/equipment-form";
import { resolveParams } from "@/lib/next-params";

export default async function EditEquipmentPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireRole(Role.QUARTERMASTER);
  const { id } = await resolveParams(params);
  if (!id) notFound();

  const [equipment, categories, types, locations] = await Promise.all([
    prisma.equipment.findUnique({
      where: { id },
      include: {
        customFieldValues: { include: { fieldDefinition: true } },
      },
    }),
    prisma.equipmentCategory.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.equipmentType.findMany({ orderBy: [{ name: "asc" }], include: { fields: { orderBy: [{ sortOrder: "asc" }] } } }),
    prisma.location.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  if (!equipment) notFound();

  const mapped = {
    id: equipment.id,
    name: equipment.name,
    assetId: equipment.assetId,
    qrValue: equipment.qrValue,
    description: equipment.description,
    categoryId: equipment.categoryId,
    typeId: equipment.typeId,
    quantity: equipment.quantity,
    isConsumable: equipment.isConsumable,
    minStock: equipment.minStock,
    serialNumber: equipment.serialNumber,
    status: equipment.status,
    condition: equipment.condition,
    purchaseDate: equipment.purchaseDate?.toISOString() ?? null,
    warrantyExpiry: equipment.warrantyExpiry?.toISOString() ?? null,
    value: equipment.value ? String(equipment.value) : null,
    notes: equipment.notes,
    locationId: equipment.locationId,
    assignedSection: equipment.assignedSection,
    isActive: equipment.isActive,
    customFieldValues: equipment.customFieldValues.map((v) => ({
      fieldDefinitionId: v.fieldDefinitionId,
      fieldDefinitionKey: v.fieldDefinition.key,
      valueJson: v.valueJson,
    })),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Edit equipment</h1>
        <p className="mt-1 text-sm text-slate-600">{equipment.assetId}</p>
      </div>
      <EquipmentForm categories={categories} types={types} locations={locations} equipment={mapped} />
    </div>
  );
}
