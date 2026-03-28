-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_SCHEDULE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_SCHEDULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_SCHEDULE_RUN';

-- AlterTable
ALTER TABLE "MaintenanceIssue" ADD COLUMN     "scheduleId" TEXT;

-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "lastDoneAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activeIssueId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceSchedule_activeIssueId_key" ON "MaintenanceSchedule"("activeIssueId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_equipmentId_idx" ON "MaintenanceSchedule"("equipmentId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_nextDueAt_idx" ON "MaintenanceSchedule"("nextDueAt");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_isActive_idx" ON "MaintenanceSchedule"("isActive");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_intervalMonths_idx" ON "MaintenanceSchedule"("intervalMonths");

-- CreateIndex
CREATE INDEX "MaintenanceIssue_scheduleId_idx" ON "MaintenanceIssue"("scheduleId");

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_activeIssueId_fkey" FOREIGN KEY ("activeIssueId") REFERENCES "MaintenanceIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceIssue" ADD CONSTRAINT "MaintenanceIssue_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
