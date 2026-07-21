import "server-only";

import type { SupportTicketCategory } from "@prisma/client";
import { Resend } from "resend";

import {
  getSupportContact,
  PLATFORM_SUPPORT_DISPLAY_NAME,
  SUPPORT_TICKET_CATEGORY_LABEL,
} from "@/lib/support";

export type PlatformSupportTicketNotify = {
  ticketId: string;
  subject: string;
  category: SupportTicketCategory;
  organizationName: string;
  organizationSlug: string;
  staffName: string;
  bodyPreview: string;
};

/**
 * Avisa o time Ops (e-mail em SUPPORT_EMAIL) quando um salão abre chamado.
 * Sem RESEND_* ou SUPPORT_EMAIL, só registra no log (dev) — o toast do Ops
 * continua avisando quem estiver com `/plataforma` aberto.
 */
export async function notifyPlatformNewSupportTicket(
  payload: PlatformSupportTicketNotify,
): Promise<void> {
  const to = getSupportContact().email;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const categoryLabel =
    SUPPORT_TICKET_CATEGORY_LABEL[payload.category] ?? payload.category;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim() || "";
  const inboxUrl = appUrl
    ? `${appUrl}/plataforma/suporte`
    : "/plataforma/suporte";

  const text = [
    `${PLATFORM_SUPPORT_DISPLAY_NAME},`,
    "",
    "Novo chamado de suporte:",
    `Assunto: ${payload.subject}`,
    `Categoria: ${categoryLabel}`,
    `Barbearia: ${payload.organizationName} (${payload.organizationSlug})`,
    `Quem abriu: ${payload.staffName}`,
    "",
    payload.bodyPreview.slice(0, 400),
    "",
    `Abrir inbox: ${inboxUrl}`,
  ].join("\n");

  if (!to || !apiKey || !from) {
    console.info(
      "[support-notify] novo chamado (sem e-mail — configure SUPPORT_EMAIL + RESEND_*):",
      payload.subject,
      payload.organizationName,
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `[Chamado] ${payload.organizationName} — ${payload.subject}`,
      text,
      html: `
        <p><strong>Novo chamado</strong> para ${PLATFORM_SUPPORT_DISPLAY_NAME}.</p>
        <ul>
          <li><strong>Assunto:</strong> ${escapeHtml(payload.subject)}</li>
          <li><strong>Categoria:</strong> ${escapeHtml(categoryLabel)}</li>
          <li><strong>Barbearia:</strong> ${escapeHtml(payload.organizationName)} (${escapeHtml(payload.organizationSlug)})</li>
          <li><strong>Quem abriu:</strong> ${escapeHtml(payload.staffName)}</li>
        </ul>
        <p>${escapeHtml(payload.bodyPreview.slice(0, 400))}</p>
        <p><a href="${escapeHtml(inboxUrl)}">Abrir inbox Ops</a></p>
      `.trim(),
    });
    if (error) console.error("[support-notify] Resend:", error);
  } catch (err) {
    console.error("[support-notify] falha ao enviar", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
