import "server-only";

import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

import {
  createPublicBooking,
  cancelAppointmentById,
  rescheduleAppointmentById,
  listUpcomingByPhone,
  normalizeWaUserPhone,
  waPhoneToStored,
} from "@/lib/booking-domain";
import { listPublicAvailableSlots, resolveBookingDurationMinutes } from "@/lib/booking-availability";
import { getPopularServiceIds } from "@/lib/popular-services";
import { hasPlusFeatures } from "@/lib/org-entitlements";
import { tryWhatsAppAgentTurn } from "@/lib/whatsapp-agent-ai";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { decryptSecret } from "@/lib/whatsapp-crypto";
import {
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
} from "@/lib/whatsapp-meta-client";
import { notifyClientWhatsAppConfirmation } from "@/lib/whatsapp-notify-client";
import {
  applyMarketingOptOut,
  phoneKeyFromRaw,
  touchClientProfileInbound,
} from "@/lib/client-profile";
import { prisma } from "@/lib/prisma";

export type BotState =
  | "idle"
  | "pick_unit"
  | "pick_service"
  | "pick_addon"
  | "pick_day"
  | "pick_slot"
  | "ask_name"
  | "list_upcoming_cancel"
  | "list_upcoming_reschedule"
  | "reschedule_day"
  | "reschedule_slot"
  | "agent_slots";

type SessionContext = {
  unitId?: string;
  serviceId?: string;
  extraServiceId?: string;
  date?: string;
  time?: string;
  appointmentId?: string;
  pendingSlots?: {
    date: string;
    times: string[];
    serviceId: string;
    unitId: string;
  };
};

type OrgCreds = {
  id: string;
  name: string;
  slug: string;
  phoneNumberId: string;
  accessToken: string;
};

type Incoming = {
  from: string;
  text: string;
  buttonOrListId?: string;
};

async function sendText(org: OrgCreds, to: string, text: string) {
  return sendWhatsAppText({
    phoneNumberId: org.phoneNumberId,
    accessToken: org.accessToken,
    toE164Digits: to,
    text,
  });
}

async function sendMenu(org: OrgCreds, to: string) {
  return sendWhatsAppButtons({
    phoneNumberId: org.phoneNumberId,
    accessToken: org.accessToken,
    toE164Digits: to,
    body: `Olá! Sou o assistente da *${org.name}*.\nO que você deseja?`,
    buttons: [
      { id: "menu_book", title: "Agendar" },
      { id: "menu_reschedule", title: "Remarcar" },
      { id: "menu_cancel", title: "Cancelar" },
    ],
  });
}

async function upsertSession(
  organizationId: string,
  waUserPhone: string,
  state: BotState,
  context: SessionContext,
) {
  await prisma.whatsAppSession.upsert({
    where: {
      organizationId_waUserPhone: { organizationId, waUserPhone },
    },
    create: {
      organizationId,
      waUserPhone,
      state,
      contextJson: context,
    },
    update: {
      state,
      contextJson: context,
    },
  });
}

function ctxOf(raw: unknown): SessionContext {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as SessionContext;
  }
  return {};
}

function parseChoice(incoming: Incoming): string {
  return (incoming.buttonOrListId || incoming.text).trim().toLowerCase();
}

async function freeSlotTimes(
  organizationId: string,
  unitId: string,
  serviceId: string,
  dateStr: string,
  extraServiceId?: string,
): Promise<string[]> {
  const ids = extraServiceId ? [serviceId, extraServiceId] : [serviceId];
  const dur = await resolveBookingDurationMinutes({
    organizationId,
    unitId,
    serviceIds: ids,
  });
  if (!dur.ok) return [];

  const day = parseISO(dateStr);
  if (Number.isNaN(day.getTime())) return [];

  const result = await listPublicAvailableSlots({
    organizationId,
    unitId,
    day,
    durationMinutes: dur.durationMinutes,
  });
  return result.availableSlots.slice(0, 10);
}

