-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "bookedWithoutStaffPreference" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Appointment_bookedWithoutStaffPreference_startsAt_idx" ON "Appointment"("bookedWithoutStaffPreference", "startsAt");
