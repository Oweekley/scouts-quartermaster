-- CreateEnum
CREATE TYPE "ScoutSection" AS ENUM ('BEAVERS', 'CUBS', 'SCOUTS');

-- AlterTable
ALTER TABLE "Checkout" ADD COLUMN     "borrowerMemberId" TEXT,
ADD COLUMN     "borrowerSection" "ScoutSection";

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" "ScoutSection" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Member_section_idx" ON "Member"("section");

-- CreateIndex
CREATE INDEX "Member_isActive_idx" ON "Member"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Member_section_name_key" ON "Member"("section", "name");

-- CreateIndex
CREATE INDEX "Checkout_borrowerMemberId_idx" ON "Checkout"("borrowerMemberId");

-- CreateIndex
CREATE INDEX "Checkout_borrowerSection_idx" ON "Checkout"("borrowerSection");

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_borrowerMemberId_fkey" FOREIGN KEY ("borrowerMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
