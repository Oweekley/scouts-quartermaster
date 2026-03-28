import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QrScanToggle } from "./qr-scan-toggle";
import { requireUser } from "@/lib/auth";

export default async function QrLookupPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">QR lookup</h1>
        <p className="mt-1 text-sm text-slate-600">Enter a QR value (or asset ID) to open an item.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <form
          action={async (formData) => {
            "use server";
            const { qrLookupAction } = await import("./actions");
            await qrLookupAction(formData);
          }}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <Label htmlFor="qr">QR value / Asset ID</Label>
            <Input id="qr" name="qr" placeholder="scouts:TENT-001" className="mt-1" required />
          </div>
          <Button type="submit">Lookup</Button>
        </form>
      </div>

      <QrScanToggle />

      <div className="text-sm text-slate-700">
        Tip: add a bookmark to this page for quick lookups.{" "}
        <Link className="underline" href="/equipment">
          Go to equipment
        </Link>
        .
      </div>
    </div>
  );
}
