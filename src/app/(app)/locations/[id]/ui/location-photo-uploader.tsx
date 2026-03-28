"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttachmentKind } from "@prisma/client";

export function LocationPhotoUploader({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind: AttachmentKind.PHOTO,
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

      const completeRes = await fetch(`/api/attachments/${presign.attachmentId}/complete`, { method: "PATCH" });
      if (!completeRes.ok) throw new Error("Could not finalise upload.");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <label className="cursor-pointer rounded-md bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-95">
        {busy ? "Uploading…" : "Upload photo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {error ? <div className="text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

