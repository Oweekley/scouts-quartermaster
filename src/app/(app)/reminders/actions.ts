"use server";

import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";

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

export async function sendWeeklyDigestAction() {
  await requireRole(Role.ADMIN);
  if (!smtpConfigured()) throw new Error("SMTP not configured.");

  const recipients = parseRecipients(process.env.WEEKLY_DIGEST_TO);
  if (recipients.length === 0) throw new Error("Set WEEKLY_DIGEST_TO env var.");

  const digest = await buildWeeklyDigest(new Date());
  await sendEmail({ to: recipients, subject: digest.subject, text: digest.text });
}
