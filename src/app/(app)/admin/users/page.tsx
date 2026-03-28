import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction, updateUserAction } from "./actions";

export default async function UsersAdminPage() {
  await requireRole(Role.ADMIN);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-600">Manage who can access the system.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add user</h2>
        <form action={createUserAction} className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue={Role.LEADER}
            >
              {Object.values(Role).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="text" minLength={8} required />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button type="submit">Create user</Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Existing users</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr className="[&>th]:py-2 [&>th]:pr-4">
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="w-[360px]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 [&>td]:py-2 [&>td]:pr-4">
                  <td className="whitespace-nowrap">{u.name}</td>
                  <td className="whitespace-nowrap">{u.email}</td>
                  <td className="whitespace-nowrap">{u.role}</td>
                  <td className="whitespace-nowrap">{u.isActive ? "Active" : "Disabled"}</td>
                  <td>
                    <form action={updateUserAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        {Object.values(Role).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <select
                        name="isActive"
                        defaultValue={String(u.isActive)}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                      <Input
                        name="password"
                        type="text"
                        placeholder="New password (optional)"
                        className="w-[190px]"
                      />
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

