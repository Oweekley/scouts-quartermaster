import Link from "next/link";
import { Role } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { sectionDisplayName } from "@/lib/sections";

export default async function CheckoutsPage() {
  const user = await requireUser();
  const canCreate = roleAtLeast(user.role, Role.LEADER);

  const checkouts = await prisma.checkout.findMany({
    orderBy: [{ checkedOutAt: "desc" }],
    include: {
      checkedOutBy: true,
      section: true,
      items: { include: { equipment: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Checkouts</h1>
          <p className="mt-1 text-sm text-slate-600">Track what’s out, who has it, and when it’s due back.</p>
        </div>
        {canCreate ? (
          <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" href="/checkouts/new">
            New checkout
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Recent checkouts</div>
          <div className="text-sm text-slate-600">{checkouts.length} shown</div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th>Borrower</th>
                  <th>Checked out</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {checkouts.map((c) => {
                  const overdue =
                    c.status === "OPEN" &&
                    c.expectedReturnAt &&
                    c.expectedReturnAt.getTime() < new Date().getTime();
                  return (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link className="font-medium hover:underline" href={`/checkouts/${c.id}`}>
                          {c.borrowerName}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-600">Created by {c.checkedOutBy.name}</div>
                        <div className="mt-0.5 text-xs text-slate-600">Section {sectionDisplayName(c.section)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDistanceToNowStrict(c.checkedOutAt, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        {c.expectedReturnAt ? (
                          <span className={overdue ? "font-medium text-red-700" : "text-slate-700"}>
                            {formatDistanceToNowStrict(c.expectedReturnAt, { addSuffix: true })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "OPEN" ? (overdue ? "danger" : "warning") : "default"}>
                          {c.status === "OPEN" ? (overdue ? "Overdue" : "Open") : "Closed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.items.length}</td>
                    </tr>
                  );
                })}
                {checkouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                      No checkouts yet.
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
