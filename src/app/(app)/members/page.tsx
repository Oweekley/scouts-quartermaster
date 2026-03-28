import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sectionDisplayName } from "@/lib/sections";
import { createMemberAction, updateMemberAction } from "./actions";

export default async function MembersPage() {
  await requireRole(Role.LEADER);

  const [sections, members] = await Promise.all([
    prisma.section.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.member.findMany({
      include: { section: true },
      orderBy: [{ section: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Members</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register young people so checkouts can be assigned properly (section hall night is just a reference).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add member</h2>
        <form action={createMemberAction} className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Alex Smith" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="section">Section</Label>
            <select
              id="section"
              name="sectionId"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Select…
              </option>
              {sections.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>
                  {sectionDisplayName(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Create member</Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-600">
          Manage section names and meeting nights in{" "}
          <a className="underline" href="/sections">
            Sections
          </a>
          .
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Existing members</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr className="[&>th]:py-2 [&>th]:pr-4">
                <th>Name</th>
                <th>Section</th>
                <th>Status</th>
                <th className="w-[420px]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {members.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 [&>td]:py-2 [&>td]:pr-4">
                  <td className="whitespace-nowrap">{m.name}</td>
                  <td className="whitespace-nowrap">{sectionDisplayName(m.section)}</td>
                  <td className="whitespace-nowrap">{m.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <form action={updateMemberAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="memberId" value={m.id} />
                      <Input name="name" defaultValue={m.name} className="w-[190px]" />
                      <select
                        name="sectionId"
                        defaultValue={m.sectionId}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {sectionDisplayName(s)}
                          </option>
                        ))}
                      </select>
                      <select
                        name="isActive"
                        defaultValue={String(m.isActive)}
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
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-600">
                    No members yet.
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
