-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'SUPPORT_CONSULTANT';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'SUPPORT_ASSIST';

-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SupportAccessAction" AS ENUM ('VIEW_TICKET', 'VIEW_ORG', 'REPLY', 'ASSIST_LOGIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportAccessLog" (
  "id" TEXT NOT NULL,
  "consultantStaffId" TEXT NOT NULL,
  "organizationId" TEXT,
  "ticketId" TEXT,
  "action" "SupportAccessAction" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportAccessLog_consultantStaffId_createdAt_idx"
  ON "SupportAccessLog"("consultantStaffId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportAccessLog_organizationId_createdAt_idx"
  ON "SupportAccessLog"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportAccessLog_ticketId_idx"
  ON "SupportAccessLog"("ticketId");

DO $$ BEGIN
  ALTER TABLE "SupportAccessLog"
    ADD CONSTRAINT "SupportAccessLog_consultantStaffId_fkey"
    FOREIGN KEY ("consultantStaffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupportAccessLog"
    ADD CONSTRAINT "SupportAccessLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
