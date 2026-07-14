-- Asaas: billing SaaS + PIX/clube por salão

DO $$ BEGIN
  CREATE TYPE "OrganizationPlanTier" AS ENUM ('TRIAL_FULL', 'STARTER', 'PRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "planTier" "OrganizationPlanTier" NOT NULL DEFAULT 'TRIAL_FULL';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "asaasApiKeyEnc" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "asaasEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "asaasAccountEmail" TEXT;

CREATE INDEX IF NOT EXISTS "Organization_asaasSubscriptionId_idx"
  ON "Organization"("asaasSubscriptionId");

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "paymentStatus" "AppointmentPaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "asaasPaymentId" TEXT;

CREATE INDEX IF NOT EXISTS "Appointment_asaasPaymentId_idx" ON "Appointment"("asaasPaymentId");
CREATE INDEX IF NOT EXISTS "Appointment_paymentStatus_idx" ON "Appointment"("paymentStatus");

ALTER TABLE "ClientSubscription" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
ALTER TABLE "ClientSubscription" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;

CREATE INDEX IF NOT EXISTS "ClientSubscription_asaasSubscriptionId_idx"
  ON "ClientSubscription"("asaasSubscriptionId");

CREATE TABLE IF NOT EXISTS "PaymentEvent" (
    "id" TEXT NOT NULL,
    "asaasEventId" TEXT NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "paymentId" TEXT,
    "subscriptionId" TEXT,
    "externalReference" VARCHAR(160),
    "organizationId" TEXT,
    "payloadJson" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_asaasEventId_key" ON "PaymentEvent"("asaasEventId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_subscriptionId_idx" ON "PaymentEvent"("subscriptionId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_organizationId_idx" ON "PaymentEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_processedAt_idx" ON "PaymentEvent"("processedAt");

DO $$ BEGIN
  ALTER TABLE "PaymentEvent"
    ADD CONSTRAINT "PaymentEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
