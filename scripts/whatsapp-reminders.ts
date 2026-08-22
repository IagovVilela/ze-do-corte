import { runWhatsAppReminders } from "../src/lib/whatsapp-reminders";

async function main() {
  const result = await runWhatsAppReminders();
  console.log(
    `[whatsapp:reminders] checked=${result.checked} sent=${result.sent} day=${result.sentDay} near=${result.sentNear}`,
  );
}

main().catch((err) => {
  console.error("[whatsapp:reminders] fail", err);
  process.exit(1);
});
