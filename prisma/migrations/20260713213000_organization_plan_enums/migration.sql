-- Alinha colunas TEXT da migração Barbernegon aos enums do schema Prisma.

DO $$ BEGIN
  CREATE TYPE "OrganizationPlanStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClientSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'PAST_DUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization" ALTER COLUMN "planStatus" DROP DEFAULT;
ALTER TABLE "Organization"
  ALTER COLUMN "planStatus" TYPE "OrganizationPlanStatus"
  USING ("planStatus"::"OrganizationPlanStatus");
ALTER TABLE "Organization"
  ALTER COLUMN "planStatus" SET DEFAULT 'TRIAL'::"OrganizationPlanStatus";

ALTER TABLE "ClientSubscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ClientSubscription"
  ALTER COLUMN "status" TYPE "ClientSubscriptionStatus"
  USING ("status"::"ClientSubscriptionStatus");
ALTER TABLE "ClientSubscription"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"ClientSubscriptionStatus";
