import "server-only";

function trimmed(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    trimmed("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && trimmed("VAPID_PRIVATE_KEY"),
  );
}

export function getVapidWebPushOptions(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey = trimmed("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = trimmed("VAPID_PRIVATE_KEY");
  const subject = trimmed("VAPID_SUBJECT") ?? "mailto:noreply@localhost";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys ausentes");
  }
  return { publicKey, privateKey, subject };
}
