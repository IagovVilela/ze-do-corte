import "server-only";

import { parseISO } from "date-fns";

import { isAdminAiEnabled, callAdminAiChat, parseAiJsonObject } from "@/lib/admin-ai-llm";
import { listPublicAvailableSlots, resolveBookingDurationMinutes } from "@/lib/booking-availability";
import {
  cancelAppointmentById,
  createPublicBooking,
  listUpcomingByPhone,
  waPhoneToStored,
} from "@/lib/booking-domain";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp-meta-client";

type AgentJson = {
  tool?: string;
  text?: string;
  date?: string;
  serviceQuery?: string;
  slotIndex?: number;
  customerName?: string;
};

function matchService(
  catalog: { id: string; name: string }[],
  query: string,
): { id: string; name: string } | null {
  const q = query.trim().toLowerCase();
  if (!q) return catalog[0] ?? null;
  const exact = catalog.find((s) => s.name.toLowerCase() === q);
  if (exact) return exact;
  const part = catalog.find(
    (s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()),
  );
  return part ?? catalog[0] ?? null;
}

/**
 * Interpreta texto livre (Plus+). Nunca cria horário sem o cliente escolher 1/2/3.
 * Devolve true se respondeu (não cair no menu FSM).
 */
export async function tryWhatsAppAgentTurn(opts: {
  organizationId: string;
  orgName: string;
  phoneNumberId: string;
  accessToken: string;
  waUserPhone: string;
  text: string;
  sessionState: string;
  sessionContext: Record<string, unknown>;
  saveSession: (
    state: string,
    context: Record<string, unknown>,
  ) => Promise<void>;
}): Promise<boolean> {
  if (!isAdminAiEnabled()) return false;

  const send = (text: string) =>
    sendWhatsAppText({
      phoneNumberId: opts.phoneNumberId,
      accessToken: opts.accessToken,
      toE164Digits: opts.waUserPhone,
      text,
    });

  const ctx = opts.sessionContext;
  const pending = ctx.pendingSlots as
    | { date: string; times: string[]; serviceId: string; unitId: string }
    | undefined;

  const digit = opts.text.trim();
  if (
    pending &&
    (opts.sessionState === "agent_slots" || opts.sessionState === "idle") &&
    /^[123]$/.test(digit)
  ) {
    const idx = Number(digit) - 1;
    const time = pending.times[idx];
    if (!time) {
      await send("Escolha 1, 2 ou 3.");
      return true;
    }
    const profile = await prisma.clientProfile.findUnique({
      where: {
        organizationId_phoneKey: {
          organizationId: opts.organizationId,
          phoneKey: opts.waUserPhone,
        },
      },
    });
    const name =
      (typeof ctx.customerName === "string" && ctx.customerName.length >= 2
        ? ctx.customerName
        : null) ||
      profile?.displayName ||
      "Cliente";
    const extra =
      typeof ctx.extraServiceId === "string" ? ctx.extraServiceId : undefined;
    const created = await createPublicBooking({
      organizationId: opts.organizationId,
      unitId: pending.unitId,
      serviceId: pending.serviceId,
      extraServiceIds: extra ? [extra] : undefined,
      date: pending.date,
      time,
      customerName: name.slice(0, 80),
      customerPhone: waPhoneToStored(opts.waUserPhone),
      bookingSource: "whatsapp",
    });
    await opts.saveSession("idle", {});
    if (!created.ok) {
      await send(`${created.message}\nDigite *menu* ou descreva outro horário.`);
      return true;
    }
    await send(
      `Pronto! ✅\n*${created.appointment.service.name}*\n${formatInTimeZone(created.appointment.startsAt, BARBER_TIMEZONE, "dd/MM/yyyy HH:mm")}\n\nResponda *1*, *2* ou *3* só quando eu listar horários. Digite *menu* para o teclado.`,
    );
    return true;
  }

  const units = await prisma.barbershopUnit.findMany({
    where: { organizationId: opts.organizationId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  const unitId = units[0]?.id;
  if (!unitId) {
    await send("Nenhuma unidade ativa.");
    return true;
  }

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      unit: { organizationId: opts.organizationId },
      OR: [
        { unitId },
        { unitOverrides: { some: { unitId, isActive: true } } },
      ],
    },
    select: { id: true, name: true, durationMinutes: true, price: true },
    take: 20,
  });

  const upcoming = await listUpcomingByPhone({
    organizationId: opts.organizationId,
    waUserPhone: opts.waUserPhone,
  });

  const catalog = services
    .map((s) => `${s.name} (${s.durationMinutes}min, R$${Number(s.price)})`)
    .join("; ");

  const raw = await callAdminAiChat({
    timeoutMs: 8000,
    temperature: 0.2,
    system: `Você é o assistente de agenda da barbearia ${opts.orgName} no WhatsApp (pt-BR).
Nunca invente horário. Nunca confirme reserva nesta resposta — só proponha 2 ou 3 horários via tool list_slots.
JSON único, sem markdown:
{"tool":"reply"|"list_slots"|"cancel_next"|"menu","text":"...","date":"AAAA-MM-DD","serviceQuery":"nome do serviço"}
- reply: conversa curta
- list_slots: precisa date (AAAA-MM-DD) e serviceQuery
- cancel_next: cancelar o próximo horário do cliente
- menu: pedir o menu de botões
Catálogo: ${catalog || "vazio"}
Hoje (America/Sao_Paulo): use datas reais. Domingo a loja fecha.`,
    user: `Mensagem do cliente: ${opts.text.slice(0, 400)}
Próximos horários: ${upcoming.map((a) => `${a.service.name} ${formatInTimeZone(a.startsAt, BARBER_TIMEZONE, "dd/MM HH:mm")}`).join(" | ") || "nenhum"}`,
  });

  const parsed = raw ? (parseAiJsonObject(raw) as AgentJson | null) : null;
  if (!parsed || typeof parsed !== "object") return false;

  const tool = parsed.tool ?? "reply";

  if (tool === "menu") {
    return false;
  }

  if (tool === "cancel_next") {
    const next = upcoming[0];
    if (!next) {
      await send("Você não tem horário futuro para cancelar.");
      return true;
    }
    const result = await cancelAppointmentById({
      appointmentId: next.id,
      organizationId: opts.organizationId,
    });
    await send(result.ok ? "Cancelado." : result.message);
    return true;
  }

  if (tool === "list_slots") {
    const dateStr = parsed.date ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      await send("Me diga o dia (ex.: amanhã ou 20/08).");
      return true;
    }
    const svc = matchService(services, parsed.serviceQuery ?? "");
    if (!svc) {
      await send("Não achei esse serviço. Digite *menu* e escolha na lista.");
      return true;
    }
    const dur = await resolveBookingDurationMinutes({
      organizationId: opts.organizationId,
      unitId,
      serviceIds: [svc.id],
    });
    if (!dur.ok) {
      await send(dur.message);
      return true;
    }
    const day = parseISO(dateStr);
    const slots = await listPublicAvailableSlots({
      organizationId: opts.organizationId,
      unitId,
      day,
      durationMinutes: dur.durationMinutes,
    });
    const times = slots.availableSlots.slice(0, 3);
    if (!times.length) {
      await send("Sem vaga nesse dia. Quer outro dia?");
      return true;
    }
    await opts.saveSession("agent_slots", {
      pendingSlots: {
        date: dateStr,
        times,
        serviceId: svc.id,
        unitId,
      },
    });
    await send(
      `*${svc.name}* em ${dateStr}:\n${times.map((t, i) => `${i + 1}) ${t}`).join("\n")}\n\nResponda *1*, *2* ou *3* para confirmar. Não invento horário.`,
    );
    return true;
  }

  const text = (parsed.text ?? "").trim();
  if (text.length >= 2) {
    await send(text.slice(0, 900));
    return true;
  }
  return false;
}
