"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttachmentKind } from "@prisma/client";

export function AttachmentUploader({ equipmentId }: { equipmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<AttachmentKind>(AttachmentKind.DOCUMENT);

  async function upload(file: File, kind: AttachmentKind) {
    setBusy(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind,
        }),
      });
      if (!presignRes.ok) throw new Error("Could not start upload.");
      const presign = (await presignRes.json()) as {
        attachmentId: string;
        uploadUrl: string;
        method: "PUT";
        headers: Record<string, string>;
      };

      const putRes = await fetch(presign.uploadUrl, {
        method: presign.method,
        headers: presign.headers,
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed.");

      const completeRes = await fetch(`/api/attachments/${presign.attachmentId}/complete`, {
        method: "PATCH",
      });
      if (!completeRes.ok) throw new Error("Could not finalise upload.");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-slate-900">Attachments</div>
          <div className="mt-1 text-sm text-slate-600">Photos, manuals, warranties, layouts, PDFs…</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-[color:var(--border)] bg-white px-2 text-sm"
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value as AttachmentKind)}
            disabled={busy}
            aria-label="Attachment type"
          >
            <option value={AttachmentKind.PHOTO}>Photo</option>
            <option value={AttachmentKind.MANUAL}>Manual</option>
            <option value={AttachmentKind.WARRANTY}>Warranty</option>
            <option value={AttachmentKind.RISK_ASSESSMENT}>Risk assessment</option>
            <option value={AttachmentKind.DOCUMENT}>Document</option>
          </select>
          <label className="cursor-pointer rounded-md bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-95">
            {busy ? "Uploading…" : "Upload"}
            <input
              type="file"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const kind = file.type.startsWith("image/") ? AttachmentKind.PHOTO : selectedKind;
                  void upload(file, kind);
                }
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="mt-3 text-xs text-slate-600">
        Uploads go to your configured S3-compatible storage (e.g. Cloudflare R2).
      </div>
    </div>
  );
}
