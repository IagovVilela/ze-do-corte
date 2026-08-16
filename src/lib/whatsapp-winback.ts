import "server-only";

import { decryptSecret } from "@/lib/whatsapp-crypto";
import { sendWhatsAppTemplate } from "@/lib/whatsapp-meta-client";
import {
  applyMarketingOptOut,
  countWinbacksThisMonth,
  listWinbackCandidates,
  phoneKeyFromRaw,
} from "@/lib/client-profile";
import { prisma } from "@/lib/prisma";

export async function sendWinbackTemplate(opts: {
  organizationId: string;
  phoneKey: string;
}): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const templateName = process.env.META_WA_TEMPLATE_WINBACK?.trim();
  if (!templateName) {
    return {
      ok: false,
      code: "NO_TEMPLATE",
      message:
        "Configure META_WA_TEMPLATE_WINBACK (template marketing aprovado na Meta).",
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: opts.organizationId },
    select: {
      name: true,
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappAccessTokenEnc: true,
      whatsappWinbackMonthlyCap: true,
    },
  });
  if (
    !org?.whatsappBotEnabled ||
    !org.whatsappPhoneNumberId ||
    !org.whatsappAccessTokenEnc
  ) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "WhatsApp Cloud API não está ligado neste salão.",
    };
  }

  const used = await countWinbacksThisMonth(opts.organizationId);
  if (used >= org.whatsappWinbackMonthlyCap) {
    return {
      ok: false,
      code: "CAP",
      message: `Teto de ${org.whatsappWinbackMonthlyCap} reativações neste mês (fatura Meta).`,
    };
  }

  const phoneKey = phoneKeyFromRaw(opts.phoneKey);
  const profile = await prisma.clientProfile.findUnique({
    where: {
      organizationId_phoneKey: {
        organizationId: opts.organizationId,
        phoneKey,
      },
    },
  });
  if (!profile || profile.marketingOptOutAt) {
    return { ok: false, message: "Cliente recusou contato ou não tem perfil." };
  }
  if (!profile.marketingOptIn) {
    return {
      ok: false,
      message: "Sem opt-in: o cliente ainda não falou no WhatsApp do salão.",
    };
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(org.whatsappAccessTokenEnc);
  } catch {
    return { ok: false, message: "Token WhatsApp inválido." };
  }

  const firstName = (profile.displayName ?? "olá").split(/\s+/)[0] ?? "olá";
  const days = profile.lastCompletedAt
    ? String(
        Math.max(
          1,
          Math.round(
            (Date.now() - profile.lastCompletedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        ),
      )
    : "alguns";

  const result = await sendWhatsAppTemplate({
    phoneNumberId: org.whatsappPhoneNumberId,
    accessToken,
    toE164Digits: phoneKey,
    templateName,
    bodyParameters: [firstName, days, org.name],
  });

  await prisma.whatsAppOutboundLog.create({
    data: {
      organizationId: opts.organizationId,
      waUserPhone: phoneKey,
      kind: "WINBACK",
      metaMessageId: result.ok ? result.messageId : null,
      status: result.ok ? "sent" : "error",
      errorMessage: result.ok ? null : result.error,
    },
  });

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  await prisma.clientProfile.update({
    where: { id: profile.id },
    data: { lastWinbackAt: new Date() },
  });

  return { ok: true };
}

export { applyMarketingOptOut, listWinbackCandidates };
