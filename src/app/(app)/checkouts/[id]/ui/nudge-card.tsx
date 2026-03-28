"use client";

import { CopyButton } from "@/components/ui/copy-button";

export function NudgeCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-slate-900">Nudge message</div>
        <CopyButton text={text} label="Copy nudge" />
      </div>
      <textarea
        className="mt-3 min-h-[140px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm text-slate-900"
        readOnly
        value={text}
      />
      <div className="mt-2 text-xs text-slate-600">Paste into SMS/WhatsApp/email.</div>
    </div>
  );
}

