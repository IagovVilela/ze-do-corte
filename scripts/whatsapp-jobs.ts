import { runWhatsAppReminders } from "../src/lib/whatsapp-reminders";

/** Jobs WhatsApp: lembretes ~24h e ~2h. Agendar no Railway Cron (ex. a cada 15–30 min). */
async function main() {
  const reminders = await runWhatsAppReminders();
  console.log(
    `[whatsapp:jobs] checked=${reminders.checked} sent=${reminders.sent} day=${reminders.sentDay} near=${reminders.sentNear}`,
  );
}

main().catch((err) => {
  console.error("[whatsapp:jobs] fail", err);
  process.exit(1);
});
