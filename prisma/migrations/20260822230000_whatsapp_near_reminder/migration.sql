-- Lembrete WhatsApp próximo do horário (~2h).
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "whatsappNearReminderSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Appointment_whatsappNearReminderSentAt_startsAt_idx"
  ON "Appointment"("whatsappNearReminderSentAt", "startsAt");
