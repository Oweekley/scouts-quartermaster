import Link from "next/link";
import { ClipboardList, QrCode, RotateCcw, TriangleAlert } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";

function QuickTile({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[color:var(--topbar)] text-slate-900">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-sm text-slate-600">{description}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function QuickActionsHomePage() {
  await requireUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Quick actions</h1>
        <p className="mt-1 text-sm text-slate-600">One-tap tasks for mobile.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickTile
          href="/checkouts/new"
          title="New checkout"
          description="Lend kit to a member or section."
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <QuickTile
          href="/returns"
          title="Return"
          description="Mark items as returned."
          icon={<RotateCcw className="h-5 w-5" />}
        />
        <QuickTile
          href="/stock"
          title="Stock"
          description="Low stock and quick consume."
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <QuickTile
          href="/scan"
          title="Scan QR"
          description="Scan a label then choose an action."
          icon={<QrCode className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardBody className="text-sm text-slate-700">
          Tip: add this page to your phone home screen for one-tap access.
        </CardBody>
      </Card>
    </div>
  );
}

