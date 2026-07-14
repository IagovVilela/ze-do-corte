-- WhatsApp Cloud API: credenciais por tenant, sessões do bot e logs de saída.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappPhoneNumberId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappWabaId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappAccessTokenEnc" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappDisplayPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappBotEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappConnectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_whatsappPhoneNumberId_key"
  ON "Organization"("whatsappPhoneNumberId");

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "bookingSource" VARCHAR(32);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "whatsappReminderSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Appointment_clientPhone_idx" ON "Appointment"("clientPhone");
CREATE INDEX IF NOT EXISTS "Appointment_whatsappReminderSentAt_startsAt_idx"
  ON "Appointment"("whatsappReminderSentAt", "startsAt");

CREATE TABLE IF NOT EXISTS "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "waUserPhone" TEXT NOT NULL,
    "state" VARCHAR(40) NOT NULL DEFAULT 'idle',
    "contextJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_organizationId_waUserPhone_key"
  ON "WhatsAppSession"("organizationId", "waUserPhone");
CREATE INDEX IF NOT EXISTS "WhatsAppSession_organizationId_idx" ON "WhatsAppSession"("organizationId");
CREATE INDEX IF NOT EXISTS "WhatsAppSession_updatedAt_idx" ON "WhatsAppSession"("updatedAt");

DO $$ BEGIN
  ALTER TABLE "WhatsAppSession"
    ADD CONSTRAINT "WhatsAppSession_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsAppOutboundKind" AS ENUM (
    'CONFIRMATION', 'REMINDER', 'CANCELLATION', 'MANUAL', 'BOT_REPLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsAppOutboundLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "waUserPhone" TEXT NOT NULL,
    "kind" "WhatsAppOutboundKind" NOT NULL,
    "metaMessageId" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppOutboundLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WhatsAppOutboundLog_organizationId_createdAt_idx"
  ON "WhatsAppOutboundLog"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "WhatsAppOutboundLog_appointmentId_idx"
  ON "WhatsAppOutboundLog"("appointmentId");

DO $$ BEGIN
  ALTER TABLE "WhatsAppOutboundLog"
    ADD CONSTRAINT "WhatsAppOutboundLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
