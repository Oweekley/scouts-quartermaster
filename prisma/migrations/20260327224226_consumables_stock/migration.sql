-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "isConsumable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minStock" INTEGER;

-- CreateIndex
CREATE INDEX "Equipment_isConsumable_idx" ON "Equipment"("isConsumable");
