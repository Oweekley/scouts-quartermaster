import { requireUser } from "@/lib/auth";
import { ScanClient } from "./scan-client";

export default async function ScanPage() {
  await requireUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Scan</h1>
        <p className="mt-1 text-sm text-slate-600">Scan a QR label and choose an action.</p>
      </div>

      <ScanClient />
    </div>
  );
}

