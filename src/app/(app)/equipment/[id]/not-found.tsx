import Link from "next/link";

export default function EquipmentNotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-lg font-semibold text-slate-900">Equipment not found</div>
      <p className="mt-2 text-sm text-slate-600">The item may have been deleted or the link is invalid.</p>
      <div className="mt-4">
        <Link className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50" href="/equipment">
          Back to equipment
        </Link>
      </div>
    </div>
  );
}

