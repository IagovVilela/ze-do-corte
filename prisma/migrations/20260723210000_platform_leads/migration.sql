-- CreateTable
CREATE TABLE "PlatformLead" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(160),
    "shopName" VARCHAR(120) NOT NULL,
    "city" VARCHAR(80),
    "note" VARCHAR(400),
    "source" VARCHAR(40) NOT NULL DEFAULT 'lista-espera',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformLead_createdAt_idx" ON "PlatformLead"("createdAt");
