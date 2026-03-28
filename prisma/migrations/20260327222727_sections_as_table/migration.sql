-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meetingDay" "DayOfWeek",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_meetingDay_key" ON "Section"("name", "meetingDay");

-- CreateIndex
CREATE INDEX "Section_name_idx" ON "Section"("name");

-- CreateIndex
CREATE INDEX "Section_meetingDay_idx" ON "Section"("meetingDay");

-- CreateIndex
CREATE INDEX "Section_isActive_idx" ON "Section"("isActive");

-- Pre-create common sections (including meeting nights).
INSERT INTO "Section" ("id", "name", "meetingDay", "isActive", "createdAt", "updatedAt") VALUES
  ('sec_squirrels_mon', 'Squirrels', 'MONDAY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_cubs_mon', 'Cubs', 'MONDAY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_cubs_tue', 'Cubs', 'TUESDAY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_beavers_thu', 'Beavers', 'THURSDAY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_scouts_thu', 'Scouts', 'THURSDAY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_scouts_fri', 'Scouts', 'FRIDAY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_beavers_base', 'Beavers', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_cubs_base', 'Cubs', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sec_scouts_base', 'Scouts', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Add new columns (nullable for backfill), then migrate existing enum data across.
ALTER TABLE "Checkout" ADD COLUMN "borrowerSectionId" TEXT;
ALTER TABLE "Member" ADD COLUMN "sectionId" TEXT;

UPDATE "Member"
SET "sectionId" = CASE "section"
  WHEN 'BEAVERS' THEN 'sec_beavers_base'
  WHEN 'CUBS' THEN 'sec_cubs_base'
  WHEN 'SCOUTS' THEN 'sec_scouts_base'
  ELSE NULL
END;

UPDATE "Checkout"
SET "borrowerSectionId" = CASE "borrowerSection"
  WHEN 'BEAVERS' THEN 'sec_beavers_base'
  WHEN 'CUBS' THEN 'sec_cubs_base'
  WHEN 'SCOUTS' THEN 'sec_scouts_base'
  ELSE NULL
END;

-- If the Member table was empty, default new required column to Scouts base.
UPDATE "Member" SET "sectionId" = COALESCE("sectionId", 'sec_scouts_base');

ALTER TABLE "Member" ALTER COLUMN "sectionId" SET NOT NULL;

-- Drop old indexes before dropping enum columns.
DROP INDEX "Checkout_borrowerSection_idx";
DROP INDEX "Member_section_idx";
DROP INDEX "Member_section_name_key";

-- Remove old enum columns.
ALTER TABLE "Checkout" DROP COLUMN "borrowerSection";
ALTER TABLE "Member" DROP COLUMN "section";

-- DropEnum
DROP TYPE "ScoutSection";

-- CreateIndex
CREATE INDEX "Checkout_borrowerSectionId_idx" ON "Checkout"("borrowerSectionId");

-- CreateIndex
CREATE INDEX "Member_sectionId_idx" ON "Member"("sectionId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_borrowerSectionId_fkey" FOREIGN KEY ("borrowerSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