async function suggestAddon(
  organizationId: string,
  unitId: string,
  primaryServiceId: string,
): Promise<{ id: string; name: string; price: number } | null> {
  const popular = await getPopularServiceIds({
    organizationId,
    unitId,
    limit: 6,
  });
  const candidateIds = popular.filter((id) => id !== primaryServiceId);
  const id = candidateIds[0];
  if (!id) {
    const other = await prisma.service.findFirst({
      where: {
        isActive: true,
        id: { not: primaryServiceId },
        unit: { organizationId },
        OR: [
          { unitId },
          { unitOverrides: { some: { unitId, isActive: true } } },
        ],
      },
      orderBy: { price: "desc" },
      select: { id: true, name: true, price: true },
    });
    return other
      ? { id: other.id, name: other.name, price: Number(other.price) }
      : null;
  }
  const row = await prisma.service.findFirst({
    where: { id, unit: { organizationId } },
    select: { id: true, name: true, price: true },
  });
  return row
    ? { id: row.id, name: row.name, price: Number(row.price) }
    : null;
}

export async function handleWhatsAppInbound(options: {
  organizationId: string;
  incoming: Incoming;
}): Promise<void> {
  const orgRow = await prisma.organization.findUnique({
    where: { id: options.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappAccessTokenEnc: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      planCancelAt: true,
    },
  });
  if (
    !orgRow?.whatsappBotEnabled ||
    !orgRow.whatsappPhoneNumberId ||
    !orgRow.whatsappAccessTokenEnc
  ) {
    return;
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(orgRow.whatsappAccessTokenEnc);
  } catch {
    return;
  }

  const org: OrgCreds = {
    id: orgRow.id,
    name: orgRow.name,
    slug: orgRow.slug,
    phoneNumberId: orgRow.whatsappPhoneNumberId,
    accessToken,
  };

  const to = normalizeWaUserPhone(options.incoming.from);
  await touchClientProfileInbound({
    organizationId: org.id,
    phoneKey: phoneKeyFromRaw(to),
    grantMarketingOptIn: true,
  });

  const session = await prisma.whatsAppSession.findUnique({
    where: {
      organizationId_waUserPhone: {
        organizationId: org.id,
        waUserPhone: to,
      },
    },
  });

  let state = (session?.state as BotState) || "idle";
  let ctx = ctxOf(session?.contextJson);
  const choice = parseChoice(options.incoming);
  const rawText = options.incoming.text.trim();
  const optOut =
    /^(pare|parar|sair|stop|cancelar mensagens|não quero mais|nao quero mais)$/i.test(
      rawText,
    ) || choice === "pare";
  if (optOut) {
    await applyMarketingOptOut({
      organizationId: org.id,
      phoneKey: phoneKeyFromRaw(to),
    });
    await sendText(
      org,
      to,
      "Ok — não vamos mais te chamar para voltar a cortar. Se quiser agendar, é só mandar oi.",
    );
    return;
  }

  if (
    ["menu", "oi", "olá", "ola", "inicio", "início", "help", "ajuda"].includes(
      choice,
    )
  ) {
    await upsertSession(org.id, to, "idle", {});
    await sendMenu(org, to);
    return;
  }

  const plus = hasPlusFeatures({
    planStatus: orgRow.planStatus,
    planTier: orgRow.planTier,
    trialEndsAt: orgRow.trialEndsAt,
    planCancelAt: orgRow.planCancelAt,
  });

  if (
    plus &&
    !options.incoming.buttonOrListId &&
    (state === "idle" || state === "agent_slots") &&
    rawText.length >= 2
  ) {
    const handled = await tryWhatsAppAgentTurn({
      organizationId: org.id,
      orgName: org.name,
      phoneNumberId: org.phoneNumberId,
      accessToken: org.accessToken,
      waUserPhone: to,
      text: rawText,
      sessionState: state,
      sessionContext: ctx as Record<string, unknown>,
      saveSession: (st, context) =>
        upsertSession(org.id, to, st as BotState, context as SessionContext),
    });
    if (handled) return;
  }

  if (state === "idle") {
    if (choice === "menu_book" || choice.includes("agendar") || (!plus && choice === "1")) {
      const units = await prisma.barbershopUnit.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      if (units.length === 0) {
        await sendText(org, to, "Nenhuma unidade ativa no momento.");
        return;
      }
      if (units.length === 1) {
        ctx = { unitId: units[0]!.id };
        await upsertSession(org.id, to, "pick_service", ctx);
        await sendServices(org, to, units[0]!.id);
        return;
      }
      await upsertSession(org.id, to, "pick_unit", ctx);
      await sendWhatsAppList({
        phoneNumberId: org.phoneNumberId,
        accessToken: org.accessToken,
        toE164Digits: to,
        body: "Escolha a unidade:",
        buttonLabel: "Unidades",
        sectionTitle: "Lojas",
        rows: units.map((u) => ({
          id: `unit:${u.id}`,
          title: u.name,
          description: u.city ?? undefined,
        })),
      });
      return;
    }

    if (
      choice === "menu_cancel" ||
      choice === "3" ||
      choice.includes("cancel")
    ) {
      await startListFlow(org, to, "list_upcoming_cancel");
      return;
    }

    if (
      choice === "menu_reschedule" ||
      choice === "2" ||
      choice.includes("remarcar")
    ) {
      await startListFlow(org, to, "list_upcoming_reschedule");
      return;
    }

    await sendMenu(org, to);
    return;
  }

  if (state === "pick_unit") {
    const id = choice.startsWith("unit:") ? choice.slice(5) : choice;
    const unit = await prisma.barbershopUnit.findFirst({
      where: { id, organizationId: org.id, isActive: true },
    });
    if (!unit) {
      await sendText(org, to, "Unidade inválida. Digite *menu* para recomeçar.");
      return;
    }
    ctx = { unitId: unit.id };
    await upsertSession(org.id, to, "pick_service", ctx);
    await sendServices(org, to, unit.id);
    return;
  }

  if (state === "pick_service") {
    const id = choice.startsWith("svc:") ? choice.slice(4) : choice;
    if (!ctx.unitId) {
      await upsertSession(org.id, to, "idle", {});
      await sendMenu(org, to);
      return;
    }
    const service = await prisma.service.findFirst({
      where: {
        id,
        unit: { organizationId: org.id },
        OR: [
          { unitId: ctx.unitId },
          { unitOverrides: { some: { unitId: ctx.unitId, isActive: true } } },
        ],
      },
    });
    if (!service) {
      await sendText(org, to, "Serviço inválido. Escolha da lista.");
      await sendServices(org, to, ctx.unitId);
      return;
    }
    ctx = { ...ctx, serviceId: service.id };
    const addon = await suggestAddon(org.id, ctx.unitId!, service.id);
    if (addon) {
      await upsertSession(org.id, to, "pick_addon", ctx);
      await sendWhatsAppButtons({
        phoneNumberId: org.phoneNumberId,
        accessToken: org.accessToken,
        toE164Digits: to,
        body: `Quer acrescentar *${addon.name}* (R$ ${addon.price.toFixed(2).replace(".", ",")})? Pode recusar.`,
        buttons: [
          { id: `addon:${addon.id}`, title: "Sim, incluir" },
          { id: "addon:skip", title: "Não, só esse" },
        ],
      });
      return;
    }
    await upsertSession(org.id, to, "pick_day", ctx);
    await sendDays(org, to);
    return;
  }

  if (state === "pick_addon") {
    if (!ctx.unitId || !ctx.serviceId) {
      await upsertSession(org.id, to, "idle", {});
      await sendMenu(org, to);
      return;
    }
    if (choice === "addon:skip" || choice.includes("não") || choice.includes("nao")) {
      ctx = { ...ctx, extraServiceId: undefined };
    } else if (choice.startsWith("addon:")) {
      ctx = { ...ctx, extraServiceId: choice.slice(6) };
    }
    await upsertSession(org.id, to, "pick_day", ctx);
    await sendDays(org, to);
    return;
  }

  if (state === "pick_day" || state === "reschedule_day") {
    const dateStr = choice.startsWith("day:") ? choice.slice(4) : choice;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      await sendText(org, to, "Data inválida. Escolha um dia da lista.");
      await sendDays(org, to);
      return;
    }
    ctx = { ...ctx, date: dateStr };
    const nextState: BotState =
      state === "reschedule_day" ? "reschedule_slot" : "pick_slot";
    await upsertSession(org.id, to, nextState, ctx);

    if (nextState === "reschedule_slot" && ctx.appointmentId) {
      const ap = await prisma.appointment.findFirst({
        where: {
          id: ctx.appointmentId,
          unit: { organizationId: org.id },
        },
      });
      if (!ap?.unitId) {
        await sendText(org, to, "Agendamento inválido.");
        return;
      }
      const times = await freeSlotTimes(
        org.id,
        ap.unitId,
        ap.serviceId,
        dateStr,
      );
      await sendSlots(org, to, times);
      return;
    }

    if (ctx.unitId && ctx.serviceId) {
      const times = await freeSlotTimes(
        org.id,
        ctx.unitId,
        ctx.serviceId,
        dateStr,
        ctx.extraServiceId,
      );
      await sendSlots(org, to, times);
    }
    return;
  }

  if (state === "pick_slot") {
    const timeStr = choice.startsWith("slot:") ? choice.slice(5) : choice;
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      await sendText(org, to, "Horário inválido. Escolha da lista.");
      return;
    }
    ctx = { ...ctx, time: timeStr };
    await upsertSession(org.id, to, "ask_name", ctx);
    await sendText(
      org,
      to,
      "Qual o seu *nome completo* para confirmar o agendamento?",
    );
    return;
  }

  if (state === "ask_name") {
    const name = rawText.slice(0, 80);
    if (name.length < 2) {
      await sendText(org, to, "Informe um nome válido.");
      return;
    }
    if (!ctx.unitId || !ctx.serviceId || !ctx.date || !ctx.time) {
      await upsertSession(org.id, to, "idle", {});
      await sendMenu(org, to);
      return;
    }
    const pref = await prisma.clientProfile.findUnique({
      where: {
        organizationId_phoneKey: {
          organizationId: org.id,
          phoneKey: phoneKeyFromRaw(to),
        },
      },
      select: { preferredStaffMemberId: true },
    });
    let staffMemberId: string | undefined;
    if (pref?.preferredStaffMemberId) {
      const st = await prisma.staffMember.findFirst({
        where: {
          id: pref.preferredStaffMemberId,
          organizationId: org.id,
          unitId: ctx.unitId,
        },
        select: { id: true },
      });
      staffMemberId = st?.id;
    }
    const created = await createPublicBooking({
      organizationId: org.id,
      unitId: ctx.unitId,
      serviceId: ctx.serviceId,
      extraServiceIds: ctx.extraServiceId ? [ctx.extraServiceId] : undefined,
      date: ctx.date,
      time: ctx.time,
      customerName: name,
      customerPhone: waPhoneToStored(to),
      bookingSource: "whatsapp",
      staffMemberId,
    });
    if (!created.ok) {
      await sendText(
        org,
        to,
        `${created.message}\n\nDigite *menu* para tentar de novo.`,
      );
      return;
    }
    void notifyClientWhatsAppConfirmation({
      organizationId: org.id,
      appointment: created.appointment,
    });
    const when = formatInTimeZone(
      created.appointment.startsAt,
      BARBER_TIMEZONE,
      "dd/MM/yyyy HH:mm",
    );
    await upsertSession(org.id, to, "idle", {});
    await sendText(
      org,
      to,
      `Pronto, ${name}! ✅\n\n*${created.appointment.service.name}*\n${when}\n\nDigite *menu* para remarcar ou cancelar.`,
    );
    return;
  }

  if (state === "list_upcoming_cancel" || state === "list_upcoming_reschedule") {
    const id = choice.startsWith("ap:") ? choice.slice(3) : choice;
    const list = await listUpcomingByPhone({
      organizationId: org.id,
      waUserPhone: to,
    });
    const ap = list.find((a) => a.id === id);
    if (!ap) {
      await sendText(org, to, "Opção inválida. Digite *menu*.");
      return;
    }
    if (state === "list_upcoming_cancel") {
      const result = await cancelAppointmentById({
        appointmentId: ap.id,
        organizationId: org.id,
      });
      await upsertSession(org.id, to, "idle", {});
      if (!result.ok) {
        await sendText(org, to, result.message);
        return;
      }
      await sendText(
        org,
        to,
        `Cancelado: *${result.appointment.service.name}* em ${formatInTimeZone(result.appointment.startsAt, BARBER_TIMEZONE, "dd/MM HH:mm")}.`,
      );
      return;
    }
    ctx = { appointmentId: ap.id };
    await upsertSession(org.id, to, "reschedule_day", ctx);
    await sendDays(org, to);
    return;
  }

  if (state === "reschedule_slot") {
    const timeStr = choice.startsWith("slot:") ? choice.slice(5) : choice;
    if (!ctx.appointmentId || !ctx.date || !/^\d{2}:\d{2}$/.test(timeStr)) {
      await sendText(org, to, "Dados incompletos. Digite *menu*.");
      return;
    }
    const result = await rescheduleAppointmentById({
      appointmentId: ctx.appointmentId,
      organizationId: org.id,
      date: ctx.date,
      time: timeStr,
    });
    await upsertSession(org.id, to, "idle", {});
    if (!result.ok) {
      await sendText(org, to, result.message);
      return;
    }
    await sendText(
      org,
      to,
      `Remarcado! ✅\n*${result.appointment.service.name}*\n${formatInTimeZone(result.appointment.startsAt, BARBER_TIMEZONE, "dd/MM/yyyy HH:mm")}`,
    );
    return;
  }

  await sendMenu(org, to);
}

