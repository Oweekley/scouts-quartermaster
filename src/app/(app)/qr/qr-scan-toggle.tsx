"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";

const QrScanner = dynamic(() => import("./qr-scanner").then((m) => m.QrScanner), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      Starting camera…
    </div>
  ),
});

export function QrScanToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-700">Use your camera to scan a label.</div>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide camera" : "Scan with camera"}
        </Button>
      </div>

      {open ? <QrScanner onStop={() => setOpen(false)} /> : null}
    </div>
  );
}
