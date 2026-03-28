-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttachmentKind" ADD VALUE 'MANUAL';
ALTER TYPE "AttachmentKind" ADD VALUE 'WARRANTY';
ALTER TYPE "AttachmentKind" ADD VALUE 'RISK_ASSESSMENT';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'EQUIPMENT_TYPE_UPDATED';

-- AlterTable
ALTER TABLE "EquipmentType" ADD COLUMN     "requiredDocs" JSONB;
