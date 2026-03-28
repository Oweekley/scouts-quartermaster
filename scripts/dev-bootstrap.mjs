import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  process.stdout.write("✅ .env already exists (leaving it unchanged)\n");
  process.exit(0);
}

const authSecret = crypto.randomBytes(32).toString("hex");

const contents = [
  "# Auto-generated for local testing",
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scouts_quartermaster?schema=public"',
  `AUTH_SECRET="${authSecret}"`,
  'SEED_PASSWORD="password123"',
  "",
  "# Attachments (optional for local testing). Configure later for Cloudflare R2 / S3.",
  'STORAGE_PROVIDER="s3"',
  'S3_ENDPOINT="https://example.invalid"',
  'S3_REGION="auto"',
  'S3_ACCESS_KEY_ID="replace"',
  'S3_SECRET_ACCESS_KEY="replace"',
  'S3_BUCKET="replace"',
  "",
].join("\n");

fs.writeFileSync(envPath, contents, { encoding: "utf8", flag: "wx" });
process.stdout.write("✅ Wrote .env for local testing\n");

