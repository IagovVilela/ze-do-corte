-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "whatsappConfirmBooking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "whatsappReminder24h" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "stockMin" INTEGER;

-- CreateEnum
CREATE TYPE "ProductStockMovementKind" AS ENUM ('IN', 'OUT', 'ADJUST', 'SALE');

-- CreateTable
CREATE TABLE "ProductStockMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "ProductStockMovementKind" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" VARCHAR(200),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductStockMovement_organizationId_productId_createdAt_idx" ON "ProductStockMovement"("organizationId", "productId", "createdAt");
CREATE INDEX "ProductStockMovement_productId_createdAt_idx" ON "ProductStockMovement"("productId", "createdAt");

ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StaffCommissionRule" ADD COLUMN "tiersJson" JSONB;

-- CreateTable
CREATE TABLE "StaffMonthlyGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "yearMonth" VARCHAR(7) NOT NULL,
    "revenueGoal" DECIMAL(12,2) NOT NULL,
    "visitGoal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffMonthlyGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffMonthlyGoal_staffMemberId_yearMonth_key" ON "StaffMonthlyGoal"("staffMemberId", "yearMonth");
CREATE INDEX "StaffMonthlyGoal_organizationId_yearMonth_idx" ON "StaffMonthlyGoal"("organizationId", "yearMonth");

ALTER TABLE "StaffMonthlyGoal" ADD CONSTRAINT "StaffMonthlyGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMonthlyGoal" ADD CONSTRAINT "StaffMonthlyGoal_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