async function sendServices(org: OrgCreds, to: string, unitId: string) {
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      unit: { organizationId: org.id },
      OR: [
        { unitId },
        { unitOverrides: { some: { unitId, isActive: true } } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
  });
  if (!services.length) {
    await sendText(org, to, "Sem serviços ativos nesta unidade.");
    return;
  }
  await sendWhatsAppList({
    phoneNumberId: org.phoneNumberId,
    accessToken: org.accessToken,
    toE164Digits: to,
    body: "Escolha o serviço:",
    buttonLabel: "Serviços",
    sectionTitle: "Catálogo",
    rows: services.map((s) => ({
      id: `svc:${s.id}`,
      title: s.name,
      description: `${s.durationMinutes} min`,
    })),
  });
}

async function sendDays(org: OrgCreds, to: string) {
  const now = toZonedTime(new Date(), BARBER_TIMEZONE);
  const rows: { id: string; title: string; description?: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const d = addDays(now, i);
    if (d.getDay() === 0) continue;
    const id = format(d, "yyyy-MM-dd");
    rows.push({
      id: `day:${id}`,
      title: format(d, "dd/MM"),
      description: format(d, "EEEE", { locale: ptBR }),
    });
    if (rows.length >= 10) break;
  }
  await sendWhatsAppList({
    phoneNumberId: org.phoneNumberId,
    accessToken: org.accessToken,
    toE164Digits: to,
    body: "Escolha o dia:",
    buttonLabel: "Dias",
    sectionTitle: "Agenda",
    rows,
  });
}

