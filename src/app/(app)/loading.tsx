export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-7 w-44 animate-pulse rounded-md bg-slate-200" />
        <div className="h-10 w-24 animate-pulse rounded-md bg-slate-200 md:h-9" />
      </div>

      <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[color:var(--primary)]" />
          <div>
            <div className="text-sm font-medium text-slate-900">Loading…</div>
            <div className="mt-0.5 text-xs text-slate-600">Fetching the latest data.</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

