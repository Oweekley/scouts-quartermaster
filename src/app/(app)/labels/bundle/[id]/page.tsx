import QRCode from "qrcode";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveParams } from "@/lib/next-params";
import { PrintButton } from "../../[id]/ui/print-button";

export const dynamic = "force-dynamic";

export default async function BundleLabelPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireUser();
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const bundle = await prisma.checkoutBundle.findUnique({
    where: { id: resolved.id },
    select: { id: true, name: true, description: true, isActive: true },
  });
  if (!bundle || !bundle.isActive) notFound();

  const value = `scouts:bundle:${bundle.id}`;
  const svg = await QRCode.toString(value, { type: "svg", margin: 1, width: 256 });

  return (
    <div className="min-h-screen bg-white p-6">
      <style>{`
        @media print { .no-print { display: none } }
      `}</style>
      <div className="no-print mb-6 text-sm text-slate-700">
        <PrintButton />
      </div>

      <div className="mx-auto w-[340px] rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-mono text-slate-600">KIT</div>
        <div className="mt-1 text-base font-semibold text-slate-900">{bundle.name}</div>
        <div className="mt-1 text-xs text-slate-600">{bundle.description ?? "—"}</div>
        <div className="mt-4 flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-3 break-all text-center font-mono text-xs text-slate-600">{value}</div>
      </div>
    </div>
  );
}

