import { Role } from "@prisma/client";

import { requireRole } from "@/lib/auth";
import { buildWeeklyDigest } from "@/lib/reminders";
import { smtpConfigured } from "@/lib/email";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { sendWeeklyDigestAction } from "./actions";

export default async function RemindersPage() {
  await requireRole(Role.ADMIN);

  const digest = await buildWeeklyDigest(new Date());
  const smtpOk = smtpConfigured();
  const to = (process.env.WEEKLY_DIGEST_TO ?? "").trim();
  const baseUrl = (process.env.APP_BASE_URL ?? "").trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reminders</h1>
        <p className="mt-1 text-sm text-slate-600">Weekly digest + copy/paste messages.</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-medium text-slate-900">Weekly digest</div>
          <div className="flex items-center gap-2">
            <CopyButton text={digest.text} label="Copy text" />
            <form action={sendWeeklyDigestAction}>
              <Button type="submit" variant="secondary" disabled={!smtpOk || !to}>
                Send email now
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {!smtpOk ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              SMTP isn’t configured. Set `SMTP_HOST` / `SMTP_FROM` (and optionally `SMTP_USER` / `SMTP_PASS`) to enable sending.
            </div>
          ) : null}
          {!to ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Set `WEEKLY_DIGEST_TO` (comma-separated emails) to enable sending.
            </div>
          ) : null}
          {!baseUrl ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              Optional: set `APP_BASE_URL` to include links in nudge messages.
            </div>
          ) : null}

          <div className="text-sm text-slate-600">{digest.subject}</div>
          <textarea
            className="min-h-[360px] w-full rounded-md border border-[color:var(--border)] px-3 py-2 font-mono text-xs text-slate-900"
            readOnly
            value={digest.text}
          />
          <div className="text-xs text-slate-600">
            For WhatsApp broadcast lists: copy this text and paste into your list chat.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

