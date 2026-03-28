import { requireUser } from "@/lib/auth";
import { StoreCupboardClient } from "./ui/store-cupboard-client";

export default async function StoreCupboardPage() {
  await requireUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Store cupboard mode</h1>
        <p className="mt-1 text-sm text-slate-600">
          Offline-friendly kit lookup + queued changes for patchy signal.
        </p>
      </div>

      <StoreCupboardClient />
    </div>
  );
}

