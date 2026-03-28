export default function EquipmentLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-7 w-40 rounded-md bg-slate-200" />
        <div className="mt-2 h-4 w-72 rounded-md bg-slate-200" />
      </div>

      <div className="sticky top-14 z-10 -mx-5 border-y border-[color:var(--border)] bg-white/95 px-5 py-3 backdrop-blur md:static md:top-auto md:mx-0 md:rounded-xl md:border md:p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2 h-11 rounded-md bg-slate-200 md:h-9" />
          <div className="h-11 rounded-md bg-slate-200 md:h-9" />
          <div className="h-11 rounded-md bg-slate-200 md:h-9" />
          <div className="h-11 rounded-md bg-slate-200 md:h-9" />
          <div className="h-11 rounded-md bg-slate-200 md:h-9" />
          <div className="md:col-span-6 h-11 rounded-md bg-slate-200 md:h-9" />
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="animate-pulse rounded-xl border border-[color:var(--border)] bg-white p-4 shadow-sm">
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-2 h-5 w-56 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-44 rounded bg-slate-200" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-20 rounded bg-slate-200" />
              <div className="h-6 w-20 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden animate-pulse overflow-hidden rounded-xl border border-[color:var(--border)] bg-white md:block">
        <div className="h-11 bg-slate-100" />
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="flex gap-3 border-t border-slate-100 px-4 py-3">
            <div className="h-4 w-4 rounded bg-slate-200" />
            <div className="h-4 w-56 rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

