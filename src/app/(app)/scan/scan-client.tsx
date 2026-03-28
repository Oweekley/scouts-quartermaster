"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";

const QrScanner = dynamic(() => import("@/app/(app)/qr/qr-scanner").then((m) => m.QrScanner), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      Starting camera…
    </div>
  ),
});

export function ScanClient() {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-700">Scan a label, then pick what you want to do.</div>
        <Button type="button" variant="secondary" onClick={() => router.push("/home")}>
          Back
        </Button>
      </div>

      <QrScanner
        onStop={() => router.push("/home")}
        onResolved={(result) => {
          router.push(`/scan/${result.kind}/${result.id}`);
        }}
      />
    </div>
  );
}