async function sendSlots(org: OrgCreds, to: string, times: string[]) {
  if (!times.length) {
    await sendText(
      org,
      to,
      "Nenhum horário livre nesse dia. Escolha outro dia (*menu*).",
    );
    return;
  }
  await sendWhatsAppList({
    phoneNumberId: org.phoneNumberId,
    accessToken: org.accessToken,
    toE164Digits: to,
    body: "Escolha o horário:",
    buttonLabel: "Horários",
    sectionTitle: "Livres",
    rows: times.map((t) => ({ id: `slot:${t}`, title: t })),
  });
}

async function startListFlow(
  org: OrgCreds,
  to: string,
  state: "list_upcoming_cancel" | "list_upcoming_reschedule",
) {
  const list = await listUpcomingByPhone({
    organizationId: org.id,
    waUserPhone: to,
  });
  if (!list.length) {
    await sendText(org, to, "Você não tem horários futuros nesta barbearia.");
    await upsertSession(org.id, to, "idle", {});
    return;
  }
  await upsertSession(org.id, to, state, {});
  await sendWhatsAppList({
    phoneNumberId: org.phoneNumberId,
    accessToken: org.accessToken,
    toE164Digits: to,
    body:
      state === "list_upcoming_cancel"
        ? "Qual agendamento cancelar?"
        : "Qual agendamento remarcar?",
    buttonLabel: "Reservas",
    sectionTitle: "Próximos",
    rows: list.map((a) => ({
      id: `ap:${a.id}`,
      title: a.service.name.slice(0, 24),
      description: formatInTimeZone(
        a.startsAt,
        BARBER_TIMEZONE,
        "dd/MM HH:mm",
      ),
    })),
  });
}
