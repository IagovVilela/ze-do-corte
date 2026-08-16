ALTER TYPE "OrganizationPlanTier" ADD VALUE IF NOT EXISTS 'PLUS';
ALTER TYPE "WhatsAppOutboundKind" ADD VALUE IF NOT EXISTS 'WINBACK';
ALTER TYPE "WhatsAppOutboundKind" ADD VALUE IF NOT EXISTS 'OPT_OUT_ACK';

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappWinbackMonthlyCap" INTEGER NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS "ClientProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "displayName" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptOutAt" TIMESTAMP(3),
    "usualGapDays" INTEGER,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),
    "lastWinbackAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "preferredStaffMemberId" TEXT,
    "preferredServiceId" TEXT,
    "preferredUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientProfile_organizationId_phoneKey_key" ON "ClientProfile"("organizationId", "phoneKey");
CREATE INDEX IF NOT EXISTS "ClientProfile_organizationId_marketingOptOutAt_idx" ON "ClientProfile"("organizationId", "marketingOptOutAt");
CREATE INDEX IF NOT EXISTS "ClientProfile_organizationId_lastCompletedAt_idx" ON "ClientProfile"("organizationId", "lastCompletedAt");

DO $$ BEGIN
  ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsAppInboundDedup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metaMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppInboundDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppInboundDedup_organizationId_metaMessageId_key" ON "WhatsAppInboundDedup"("organizationId", "metaMessageId");
CREATE INDEX IF NOT EXISTS "WhatsAppInboundDedup_createdAt_idx" ON "WhatsAppInboundDedup"("createdAt");

DO $$ BEGIN
  ALTER TABLE "WhatsAppInboundDedup" ADD CONSTRAINT "WhatsAppInboundDedup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
