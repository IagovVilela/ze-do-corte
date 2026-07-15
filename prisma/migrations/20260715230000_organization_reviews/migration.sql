-- Avaliações marketplace + cache de média na Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "ratingAvg" DECIMAL(3,2);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "OrganizationReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "clientName" TEXT,
    "clientPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationReview_appointmentId_key" ON "OrganizationReview"("appointmentId");
CREATE INDEX IF NOT EXISTS "OrganizationReview_organizationId_idx" ON "OrganizationReview"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationReview_clientPhone_organizationId_idx" ON "OrganizationReview"("clientPhone", "organizationId");

DO $$ BEGIN
  ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
