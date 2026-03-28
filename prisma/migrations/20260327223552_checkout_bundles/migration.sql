-- CreateTable
CREATE TABLE "CheckoutBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "CheckoutBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutBundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CheckoutBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutBundle_name_key" ON "CheckoutBundle"("name");

-- CreateIndex
CREATE INDEX "CheckoutBundle_isActive_idx" ON "CheckoutBundle"("isActive");

-- CreateIndex
CREATE INDEX "CheckoutBundleItem_bundleId_idx" ON "CheckoutBundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "CheckoutBundleItem_equipmentId_idx" ON "CheckoutBundleItem"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutBundleItem_bundleId_equipmentId_key" ON "CheckoutBundleItem"("bundleId", "equipmentId");

-- AddForeignKey
ALTER TABLE "CheckoutBundle" ADD CONSTRAINT "CheckoutBundle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutBundleItem" ADD CONSTRAINT "CheckoutBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "CheckoutBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutBundleItem" ADD CONSTRAINT "CheckoutBundleItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
