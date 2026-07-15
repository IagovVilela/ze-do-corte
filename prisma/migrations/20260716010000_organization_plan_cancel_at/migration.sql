-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "planCancelAt" TIMESTAMP(3);
