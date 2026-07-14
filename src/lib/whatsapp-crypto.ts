import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function keyFromEnv(): Buffer | null {
  const raw = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  // Aceita 64 hex chars ou qualquer string (hash → 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return createHash("sha256").update(raw).digest();
}

export function isWhatsAppTokenEncryptionConfigured(): boolean {
  return Boolean(keyFromEnv());
}

/** Empacota iv:tag:ciphertext em base64url. */
export function encryptSecret(plain: string): string {
  const key = keyFromEnv();
  if (!key) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY não configurada — não é seguro gravar token em texto.",
    );
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptSecret(packed: string): string {
  const key = keyFromEnv();
  if (!key) {
    throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY não configurada.");
  }
  const buf = Buffer.from(packed, "base64url");
  if (buf.length < 28) throw new Error("Token cifrado inválido.");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
