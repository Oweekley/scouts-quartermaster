import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import QRCode from "qrcode";
import { PrintButton } from "./ui/print-button";
import { notFound } from "next/navigation";
import { resolveParams } from "@/lib/next-params";

export const dynamic = "force-dynamic";

export default async function LabelPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireUser();
  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();
  const equipment = await prisma.equipment.findUnique({
    where: { id: resolved.id },
    select: { name: true, assetId: true, qrValue: true },
  });
  if (!equipment) notFound();

  const svg = await QRCode.toString(equipment.qrValue, { type: "svg", margin: 1, width: 256 });

  return (
    <div className="min-h-screen bg-white p-6">
      <style>{`
        @media print { .no-print { display: none } }
      `}</style>
      <div className="no-print mb-6 text-sm text-slate-700">
        <PrintButton />
      </div>

      <div className="mx-auto w-[340px] rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-mono text-slate-600">{equipment.assetId}</div>
        <div className="mt-1 text-base font-semibold text-slate-900">{equipment.name}</div>
        <div className="mt-4 flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-3 break-all text-center font-mono text-xs text-slate-600">{equipment.qrValue}</div>
      </div>
    </div>
  );
}
