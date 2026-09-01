-- CreateEnum
CREATE TYPE "FinanceCategoryCostType" AS ENUM ('NONE', 'FIXED', 'VARIABLE');

-- AlterTable
ALTER TABLE "FinanceCategory" ADD COLUMN "costType" "FinanceCategoryCostType" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "costPrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "FinanceSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "proLaboreMonthly" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "productiveHoursPerMonth" INTEGER NOT NULL DEFAULT 156,
    "defaultVariableExpensePercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "defaultProfitMarginPercent" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "monthlyFixedCostsOverride" DECIMAL(12,2),
    "autoSettleReceivablesOnDueDate" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodFeesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCostProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "directLaborCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "materialCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "durationMinutesOverride" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCostProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSettings_organizationId_key" ON "FinanceSettings"("organizationId");

-- CreateIndex
CREATE INDEX "BankAccount_organizationId_isActive_idx" ON "BankAccount"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCostProfile_serviceId_key" ON "ServiceCostProfile"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceCostProfile_organizationId_idx" ON "ServiceCostProfile"("organizationId");

-- CreateIndex
CREATE INDEX "FinanceCategory_organizationId_kind_costType_idx" ON "FinanceCategory"("organizationId", "kind", "costType");

-- AddForeignKey
ALTER TABLE "FinanceSettings" ADD CONSTRAINT "FinanceSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCostProfile" ADD CONSTRAINT "ServiceCostProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCostProfile" ADD CONSTRAINT "ServiceCostProfile_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
