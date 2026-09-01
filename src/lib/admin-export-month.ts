import "server-only";

import { endOfMonth, startOfMonth } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

import { buildClubHealthBuckets } from "@/lib/club-health";
import { buildDreSnapshot } from "@/lib/finance-dre";
import { buildCashFlowSnapshot } from "@/lib/finance-cashflow";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { StaffAccess } from "@/lib/staff-access";
import { appointmentScopeWhere } from "@/lib/staff-access";
import { brPhoneDigits } from "@/lib/br-phone-format";

function monthRange(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const wall = startOfMonth(new Date(y!, m! - 1, 1));
  const zStart = toZonedTime(wall, BARBER_TIMEZONE);
  const start = fromZonedTime(
    `${format(zStart, "yyyy-MM-dd")}T00:00:00`,
    BARBER_TIMEZONE,
  );
  const monthEnd = endOfMonth(zStart);
  const end = fromZonedTime(
    `${format(monthEnd, "yyyy-MM-dd")}T23:59:59`,
    BARBER_TIMEZONE,
  );
  return { start, end };
}

function gross(a: {
  amountPaid: { toString(): string } | number | null;
  service: { price: { toString(): string } | number; name: string };
  items: { price: { toString(): string } | number }[];
  products: { unitPrice: { toString(): string } | number; quantity: number }[];
}) {
  if (a.amountPaid != null) return Number(a.amountPaid);
  return (
    Number(a.service.price) +
    a.items.reduce((s, i) => s + Number(i.price), 0) +
    a.products.reduce((s, p) => s + Number(p.unitPrice) * p.quantity, 0)
  );
}

/**
 * Pacote mensal XLSX (estilo Cash Barber): faturamento, ranking, top serviços,
 * retenção/CRM e clube.
 */
