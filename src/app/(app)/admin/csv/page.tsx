import { Role } from "@prisma/client";

import { requireRole } from "@/lib/auth";
import { EquipmentCsvWizard } from "./ui/equipment-csv-wizard";

export default async function CsvAdminPage() {
  await requireRole(Role.QUARTERMASTER);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">CSV import/export</h1>
        <p className="mt-1 text-sm text-slate-600">Mapping wizard with validation preview (equipment).</p>
      </div>

      <EquipmentCsvWizard />
    </div>
  );
}

