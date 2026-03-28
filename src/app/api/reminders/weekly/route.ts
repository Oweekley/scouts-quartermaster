import { NextResponse } from "next/server";

import { buildWeeklyDigest } from "@/lib/reminders";
import { sendEmail, smtpConfigured } from "@/lib/email";

function parseRecipients(raw: string | undefined) {
  const v = (raw ?? "").trim();
  if (!v) return [];
  return v
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const token = (process.env.REMINDER_CRON_TOKEN ?? "").trim();
  if (!token) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (provided !== token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!smtpConfigured()) return NextResponse.json({ error: "SMTP not configured" }, { status: 500 });
  const recipients = parseRecipients(process.env.WEEKLY_DIGEST_TO);
  if (recipients.length === 0) return NextResponse.json({ error: "WEEKLY_DIGEST_TO not set" }, { status: 500 });

  const digest = await buildWeeklyDigest(new Date());
  await sendEmail({ to: recipients, subject: digest.subject, text: digest.text });
  return NextResponse.json({ ok: true, to: recipients.length });
}