export async function buildMonthlyExportPack(options: {
  access: StaffAccess;
  yearMonth: string;
}): Promise<{
  sheets: Record<string, Record<string, string | number>[]>;
  filename: string;
}> {
  const { access, yearMonth } = options;
  const { start, end } = monthRange(yearMonth);
  const orgId = access.organizationId;

  const appointments = await prisma.appointment.findMany({
    where: {
      ...appointmentScopeWhere(access),
      paidAt: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      paidAt: true,
      amountPaid: true,
      staffMemberId: true,
      service: { select: { name: true, price: true } },
      items: { select: { price: true, service: { select: { name: true } } } },
      products: { select: { quantity: true, unitPrice: true } },
      unit: { select: { name: true } },
    },
    orderBy: { paidAt: "asc" },
  });

  const staff = await prisma.staffMember.findMany({
    where: { organizationId: orgId, role: { in: ["STAFF", "ADMIN", "OWNER"] } },
    select: { id: true, displayName: true, email: true },
  });
  const staffLabel = new Map(
    staff.map((s) => [s.id, s.displayName?.trim() || s.email]),
  );

  const faturamento = appointments.map((a) => ({
    Cliente: a.clientName,
    Telefone: a.clientPhone,
    Servico: a.service.name,
    Unidade: a.unit?.name ?? "",
    Profissional: a.staffMemberId
      ? (staffLabel.get(a.staffMemberId) ?? "")
      : "",
    Valor: Math.round(gross(a) * 100) / 100,
    PagoEm: a.paidAt ? a.paidAt.toISOString() : "",
  }));

  const byStaff = new Map<string, { revenue: number; visits: number }>();
  for (const a of appointments) {
    if (!a.staffMemberId) continue;
    const cur = byStaff.get(a.staffMemberId) ?? { revenue: 0, visits: 0 };
    cur.revenue += gross(a);
    cur.visits += 1;
    byStaff.set(a.staffMemberId, cur);
  }
  const ranking = [...byStaff.entries()]
    .map(([id, v]) => ({
      Profissional: staffLabel.get(id) ?? id,
      Visitas: v.visits,
      Faturamento: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.Faturamento - a.Faturamento);

  const byService = new Map<string, { count: number; revenue: number }>();
  for (const a of appointments) {
    const names = [
      a.service.name,
      ...a.items.map((i) => i.service?.name).filter(Boolean),
    ] as string[];
    const unique = [...new Set(names)];
    const share = unique.length > 0 ? gross(a) / unique.length : gross(a);
    for (const name of unique) {
      const cur = byService.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += share;
      byService.set(name, cur);
    }
  }
  const topServicos = [...byService.entries()]
    .map(([name, v]) => ({
      Servico: name,
      Atendimentos: v.count,
      Faturamento: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.Faturamento - a.Faturamento)
    .slice(0, 50);

  // Retenção / CRM (contagens simples no mês + base)
  const lookback = new Date(start);
  lookback.setDate(lookback.getDate() - 60);
  const recentAppts = await prisma.appointment.findMany({
    where: {
      ...appointmentScopeWhere(access),
      status: { not: "CANCELLED" },
      startsAt: { gte: lookback, lte: end },
    },
    select: { clientPhone: true, startsAt: true, status: true, paidAt: true },
  });

  const lastByPhone = new Map<string, Date>();
  for (const a of recentAppts) {
    const key = brPhoneDigits(a.clientPhone);
    if (!key) continue;
    const prev = lastByPhone.get(key);
    if (!prev || a.startsAt > prev) lastByPhone.set(key, a.startsAt);
  }
  const now = end;
  let ok = 0;
  let atRisk = 0;
  let lost = 0;
  for (const last of lastByPhone.values()) {
    const days = Math.floor(
      (now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days < 30) ok += 1;
    else if (days < 60) atRisk += 1;
    else lost += 1;
  }

  const retencao = [
    { Metrica: "Clientes ativos (<30d)", Valor: ok },
    { Metrica: "Em risco (30–59d)", Valor: atRisk },
    { Metrica: "Perdidos (≥60d)", Valor: lost },
    { Metrica: "Pagos no mês", Valor: appointments.length },
    {
      Metrica: "Faturamento do mês",
      Valor: Math.round(
        appointments.reduce((s, a) => s + gross(a), 0) * 100,
      ) / 100,
    },
  ];

  const subs = await prisma.clientSubscription.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
      currentPeriodEnd: true,
      visitsUsed: true,
      plan: { select: { name: true, visitsIncluded: true, price: true } },
    },
  });

  const health = buildClubHealthBuckets(subs, end);
  const clube = [
    ...health.map((b) => ({
      Bucket: b.label,
      Quantidade: b.count,
      Detalhe: b.description,
    })),
    {
      Bucket: "Assinantes (total)",
      Quantidade: subs.length,
      Detalhe: "",
    },
    {
      Bucket: "Ativos",
      Quantidade: subs.filter((s) => s.status === "ACTIVE").length,
      Detalhe: "",
    },
  ];

  let dreSheet: Record<string, string | number>[] = [];
  let fluxoSheet: Record<string, string | number>[] = [];
  try {
    const dre = await buildDreSnapshot({ organizationId: orgId, yearMonth });
    dreSheet = dre.lines.map((l) => ({
      Linha: l.label,
      Valor: Math.round(l.amount * 100) / 100,
    }));
    const cashflow = await buildCashFlowSnapshot({
      organizationId: orgId,
      from: start,
      to: end,
    });
    fluxoSheet = cashflow.buckets
      .filter((b) => b.inflow > 0 || b.outflow > 0)
      .map((b) => ({
        Dia: b.label,
        Entrada: b.inflow,
        Saida: b.outflow,
        Saldo: b.runningBalance,
        Projetado: b.isProjected ? "Sim" : "Não",
      }));
  } catch {
    // export parcial se gerencial indisponível
  }

  return {
    filename: `barbernegon-mes-${yearMonth}.xlsx`,
    sheets: {
      Faturamento: faturamento,
      Ranking: ranking,
      "Top serviços": topServicos,
      Retencao: retencao,
      Clube: clube,
      DRE: dreSheet,
      "Fluxo de caixa": fluxoSheet,
    },
  };
}
