import { AttachmentKind, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { updateRequiredDocsAction } from "./actions";

const docKinds: AttachmentKind[] = [AttachmentKind.MANUAL, AttachmentKind.WARRANTY, AttachmentKind.RISK_ASSESSMENT];

export default async function EquipmentTypesAdminPage() {
  await requireRole(Role.QUARTERMASTER);

  const types = await prisma.equipmentType.findMany({
    orderBy: [{ name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Equipment types</h1>
        <p className="mt-1 text-sm text-slate-600">Configure required documents per type.</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Required docs</div>
          <div className="text-sm text-slate-600">{types.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--topbar)] text-left text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>Type</th>
                  {docKinds.map((k) => (
                    <th key={k}>{k.replace(/_/g, " ")}</th>
                  ))}
                  <th className="w-[140px]"></th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {types.map((t) => {
                  const requiredDocs = Array.isArray((t as unknown as { requiredDocs?: unknown }).requiredDocs)
                    ? (((t as unknown as { requiredDocs?: unknown }).requiredDocs as unknown[]).filter((v) => typeof v === "string") as string[])
                    : [];
                  const set = new Set(requiredDocs);

                  return (
                    <tr key={t.id} className="border-t border-[color:var(--border)]/60">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.name}</div>
                        <div className="mt-0.5 text-xs text-slate-600">{t.description ?? "—"}</div>
                      </td>
                      <td colSpan={docKinds.length + 2} className="px-4 py-3">
                        <form action={updateRequiredDocsAction} className="flex flex-wrap items-center gap-4">
                          <input type="hidden" name="typeId" value={t.id} />
                          {docKinds.map((k) => (
                            <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" name="requiredDocs" value={k} defaultChecked={set.has(k)} />
                              {k.replace(/_/g, " ")}
                            </label>
                          ))}
                          <Button type="submit" variant="secondary">
                            Save
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={docKinds.length + 2} className="px-4 py-8 text-center text-slate-600">
                      No types yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

