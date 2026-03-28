"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-xl rounded-xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          Try again. If it keeps happening, refresh the page or go back to the dashboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-95"
            onClick={() => reset()}
          >
            Retry
          </button>
          <Link
            className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>
        <div className="mt-4 text-xs text-slate-500">{error.digest ? `Digest: ${error.digest}` : null}</div>
      </div>
    </div>
  );
}
