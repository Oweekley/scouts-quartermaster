-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "locationId" TEXT,
ALTER COLUMN "equipmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LocationHotspot" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "targetLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationHotspot_locationId_idx" ON "LocationHotspot"("locationId");

-- CreateIndex
CREATE INDEX "LocationHotspot_targetLocationId_idx" ON "LocationHotspot"("targetLocationId");

-- CreateIndex
CREATE INDEX "Attachment_locationId_idx" ON "Attachment"("locationId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHotspot" ADD CONSTRAINT "LocationHotspot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHotspot" ADD CONSTRAINT "LocationHotspot_targetLocationId_fkey" FOREIGN KEY ("targetLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
