"use client";

export function PrintButton() {
  return (
    <button
      className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}

