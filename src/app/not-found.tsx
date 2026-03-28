import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-xl rounded-xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          That page doesn’t exist (or you no longer have access).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-md bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-95" href="/dashboard">
            Go to dashboard
          </Link>
          <Link className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50" href="/equipment">
            View equipment
          </Link>
        </div>
      </div>
    </div>
  );
}
