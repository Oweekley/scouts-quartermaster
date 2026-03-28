import nodemailer from "nodemailer";

function required(name: string, value: string | undefined) {
  if (!value || value.trim().length === 0) throw new Error(`Missing ${name} env var.`);
  return value.trim();
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string | string[];
  subject: string;
  text: string;
}) {
  const host = required("SMTP_HOST", process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  const from = required("SMTP_FROM", process.env.SMTP_FROM);
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}

