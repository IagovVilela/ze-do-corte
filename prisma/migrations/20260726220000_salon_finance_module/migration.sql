-- CreateEnum
CREATE TYPE "FinanceEntryKind" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "FinanceEntryStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancePaymentCondition" AS ENUM ('CASH', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "StaffFinanceAdjustmentKind" AS ENUM ('BONUS', 'ADVANCE');

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "FinanceEntryKind" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT,
    "kind" "FinanceEntryKind" NOT NULL,
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'OPEN',
    "description" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "interestPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT,
    "notes" TEXT,
    "paymentCondition" "FinancePaymentCondition" NOT NULL DEFAULT 'CASH',
    "paymentMethod" VARCHAR(80),
    "bankAccount" VARCHAR(120),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "repeatMonthly" BOOLEAN NOT NULL DEFAULT false,
    "staffMemberId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCommissionRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "servicePercent" DECIMAL(6,2) NOT NULL DEFAULT 50,
    "subscriptionPercent" DECIMAL(6,2) NOT NULL DEFAULT 30,
    "productPercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffFinanceAdjustment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "kind" "StaffFinanceAdjustmentKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(200),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffFinanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceCategory_organizationId_kind_name_idx" ON "FinanceCategory"("organizationId", "kind", "name");

-- CreateIndex
CREATE INDEX "FinanceCategory_organizationId_kind_isActive_idx" ON "FinanceCategory"("organizationId", "kind", "isActive");

-- CreateIndex
CREATE INDEX "FinanceCategory_parentId_idx" ON "FinanceCategory"("parentId");

-- CreateIndex
CREATE INDEX "FinanceEntry_organizationId_kind_status_dueDate_idx" ON "FinanceEntry"("organizationId", "kind", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_organizationId_dueDate_idx" ON "FinanceEntry"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_unitId_idx" ON "FinanceEntry"("unitId");

-- CreateIndex
CREATE INDEX "FinanceEntry_categoryId_idx" ON "FinanceEntry"("categoryId");

-- CreateIndex
CREATE INDEX "FinanceEntry_createdById_idx" ON "FinanceEntry"("createdById");

-- CreateIndex
CREATE INDEX "StaffCommissionRule_organizationId_idx" ON "StaffCommissionRule"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCommissionRule_staffMemberId_key" ON "StaffCommissionRule"("staffMemberId");

-- CreateIndex
CREATE INDEX "StaffFinanceAdjustment_organizationId_staffMemberId_occurredAt_idx" ON "StaffFinanceAdjustment"("organizationId", "staffMemberId", "occurredAt");

-- CreateIndex
CREATE INDEX "StaffFinanceAdjustment_kind_occurredAt_idx" ON "StaffFinanceAdjustment"("kind", "occurredAt");

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinanceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BarbershopUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCommissionRule" ADD CONSTRAINT "StaffCommissionRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCommissionRule" ADD CONSTRAINT "StaffCommissionRule_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFinanceAdjustment" ADD CONSTRAINT "StaffFinanceAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFinanceAdjustment" ADD CONSTRAINT "StaffFinanceAdjustment_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
