import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--shell)] text-white font-semibold">
          SQ
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scout Quartermaster</h1>
          <p className="mt-0.5 text-sm text-slate-600">Sign in to manage your group kit.</p>
        </div>
      </div>

      <LoginForm />

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        <div className="font-medium text-slate-700">Seed accounts (local dev)</div>
        <div className="mt-1">
          `admin@scouts.local`, `qm@scouts.local`, `leader@scouts.local`, `readonly@scouts.local`
        </div>
      </div>
    </div>
  );
}
