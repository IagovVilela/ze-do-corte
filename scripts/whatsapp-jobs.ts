import { runWhatsAppReminders } from "../src/lib/whatsapp-reminders";

/** Jobs WhatsApp: lembretes 24h. Agendar no Railway Cron (ex. a cada hora). */
async function main() {
  const reminders = await runWhatsAppReminders();
  console.log(
    `[whatsapp:jobs] reminders checked=${reminders.checked} sent=${reminders.sent}`,
  );
}

main().catch((err) => {
  console.error("[whatsapp:jobs] fail", err);
  process.exit(1);
});
