-- Barbernegon: Organization tenant + subscriptions + org scoping

-- 1) Organization
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "planStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "logoUrl" TEXT,
    "primaryColor" VARCHAR(16),
    "slogan" VARCHAR(160),
    "sloganSecondary" VARCHAR(200),
    "heroMediaUrl" TEXT,
    "aboutText" TEXT,
    "instagramHref" TEXT,
    "whatsappHref" TEXT,
    "phoneLabel" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "onboardingJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_planStatus_idx" ON "Organization"("planStatus");

-- Seed default org (Zé do Corte)
INSERT INTO "Organization" ("id", "name", "slug", "planStatus", "slogan", "sloganSecondary", "primaryColor", "timezone", "updatedAt")
SELECT
  'org_ze_do_corte_default',
  'Zé do Corte',
  'ze-do-corte',
  'ACTIVE',
  'Estilo e confiança',
  'Experiências únicas para homens únicos',
  '#f59e0b',
  'America/Sao_Paulo',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Organization" WHERE "slug" = 'ze-do-corte');

-- 2) BarbershopUnit.organizationId
ALTER TABLE "BarbershopUnit" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "BarbershopUnit"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ze-do-corte' LIMIT 1)
WHERE "organizationId" IS NULL;

ALTER TABLE "BarbershopUnit" ALTER COLUMN "organizationId" SET NOT NULL;

-- Drop global slug unique if exists, add composite
DO $$ BEGIN
  ALTER TABLE "BarbershopUnit" DROP CONSTRAINT IF EXISTS "BarbershopUnit_slug_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DROP INDEX IF EXISTS "BarbershopUnit_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "BarbershopUnit_organizationId_slug_key"
  ON "BarbershopUnit"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "BarbershopUnit_organizationId_idx" ON "BarbershopUnit"("organizationId");

DO $$ BEGIN
  ALTER TABLE "BarbershopUnit"
    ADD CONSTRAINT "BarbershopUnit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) StaffMember.organizationId
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "StaffMember"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ze-do-corte' LIMIT 1)
WHERE "organizationId" IS NULL;

ALTER TABLE "StaffMember" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "StaffMember_organizationId_idx" ON "StaffMember"("organizationId");

DO $$ BEGIN
  ALTER TABLE "StaffMember"
    ADD CONSTRAINT "StaffMember_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) BarbershopSetting.organizationId + composite unique
ALTER TABLE "BarbershopSetting" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "BarbershopSetting"
SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ze-do-corte' LIMIT 1)
WHERE "organizationId" IS NULL;

ALTER TABLE "BarbershopSetting" ALTER COLUMN "organizationId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "BarbershopSetting" DROP CONSTRAINT IF EXISTS "BarbershopSetting_key_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DROP INDEX IF EXISTS "BarbershopSetting_key_key";

CREATE UNIQUE INDEX IF NOT EXISTS "BarbershopSetting_organizationId_key_key"
  ON "BarbershopSetting"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "BarbershopSetting_organizationId_idx" ON "BarbershopSetting"("organizationId");

DO $$ BEGIN
  ALTER TABLE "BarbershopSetting"
    ADD CONSTRAINT "BarbershopSetting_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) Appointment.amountPaid + usedSubscriptionId
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(10,2);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "usedSubscriptionId" TEXT;
CREATE INDEX IF NOT EXISTS "Appointment_usedSubscriptionId_idx" ON "Appointment"("usedSubscriptionId");

-- 6) Subscription tables
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "cycleDays" INTEGER NOT NULL DEFAULT 30,
    "visitsIncluded" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_organizationId_name_key"
  ON "SubscriptionPlan"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_organizationId_idx" ON "SubscriptionPlan"("organizationId");

DO $$ BEGIN
  ALTER TABLE "SubscriptionPlan"
    ADD CONSTRAINT "SubscriptionPlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SubscriptionPlanService" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "SubscriptionPlanService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlanService_planId_serviceId_key"
  ON "SubscriptionPlanService"("planId", "serviceId");
CREATE INDEX IF NOT EXISTS "SubscriptionPlanService_serviceId_idx" ON "SubscriptionPlanService"("serviceId");

DO $$ BEGIN
  ALTER TABLE "SubscriptionPlanService"
    ADD CONSTRAINT "SubscriptionPlanService_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SubscriptionPlanService"
    ADD CONSTRAINT "SubscriptionPlanService_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClientSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "visitsUsed" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" VARCHAR(240),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientSubscription_organizationId_idx" ON "ClientSubscription"("organizationId");
CREATE INDEX IF NOT EXISTS "ClientSubscription_planId_idx" ON "ClientSubscription"("planId");
CREATE INDEX IF NOT EXISTS "ClientSubscription_clientPhone_idx" ON "ClientSubscription"("clientPhone");
CREATE INDEX IF NOT EXISTS "ClientSubscription_status_idx" ON "ClientSubscription"("status");

DO $$ BEGIN
  ALTER TABLE "ClientSubscription"
    ADD CONSTRAINT "ClientSubscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClientSubscription"
    ADD CONSTRAINT "ClientSubscription_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_usedSubscriptionId_fkey"
    FOREIGN KEY ("usedSubscriptionId") REFERENCES "ClientSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
