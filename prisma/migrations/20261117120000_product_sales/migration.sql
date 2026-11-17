-- CreateEnum
CREATE TYPE "ProductSaleChannel" AS ENUM ('COUNTER', 'ONLINE');

-- CreateTable
CREATE TABLE "ProductSale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "ProductSaleChannel" NOT NULL,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "paymentMethod" VARCHAR(32),
    "paymentStatus" "AppointmentPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "amountTotal" DECIMAL(10,2) NOT NULL,
    "asaasPaymentId" TEXT,
    "manageToken" VARCHAR(36),
    "note" VARCHAR(200),
    "createdById" TEXT,
    "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ProductSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSale_manageToken_key" ON "ProductSale"("manageToken");

-- CreateIndex
CREATE INDEX "ProductSale_organizationId_createdAt_idx" ON "ProductSale"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductSale_organizationId_paymentStatus_paidAt_idx" ON "ProductSale"("organizationId", "paymentStatus", "paidAt");

-- CreateIndex
CREATE INDEX "ProductSale_asaasPaymentId_idx" ON "ProductSale"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "ProductSaleItem_saleId_idx" ON "ProductSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "ProductSaleItem_productId_idx" ON "ProductSaleItem"("productId");

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSaleItem" ADD CONSTRAINT "ProductSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ProductSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSaleItem" ADD CONSTRAINT "ProductSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
