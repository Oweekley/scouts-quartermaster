import { DayOfWeek, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meetingDayLabel, sectionDisplayName } from "@/lib/sections";
import { createSectionAction, updateSectionAction } from "./actions";

export default async function SectionsPage() {
  await requireRole(Role.LEADER);

  const sections = await prisma.section.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sections</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure section names and the usual hall night (for reference only — it doesn’t limit checkout due dates).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add section</h2>
        <form action={createSectionAction} className="mt-3 grid gap-3 md:grid-cols-5">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Cubs" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meetingDay">Hall night</Label>
            <select
              id="meetingDay"
              name="meetingDay"
              defaultValue=""
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">—</option>
              {Object.values(DayOfWeek).map((d) => (
                <option key={d} value={d}>
                  {meetingDayLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end md:col-span-2">
            <Button type="submit">Create section</Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Existing sections</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr className="[&>th]:py-2 [&>th]:pr-4">
                <th>Display</th>
                <th>Name</th>
                <th>Meeting</th>
                <th>Status</th>
                <th className="w-[520px]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {sections.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 [&>td]:py-2 [&>td]:pr-4">
                  <td className="whitespace-nowrap font-medium">{sectionDisplayName(s)}</td>
                  <td className="whitespace-nowrap">{s.name}</td>
                  <td className="whitespace-nowrap">{meetingDayLabel(s.meetingDay)}</td>
                  <td className="whitespace-nowrap">{s.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <form action={updateSectionAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="sectionId" value={s.id} />
                      <Input name="name" defaultValue={s.name} className="w-[180px]" />
                      <select
                        name="meetingDay"
                        defaultValue={s.meetingDay ?? ""}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        <option value="">—</option>
                        {Object.values(DayOfWeek).map((d) => (
                          <option key={d} value={d}>
                            {meetingDayLabel(d)}
                          </option>
                        ))}
                      </select>
                      <select
                        name="isActive"
                        defaultValue={String(s.isActive)}
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
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-600">
                    No sections yet.
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
