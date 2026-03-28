# Scout Quartermaster (MVP)

Practical equipment + quartermaster management web app for a local Scout group.

## Features (MVP)

- Auth with roles: `ADMIN`, `QUARTERMASTER`, `LEADER`, `READONLY`
- Equipment inventory (CRUD), categories, locations, type-specific custom fields
- Check-out / return flow (with condition update on return)
- Maintenance issues + history logs
- Attachments (photos + documents) stored in S3-compatible storage (Cloudflare R2 recommended)
- QR code generation + printable labels, plus a manual QR lookup page
- Audit log entries for key actions

## Tech stack

- Next.js App Router + TypeScript + Tailwind CSS
- Postgres + Prisma ORM
- Vercel-friendly (server actions + route handlers)
- S3-compatible storage via AWS SDK (R2/S3)

## Project structure

- `prisma/schema.prisma` — database schema
- `prisma/seed.ts` — seed accounts + starter data
- `src/lib/` — auth helpers, Prisma client, storage helpers
- `src/app/(auth)/` — login routes
- `src/app/(app)/` — authenticated app routes (dashboard, equipment, checkouts, returns, maintenance, locations, admin)
- `src/app/api/` — upload presign + attachment download routes

## Local development

### 1) Install dependencies

```bash
npm install
```

### Quick local test (no manual env setup)

Requires Docker.

```bash
npm run dev:setup
npm run dev
```

This will:
- create a local `.env` automatically
- start Postgres via `docker compose`
- run Prisma migrations + seed data

### 2) Configure env vars

```bash
cp .env.example .env
```

Set at minimum:

- `DATABASE_URL` (Postgres)
- `AUTH_SECRET` (any long random string)
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`

### 3) Create DB schema and seed

```bash
npm run db:migrate
npm run db:seed
```

Seed accounts (password is `SEED_PASSWORD`, default `password123`):

- `admin@scouts.local` (Admin)
- `qm@scouts.local` (Quartermaster)
- `leader@scouts.local` (Leader)
- `readonly@scouts.local` (Read-only)

### 4) Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deployment (Vercel)

1) Create a hosted Postgres database (Neon/Supabase Postgres).
2) Create an S3-compatible bucket (Cloudflare R2 recommended).
3) In Vercel project settings, add env vars from `.env.example`.
4) Deploy.

This repo includes a `vercel-build` script that runs migrations on deploy:

```json
"vercel-build": "prisma migrate deploy && next build"
```

Make sure your Prisma migrations are committed (created locally with `npm run db:migrate`).

## Notes / MVP tradeoffs

- Partial checkouts are supported via per-checkout quantities. `Equipment.status` is treated as a simple “anything out?” flag.
- Attachment uploading requires `QUARTERMASTER` or `ADMIN`; viewing attachments is allowed for any signed-in user.
- Camera scanning is not implemented yet; use `/qr` for manual QR lookups.

## Next improvements

- Camera-based QR scanning (mobile)
- Email reminders for overdue returns and maintenance due dates
- CSV export for equipment + checkouts
- Better stock/consumables support (low-stock alerts, partial availability)
- Attachment delete + versioning
- PWA/offline-friendly mode for store-room use
