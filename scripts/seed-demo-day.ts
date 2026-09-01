/**
 * Popula a org demo (slug ze-do-corte / Barbergon) com dados fictícios
 * realistas para demonstração e gravação de vídeos (agenda, caixa, clube,
 * CRM, inteligência, WhatsApp, suporte).
 *
 * Idempotente: remove lançamentos marcados `[demo-dia]` e recria.
 *
 * Local:  npm run demo:day
 * Prod:   railway run npm run demo:day   (ou DATABASE_PUBLIC_URL no .env)
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import {
  addDays,
  addMinutes,
  addMonths,
  endOfMonth,
  format,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resolveDatabaseUrlForCli } from "../prisma/database-url";
import {
  DEMO_ORG_BRANDING,
  DEMO_ORG_ID,
  DEMO_ORG_SLUG,
  demoSiteJson,
} from "../src/lib/demo-vitrine";
import { usualGapDaysFromVisits } from "../src/lib/client-profile-math";
import { hashPassword } from "../src/lib/password";

const TZ = "America/Sao_Paulo";
const MARK = "[demo-dia]";
const PHONE_PREFIX = "1199900";

const DEMO_PLAN_2_CORTES_ID = "demo_plan_2_cortes";
const DEMO_PLAN_BARBA_ID = "demo_plan_barba_plus";
const DEMO_TICKET_WHATSAPP_ID = "demo_ticket_whatsapp";
const DEMO_TICKET_PAYMENTS_ID = "demo_ticket_payments";

const connectionString = resolveDatabaseUrlForCli();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shopInstant(day: Date, hour: number, minute: number): Date {
  const local = setMinutes(setHours(startOfDay(day), hour), minute);
  return fromZonedTime(local, TZ);
}

function phoneKeyFromRaw(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length <= 11 && !d.startsWith("55")) {
    d = `55${d}`;
  }
  return d;
}

type ClientDef = { name: string; phone: string };

const CLIENTS: ClientDef[] = [
  { name: "Lucas Ferreira", phone: `${PHONE_PREFIX}101` },
  { name: "Rafael Souza", phone: `${PHONE_PREFIX}102` },
  { name: "Bruno Almeida", phone: `${PHONE_PREFIX}103` },
  { name: "Pedro Henrique", phone: `${PHONE_PREFIX}104` },
  { name: "Thiago Martins", phone: `${PHONE_PREFIX}105` },
  { name: "Gabriel Costa", phone: `${PHONE_PREFIX}106` },
  { name: "Felipe Oliveira", phone: `${PHONE_PREFIX}107` },
  { name: "André Santos", phone: `${PHONE_PREFIX}108` },
  { name: "Matheus Lima", phone: `${PHONE_PREFIX}109` },
  { name: "Diego Rocha", phone: `${PHONE_PREFIX}110` },
  { name: "Gustavo Nunes", phone: `${PHONE_PREFIX}111` },
  { name: "Vinícius Barbosa", phone: `${PHONE_PREFIX}112` },
  { name: "Rodrigo Pires", phone: `${PHONE_PREFIX}113` },
  { name: "Carlos Eduardo", phone: `${PHONE_PREFIX}114` },
  { name: "João Pedro", phone: `${PHONE_PREFIX}115` },
  { name: "Marcelo Dias", phone: `${PHONE_PREFIX}116` },
  { name: "Eduardo Ramos", phone: `${PHONE_PREFIX}117` },
  { name: "Henrique Melo", phone: `${PHONE_PREFIX}118` },
  { name: "Igor Carvalho", phone: `${PHONE_PREFIX}119` },
  { name: "Leandro Freitas", phone: `${PHONE_PREFIX}120` },
];

/** Sem visita recente — alimenta CRM at_risk (última visita ~40d atrás). */
const AT_RISK_CLIENTS: ClientDef[] = [
  { name: "Samuel Teixeira", phone: `${PHONE_PREFIX}121` },
  { name: "Renan Gomes", phone: `${PHONE_PREFIX}122` },
  { name: "Caio Mendes", phone: `${PHONE_PREFIX}123` },
  { name: "Fábio Cunha", phone: `${PHONE_PREFIX}124` },
  { name: "Otávio Rezende", phone: `${PHONE_PREFIX}125` },
];

/** Sem visita há 60+ dias — alimenta CRM lost. */
const LOST_CLIENTS: ClientDef[] = [
  { name: "Wallace Prado", phone: `${PHONE_PREFIX}126` },
  { name: "Danilo Farias", phone: `${PHONE_PREFIX}127` },
  { name: "Murilo Bastos", phone: `${PHONE_PREFIX}128` },
  { name: "Tiago Neves", phone: `${PHONE_PREFIX}129` },
  { name: "Alexandre Viana", phone: `${PHONE_PREFIX}130` },
];

const SERVICE_DEFS = [
  {
    name: "Corte Premium",
    description: "Visagismo, corte personalizado e finalização.",
    price: 75,
    durationMinutes: 45,
    category: "CORTE" as const,
  },
  {
    name: "Corte Social",
    description: "Corte clássico rápido para o dia a dia.",
    price: 55,
    durationMinutes: 30,
    category: "CORTE" as const,
  },
  {
    name: "Barba Terapia",
    description: "Toalha quente, óleos e navalha.",
    price: 55,
    durationMinutes: 35,
    category: "BARBA" as const,
  },
  {
    name: "Barba Express",
    description: "Aparar e alinhar barba com máquina.",
    price: 35,
    durationMinutes: 20,
    category: "BARBA" as const,
  },
  {
    name: "Combo Corte + Barba",
    description: "Experiência completa no mesmo atendimento.",
    price: 115,
    durationMinutes: 75,
    category: "COMBO" as const,
  },
  {
    name: "Sobrancelha",
    description: "Design masculino com pinça ou navalha.",
    price: 25,
    durationMinutes: 15,
    category: "TRATAMENTO" as const,
  },
  {
    name: "Pigmentação de barba",
    description: "Cobertura de falhas com pigmento.",
    price: 90,
    durationMinutes: 50,
    category: "TRATAMENTO" as const,
  },
  {
    name: "Hidratação capilar",
    description: "Máscara e finalização para fios ressecados.",
    price: 45,
    durationMinutes: 25,
    category: "TRATAMENTO" as const,
  },
];

const PRODUCT_DEFS = [
  { name: "Pomada Matte", price: 49.9, costPrice: 18.5, stockQty: 18, stockMin: 5 },
  { name: "Pomada Brilho", price: 52.9, costPrice: 19.2, stockQty: 2, stockMin: 8 },
  { name: "Shampoo Antiqueda", price: 69.9, costPrice: 28.0, stockQty: 1, stockMin: 6 },
  { name: "Óleo para barba", price: 39.9, costPrice: 14.5, stockQty: 22, stockMin: 5 },
  { name: "Balm pós-barba", price: 34.9, costPrice: 11.8, stockQty: 15, stockMin: 4 },
];

const STAFF_DEFS = [
  {
    email: "allan.demo@barbergon.local",
    displayName: "Allan Ribeiro",
    role: "OWNER" as const,
  },
  {
    email: "marcos.demo@barbergon.local",
    displayName: "Marcos Silva",
    role: "STAFF" as const,
  },
  {
    email: "diego.demo@barbergon.local",
    displayName: "Diego Castro",
    role: "STAFF" as const,
  },
  {
    email: "renato.demo@barbergon.local",
    displayName: "Renato Alves",
    role: "STAFF" as const,
  },
];

type SeededService = {
  id: string;
  name: string;
  durationMinutes: number;
  price: { toString(): string } | number;
};

function pickServiceList(rand: () => number, byName: Record<string, SeededService>) {
  const pick = rand();
  if (pick < 0.28) return [byName["Corte Premium"]!];
  if (pick < 0.48) return [byName["Combo Corte + Barba"]!];
  if (pick < 0.62) return [byName["Corte Social"]!];
  if (pick < 0.74) return [byName["Barba Terapia"]!];
  if (pick < 0.84) return [byName["Corte Premium"]!, byName["Sobrancelha"]!];
  if (pick < 0.92) return [byName["Barba Express"]!];
  return [byName["Hidratação capilar"]!];
}

function pickClient(dayOffset: number, rand: () => number): ClientDef {
  const activePool = CLIENTS.slice(0, 12);
  const regularPool = CLIENTS.slice(12);
  if (dayOffset > -30) {
    const pool = rand() < 0.72 ? activePool : regularPool;
    return pool[Math.floor(rand() * pool.length)]!;
  }
  const all = [...activePool, ...regularPool, ...AT_RISK_CLIENTS, ...LOST_CLIENTS];
  return all[Math.floor(rand() * all.length)]!;
}

async function refreshClientProfiles(organizationId: string) {
  const rows = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      unit: { organizationId },
    },
    select: {
      clientPhone: true,
      clientName: true,
      startsAt: true,
      staffMemberId: true,
      serviceId: true,
      unitId: true,
    },
    orderBy: { startsAt: "asc" },
    take: 12000,
  });

  const byPhone = new Map<
    string,
    {
      name: string | null;
      dates: Date[];
      lastStaff: string | null;
      lastService: string | null;
      lastUnit: string | null;
    }
  >();

  for (const r of rows) {
    const key = phoneKeyFromRaw(r.clientPhone);
    if (key.length < 12) continue;
    const cur = byPhone.get(key) ?? {
      name: r.clientName,
      dates: [],
      lastStaff: r.staffMemberId,
      lastService: r.serviceId,
      lastUnit: r.unitId,
    };
    cur.dates.push(r.startsAt);
    cur.name = r.clientName;
    cur.lastStaff = r.staffMemberId;
    cur.lastService = r.serviceId;
    cur.lastUnit = r.unitId;
    byPhone.set(key, cur);
  }

  for (const [phoneKey, info] of byPhone) {
    const last = info.dates[info.dates.length - 1]!;
    const gap = usualGapDaysFromVisits(info.dates);
    await prisma.clientProfile.upsert({
      where: {
        organizationId_phoneKey: { organizationId, phoneKey },
      },
      create: {
        organizationId,
        phoneKey,
        displayName: info.name,
        visitCount: info.dates.length,
        lastCompletedAt: last,
        usualGapDays: gap,
        preferredStaffMemberId: info.lastStaff,
        preferredServiceId: info.lastService,
        preferredUnitId: info.lastUnit,
      },
      update: {
        displayName: info.name,
        visitCount: info.dates.length,
        lastCompletedAt: last,
        usualGapDays: gap,
        preferredStaffMemberId: info.lastStaff,
        preferredServiceId: info.lastService,
        preferredUnitId: info.lastUnit,
      },
    });
  }
}

async function main() {
  const rand = mulberry32(20260726);
  const siteJson = demoSiteJson();

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    create: {
      id: DEMO_ORG_ID,
      slug: DEMO_ORG_SLUG,
      planStatus: "ACTIVE",
      planTier: "PLUS",
      timezone: TZ,
      marketplaceListed: true,
      whatsappBotEnabled: true,
      whatsappConfirmBooking: true,
      whatsappReminder24h: true,
      phoneLabel: "(12) 98700-2929",
      whatsappHref: "https://wa.me/5512987002929",
      ...DEMO_ORG_BRANDING,
      siteJson,
    },
    update: {
      planStatus: "ACTIVE",
      planTier: "PLUS",
      marketplaceListed: true,
      whatsappBotEnabled: true,
      whatsappConfirmBooking: true,
      whatsappReminder24h: true,
      phoneLabel: "(12) 98700-2929",
      whatsappHref: "https://wa.me/5512987002929",
      ...DEMO_ORG_BRANDING,
      siteJson,
    },
  });

  const unit = await prisma.barbershopUnit.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "matriz" },
    },
    create: {
      organizationId: org.id,
      name: "Unidade Centro",
      slug: "matriz",
      isDefault: true,
      isActive: true,
      city: "São José dos Campos",
      addressLine: "Rua XV de Novembro, 420",
      phone: "12987002929",
    },
    update: {
      name: "Unidade Centro",
      isDefault: true,
      isActive: true,
      city: "São José dos Campos",
      addressLine: "Rua XV de Novembro, 420",
      phone: "12987002929",
    },
  });

  const demoPassword = await hashPassword("DemoBarber123!");
  const staffRows = [];
  for (const s of STAFF_DEFS) {
    const row = await prisma.staffMember.upsert({
      where: { email: s.email },
      create: {
        email: s.email,
        displayName: s.displayName,
        role: s.role,
        passwordHash: demoPassword,
        organizationId: org.id,
        unitId: s.role === "STAFF" ? unit.id : null,
        showOnWebsite: true,
        websiteBio:
          s.role === "OWNER"
            ? "Fundador e especialista em corte clássico."
            : "Barbeiro da equipe Barbergon.",
      },
      update: {
        displayName: s.displayName,
        role: s.role,
        organizationId: org.id,
        unitId: s.role === "STAFF" ? unit.id : null,
        showOnWebsite: true,
        passwordHash: demoPassword,
      },
    });
    staffRows.push(row);
  }
  const barbers = staffRows.filter((s) => s.role === "STAFF");
  const owner = staffRows.find((s) => s.role === "OWNER")!;

  const services = [];
  for (const def of SERVICE_DEFS) {
    const existing = await prisma.service.findFirst({
      where: { unitId: unit.id, name: def.name },
    });
    const row = existing
      ? await prisma.service.update({
          where: { id: existing.id },
          data: {
            description: def.description,
            price: def.price,
            durationMinutes: def.durationMinutes,
            category: def.category,
            isActive: true,
          },
        })
      : await prisma.service.create({
          data: {
            unitId: unit.id,
            name: def.name,
            description: def.description,
            price: def.price,
            durationMinutes: def.durationMinutes,
            category: def.category,
            isActive: true,
          },
        });
    services.push(row);
  }

  const byName = Object.fromEntries(services.map((s) => [s.name, s]));

  const products = [];
  for (const def of PRODUCT_DEFS) {
    const row = await prisma.product.upsert({
      where: {
        organizationId_name: { organizationId: org.id, name: def.name },
      },
      create: {
        organizationId: org.id,
        name: def.name,
        price: def.price,
        costPrice: def.costPrice,
        stockQty: def.stockQty,
        stockMin: def.stockMin,
        isActive: true,
      },
      update: {
        price: def.price,
        costPrice: def.costPrice,
        stockQty: def.stockQty,
        stockMin: def.stockMin,
        isActive: true,
      },
    });
    products.push(row);
  }

  // Limpa dados demo anteriores
  const demoApptIds = (
    await prisma.appointment.findMany({
      where: {
        unitId: unit.id,
        OR: [
          { notes: { contains: MARK } },
          { clientPhone: { startsWith: PHONE_PREFIX } },
        ],
      },
      select: { id: true },
    })
  ).map((a) => a.id);

  if (demoApptIds.length > 0) {
    await prisma.organizationReview.deleteMany({
      where: { appointmentId: { in: demoApptIds } },
    });
  }

  await prisma.supportTicketMessage.deleteMany({
    where: {
      ticket: {
        organizationId: org.id,
        OR: [
          { id: { in: [DEMO_TICKET_WHATSAPP_ID, DEMO_TICKET_PAYMENTS_ID] } },
          { subject: { contains: MARK } },
        ],
      },
    },
  });
  await prisma.supportTicket.deleteMany({
    where: {
      organizationId: org.id,
      OR: [
        { id: { in: [DEMO_TICKET_WHATSAPP_ID, DEMO_TICKET_PAYMENTS_ID] } },
        { subject: { contains: MARK } },
      ],
    },
  });

  await prisma.whatsAppOutboundLog.deleteMany({
    where: {
      organizationId: org.id,
      waUserPhone: { startsWith: "551199900" },
    },
  });

  await prisma.clientSubscription.deleteMany({
    where: {
      organizationId: org.id,
      OR: [{ notes: { contains: MARK } }, { clientPhone: { startsWith: PHONE_PREFIX } }],
    },
  });

  await prisma.financeEntry.deleteMany({
    where: { organizationId: org.id, notes: { contains: MARK } },
  });
  await prisma.appointment.deleteMany({
    where: {
      unitId: unit.id,
      OR: [
        { notes: { contains: MARK } },
        { clientPhone: { startsWith: PHONE_PREFIX } },
      ],
    },
  });
  await prisma.organizationReview.deleteMany({
    where: {
      organizationId: org.id,
      OR: [{ comment: { contains: MARK } }, { clientPhone: { startsWith: PHONE_PREFIX } }],
    },
  });

  const expenseCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_aluguel" },
    create: {
      id: "demo_cat_expense_aluguel",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Aluguel",
      costType: "FIXED",
    },
    update: { name: "Aluguel", kind: "EXPENSE", costType: "FIXED" },
  });
  const supplyCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_insumos" },
    create: {
      id: "demo_cat_expense_insumos",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Insumos",
      costType: "VARIABLE",
    },
    update: { name: "Insumos", kind: "EXPENSE", costType: "VARIABLE" },
  });
  const incomeCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_income_extra" },
    create: {
      id: "demo_cat_income_extra",
      organizationId: org.id,
      kind: "INCOME",
      name: "Receitas extras",
    },
    update: { name: "Receitas extras", kind: "INCOME" },
  });
  const utilitiesCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_utilidades" },
    create: {
      id: "demo_cat_expense_utilidades",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Utilidades",
      costType: "FIXED",
    },
    update: { name: "Utilidades", kind: "EXPENSE", costType: "FIXED" },
  });
  const salaryCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_salarios" },
    create: {
      id: "demo_cat_expense_salarios",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Salários e comissões",
      costType: "FIXED",
    },
    update: { name: "Salários e comissões", kind: "EXPENSE", costType: "FIXED" },
  });
  const marketingCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_marketing" },
    create: {
      id: "demo_cat_expense_marketing",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Marketing",
      costType: "VARIABLE",
    },
    update: { name: "Marketing", kind: "EXPENSE", costType: "VARIABLE" },
  });

  await prisma.financeSettings.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      proLaboreMonthly: 4500,
      productiveHoursPerMonth: 156,
      defaultVariableExpensePercent: 8,
      defaultProfitMarginPercent: 25,
      autoSettleReceivablesOnDueDate: true,
      autoCreateProLaboreExpense: true,
      paymentMethodFeesJson: { PIX: 0, CREDIT: 3.5, DEBIT: 2.2, CASH: 0 },
    },
    update: {
      proLaboreMonthly: 4500,
      productiveHoursPerMonth: 156,
      defaultVariableExpensePercent: 8,
      defaultProfitMarginPercent: 25,
      autoSettleReceivablesOnDueDate: true,
      autoCreateProLaboreExpense: true,
      paymentMethodFeesJson: { PIX: 0, CREDIT: 3.5, DEBIT: 2.2, CASH: 0 },
    },
  });

  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: "demo_bank_main" },
    create: {
      id: "demo_bank_main",
      organizationId: org.id,
      name: "Conta PJ — Nubank",
      isActive: true,
    },
    update: { name: "Conta PJ — Nubank", isActive: true },
  });

  const SERVICE_COST_DEFS: Record<string, { labor: number; material: number }> = {
    "Corte Premium": { labor: 18, material: 4.5 },
    "Corte Social": { labor: 12, material: 2 },
    "Barba Terapia": { labor: 14, material: 6 },
    "Barba Express": { labor: 8, material: 2.5 },
    "Combo Corte + Barba": { labor: 26, material: 8 },
    Sobrancelha: { labor: 6, material: 1 },
    "Pigmentação de barba": { labor: 22, material: 12 },
    "Hidratação capilar": { labor: 10, material: 9 },
  };

  for (const svc of services) {
    const costs = SERVICE_COST_DEFS[svc.name];
    if (!costs) continue;
    await prisma.serviceCostProfile.upsert({
      where: { serviceId: svc.id },
      create: {
        organizationId: org.id,
        serviceId: svc.id,
        directLaborCost: costs.labor,
        materialCost: costs.material,
        notes: `${MARK} perfil de custo`,
      },
      update: {
        directLaborCost: costs.labor,
        materialCost: costs.material,
        notes: `${MARK} perfil de custo`,
      },
    });
  }

  const today = startOfDay(new Date());
  let financeEntriesCreated = 0;

  // Lançamentos recorrentes — últimos 6 meses (DRE e fluxo de caixa)
  for (let monthOffset = -5; monthOffset <= 1; monthOffset++) {
    const monthRef = startOfMonth(addMonths(today, monthOffset));
    const monthEnd = endOfMonth(monthRef);
    const isPast = monthEnd < today;
    const isCurrent = format(monthRef, "yyyy-MM") === format(today, "yyyy-MM");

    const monthEntries: Array<{
      kind: "EXPENSE" | "INCOME";
      description: string;
      amount: number;
      categoryId: string;
      day: number;
      status: "PAID" | "OPEN";
    }> = [
      {
        kind: "EXPENSE",
        description: "Aluguel da loja",
        amount: 3200,
        categoryId: expenseCat.id,
        day: 5,
        status: isPast || (isCurrent && today.getDate() >= 5) ? "PAID" : "OPEN",
      },
      {
        kind: "EXPENSE",
        description: "Conta de energia",
        amount: 580 + Math.floor(rand() * 120),
        categoryId: utilitiesCat.id,
        day: 12,
        status: isPast || (isCurrent && today.getDate() >= 12) ? "PAID" : "OPEN",
      },
      {
        kind: "EXPENSE",
        description: "Compra de insumos",
        amount: 420 + Math.floor(rand() * 180),
        categoryId: supplyCat.id,
        day: 8,
        status: isPast ? "PAID" : isCurrent && today.getDate() >= 8 ? "PAID" : "OPEN",
      },
      {
        kind: "EXPENSE",
        description: "Folha + comissões",
        amount: 2850 + Math.floor(rand() * 400),
        categoryId: salaryCat.id,
        day: 28,
        status: isPast ? "PAID" : "OPEN",
      },
      {
        kind: "EXPENSE",
        description: "Anúncios Instagram",
        amount: 180 + Math.floor(rand() * 120),
        categoryId: marketingCat.id,
        day: 15,
        status: isPast ? "PAID" : "OPEN",
      },
    ];

    if (monthOffset % 2 === 0) {
      monthEntries.push({
        kind: "INCOME",
        description: "Parceria com marca local",
        amount: 600 + Math.floor(rand() * 300),
        categoryId: incomeCat.id,
        day: 20,
        status: isPast ? "PAID" : "OPEN",
      });
    }

    if (isCurrent) {
      monthEntries.push({
        kind: "EXPENSE",
        description: "Pró-labore do proprietário",
        amount: 4500,
        categoryId: salaryCat.id,
        day: 1,
        status: today.getDate() >= 1 ? "PAID" : "OPEN",
      });
    }

    for (const f of monthEntries) {
      const due = addDays(startOfMonth(monthRef), Math.min(f.day, 28) - 1);
      const paid = f.status === "PAID";
      await prisma.financeEntry.create({
        data: {
          organizationId: org.id,
          unitId: unit.id,
          kind: f.kind,
          status: f.status,
          description: f.description,
          amount: f.amount,
          netAmount: f.amount,
          categoryId: f.categoryId,
          dueDate: due,
          paidAt: paid ? due : null,
          paymentMethod: paid ? (rand() < 0.7 ? "PIX" : "Transferência") : null,
          paymentCondition: paid ? "CASH" : "INSTALLMENT",
          bankAccount: paid ? bankAccount.name : null,
          notes: `${MARK} lançamento demonstrativo`,
          createdById: owner.id,
        },
      });
      financeEntriesCreated += 1;
    }
  }

  // Contas pontuais (caixa a pagar / a receber)
  const financeSeeds = [
    {
      kind: "EXPENSE" as const,
      description: "Aluguel da loja",
      amount: 3200,
      categoryId: expenseCat.id,
      dueOffset: -5,
      status: "PAID" as const,
    },
    {
      kind: "EXPENSE" as const,
      description: "Compra de lâminas e tônicos",
      amount: 480,
      categoryId: supplyCat.id,
      dueOffset: -12,
      status: "PAID" as const,
    },
    {
      kind: "EXPENSE" as const,
      description: "Conta de energia",
      amount: 620,
      categoryId: expenseCat.id,
      dueOffset: 4,
      status: "OPEN" as const,
    },
    {
      kind: "INCOME" as const,
      description: "Patrocínio de marca parceira",
      amount: 800,
      categoryId: incomeCat.id,
      dueOffset: -2,
      status: "PAID" as const,
    },
    {
      kind: "INCOME" as const,
      description: "Aluguel de espaço para workshop",
      amount: 350,
      categoryId: incomeCat.id,
      dueOffset: 7,
      status: "OPEN" as const,
    },
  ];

  for (const f of financeSeeds) {
    const due = addDays(today, f.dueOffset);
    await prisma.financeEntry.create({
      data: {
        organizationId: org.id,
        unitId: unit.id,
        kind: f.kind,
        status: f.status,
        description: f.description,
        amount: f.amount,
        netAmount: f.amount,
        categoryId: f.categoryId,
        dueDate: due,
        paidAt: f.status === "PAID" ? due : null,
        paymentMethod: f.status === "PAID" ? "PIX" : null,
        paymentCondition: f.status === "PAID" ? "CASH" : "INSTALLMENT",
        bankAccount: f.status === "PAID" ? bankAccount.name : null,
        notes: `${MARK} lançamento demonstrativo`,
        createdById: owner.id,
      },
    });
    financeEntriesCreated += 1;
  }

  // Agendamentos: 90 dias atrás até 14 à frente
  let createdAppts = 0;
  const nowHour = new Date().getHours();

  for (let dayOffset = -90; dayOffset <= 14; dayOffset++) {
    if (dayOffset === 0) continue; // hoje é montado à parte (roteiro de vídeo)
    const day = addDays(today, dayOffset);
    const weekday = day.getDay();
    if (weekday === 0) continue;

    const slotsPerDay =
      weekday === 6 ? 7 + Math.floor(rand() * 5) : 10 + Math.floor(rand() * 8);

    const usedHours = new Set<string>();
    for (let i = 0; i < slotsPerDay; i++) {
      const hour = 9 + Math.floor(rand() * 10);
      const minute = rand() > 0.5 ? 0 : 30;
      const barber = barbers[Math.floor(rand() * barbers.length)]!;
      const key = `${hour}:${minute}:${barber.id}`;
      if (usedHours.has(key)) continue;
      usedHours.add(key);

      const client = pickClient(dayOffset, rand);
      const noPref = rand() < 0.18;
      const serviceList = pickServiceList(rand, byName);
      const primary = serviceList[0]!;
      const duration = serviceList.reduce((s, x) => s + x.durationMinutes, 0);
      const totalPrice = serviceList.reduce((s, x) => s + Number(x.price), 0);
      const startsAt = shopInstant(day, hour, minute);
      const endsAt = addMinutes(startsAt, duration);

      let status: "CONFIRMED" | "COMPLETED" | "CANCELLED" = "CONFIRMED";
      if (dayOffset < -1) {
        status = rand() < 0.08 ? "CANCELLED" : "COMPLETED";
      } else if (dayOffset < 0) {
        status = rand() < 0.12 ? "CANCELLED" : "COMPLETED";
      }

      const paid =
        status === "COMPLETED" && rand() < 0.82
          ? true
          : status === "CONFIRMED" && dayOffset <= 0 && rand() < 0.15;

      const sourceRoll = rand();
      const bookingSource =
        sourceRoll < 0.52 ? "site" : sourceRoll < 0.82 ? "whatsapp" : "admin";

      const appt = await prisma.appointment.create({
        data: {
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: `${client.phone}@demo.barbergon.local`,
          notes: `${MARK} atendimento demonstrativo`,
          startsAt,
          endsAt,
          status,
          serviceId: primary.id,
          unitId: unit.id,
          staffMemberId: noPref && status === "CONFIRMED" ? null : barber.id,
          bookedWithoutStaffPreference: noPref,
          bookingSource,
          clientManageToken: randomUUID(),
          paymentStatus: paid ? "PAID" : "UNPAID",
          paidAt: paid ? endsAt : null,
          paymentMethod: paid ? (rand() < 0.62 ? "PIX" : "Dinheiro") : null,
          amountPaid: paid ? totalPrice : null,
          items: {
            create: serviceList.map((svc, idx) => ({
              serviceId: svc.id,
              price: svc.price,
              durationMinutes: svc.durationMinutes,
              sortOrder: idx,
            })),
          },
        },
      });

      if (paid && rand() < 0.2) {
        const product = products[Math.floor(rand() * products.length)]!;
        await prisma.appointmentProduct.create({
          data: {
            appointmentId: appt.id,
            productId: product.id,
            quantity: 1,
            unitPrice: product.price,
            soldAt: endsAt,
          },
        });
      }

      createdAppts += 1;
    }
  }

  // Histórico fixo para clientes em risco / perdidos (CRM)
  async function seedDormantHistory(
    clients: ClientDef[],
    lastVisitOffset: number,
    visitCount: number,
  ) {
    for (const client of clients) {
      for (let v = 0; v < visitCount; v++) {
        const offset = lastVisitOffset - (visitCount - 1 - v) * 21;
        const day = addDays(today, offset);
        if (day.getDay() === 0) continue;
        const barber = barbers[v % barbers.length]!;
        const serviceList = [byName["Corte Social"]!];
        const startsAt = shopInstant(day, 10 + v, 0);
        const duration = serviceList[0]!.durationMinutes;
        const endsAt = addMinutes(startsAt, duration);
        await prisma.appointment.create({
          data: {
            clientName: client.name,
            clientPhone: client.phone,
            clientEmail: `${client.phone}@demo.barbergon.local`,
            notes: `${MARK} histórico CRM`,
            startsAt,
            endsAt,
            status: "COMPLETED",
            serviceId: serviceList[0]!.id,
            unitId: unit.id,
            staffMemberId: barber.id,
            bookingSource: "site",
            clientManageToken: randomUUID(),
            paymentStatus: "PAID",
            paidAt: endsAt,
            paymentMethod: "PIX",
            amountPaid: serviceList[0]!.price,
            items: {
              create: [
                {
                  serviceId: serviceList[0]!.id,
                  price: serviceList[0]!.price,
                  durationMinutes: duration,
                  sortOrder: 0,
                },
              ],
            },
          },
        });
        createdAppts += 1;
      }
    }
  }

  await seedDormantHistory(AT_RISK_CLIENTS, -40, 4);
  await seedDormantHistory(LOST_CLIENTS, -72, 5);

  // Agenda de hoje — roteiro para gravação (funciona mesmo domingo)
  const todaySlots: Array<{
    hour: number;
    minute: number;
    client: ClientDef;
    barberIdx: number;
    services: string[];
    forceConfirmed?: boolean;
  }> = [
    { hour: 9, minute: 0, client: CLIENTS[0]!, barberIdx: 0, services: ["Combo Corte + Barba"] },
    { hour: 10, minute: 30, client: CLIENTS[1]!, barberIdx: 1, services: ["Corte Premium"] },
    { hour: 11, minute: 30, client: CLIENTS[2]!, barberIdx: 2, services: ["Barba Terapia"] },
    { hour: 14, minute: 0, client: CLIENTS[3]!, barberIdx: 0, services: ["Corte Social"] },
    { hour: 15, minute: 30, client: CLIENTS[4]!, barberIdx: 1, services: ["Combo Corte + Barba"] },
    {
      hour: 16,
      minute: 30,
      client: CLIENTS[5]!,
      barberIdx: 2,
      services: ["Corte Premium", "Sobrancelha"],
      forceConfirmed: true,
    },
    { hour: 17, minute: 30, client: CLIENTS[6]!, barberIdx: 0, services: ["Barba Express"] },
  ];

  const todayApptIds: string[] = [];
  for (const slot of todaySlots) {
    const barber = barbers[slot.barberIdx % barbers.length]!;
    const serviceList = slot.services.map((n) => byName[n]!);
    const startsAt = shopInstant(today, slot.hour, slot.minute);
    const completed =
      !slot.forceConfirmed && slot.hour < nowHour - 1;
    const status = completed ? "COMPLETED" : "CONFIRMED";
    const duration = serviceList.reduce((s, x) => s + x.durationMinutes, 0);
    const totalPrice = serviceList.reduce((s, x) => s + Number(x.price), 0);
    const endsAt = addMinutes(startsAt, duration);
    const appt = await prisma.appointment.create({
      data: {
        clientName: slot.client.name,
        clientPhone: slot.client.phone,
        clientEmail: `${slot.client.phone}@demo.barbergon.local`,
        notes: `${MARK} agenda de hoje (vídeo)`,
        startsAt,
        endsAt,
        status,
        serviceId: serviceList[0]!.id,
        unitId: unit.id,
        staffMemberId: barber.id,
        bookingSource: slot.hour < 12 ? "whatsapp" : "site",
        clientManageToken: randomUUID(),
        paymentStatus: completed ? "PAID" : "UNPAID",
        paidAt: completed ? endsAt : null,
        paymentMethod: completed ? "PIX" : null,
        amountPaid: completed ? totalPrice : null,
        whatsappReminderSentAt: completed ? subDays(startsAt, 1) : null,
        items: {
          create: serviceList.map((svc, idx) => ({
            serviceId: svc.id,
            price: svc.price,
            durationMinutes: svc.durationMinutes,
            sortOrder: idx,
          })),
        },
      },
    });
    todayApptIds.push(appt.id);
    createdAppts += 1;
  }

  // Caixa a receber — atendimentos recentes concluídos sem pagamento
  const unpaidCandidates = await prisma.appointment.findMany({
    where: {
      unitId: unit.id,
      status: "COMPLETED",
      paymentStatus: "PAID",
      notes: { contains: MARK },
      startsAt: { gte: addDays(today, -5), lt: today },
    },
    take: 6,
    orderBy: { startsAt: "desc" },
  });
  for (const a of unpaidCandidates) {
    await prisma.appointment.update({
      where: { id: a.id },
      data: {
        paymentStatus: "UNPAID",
        paidAt: null,
        paymentMethod: null,
        amountPaid: null,
      },
    });
  }

  // Clube — planos e assinaturas
  const plan2Cortes = await prisma.subscriptionPlan.upsert({
    where: { id: DEMO_PLAN_2_CORTES_ID },
    create: {
      id: DEMO_PLAN_2_CORTES_ID,
      organizationId: org.id,
      name: "Clube 2 Cortes",
      description: "Dois cortes sociais por mês com desconto.",
      price: 99,
      cycleDays: 30,
      visitsIncluded: 2,
      isActive: true,
    },
    update: {
      description: "Dois cortes sociais por mês com desconto.",
      price: 99,
      visitsIncluded: 2,
      isActive: true,
    },
  });

  const planBarba = await prisma.subscriptionPlan.upsert({
    where: { id: DEMO_PLAN_BARBA_ID },
    create: {
      id: DEMO_PLAN_BARBA_ID,
      organizationId: org.id,
      name: "Barba+ Ilimitada",
      description: "Barba express ilimitada no mês.",
      price: 79,
      cycleDays: 30,
      visitsIncluded: null,
      isActive: true,
    },
    update: {
      description: "Barba express ilimitada no mês.",
      price: 79,
      isActive: true,
    },
  });

  for (const svc of [byName["Corte Social"]!, byName["Barba Express"]!]) {
    const planId =
      svc.name === "Corte Social" ? plan2Cortes.id : planBarba.id;
    await prisma.subscriptionPlanService.upsert({
      where: {
        planId_serviceId: { planId, serviceId: svc.id },
      },
      create: { planId, serviceId: svc.id },
      update: {},
    });
  }

  type SubSeed = {
    client: ClientDef;
    planId: string;
    status: "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELLED";
    visitsUsed: number;
    periodEndOffset: number;
  };

  const subSeeds: SubSeed[] = [
    ...CLIENTS.slice(0, 8).map((c, i) => ({
      client: c,
      planId: i % 2 === 0 ? plan2Cortes.id : planBarba.id,
      status: "ACTIVE" as const,
      visitsUsed: i % 4 === 0 ? 0 : i % 3 === 0 ? 1 : 2,
      periodEndOffset: 12 + (i % 5),
    })),
    ...CLIENTS.slice(8, 12).map((c, i) => ({
      client: c,
      planId: plan2Cortes.id,
      status: "ACTIVE" as const,
      visitsUsed: 0,
      periodEndOffset: 3 + i,
    })),
    { client: CLIENTS[12]!, planId: plan2Cortes.id, status: "PAST_DUE", visitsUsed: 1, periodEndOffset: -3 },
    { client: CLIENTS[13]!, planId: planBarba.id, status: "PAST_DUE", visitsUsed: 2, periodEndOffset: -5 },
    { client: CLIENTS[14]!, planId: plan2Cortes.id, status: "PAST_DUE", visitsUsed: 0, periodEndOffset: -2 },
    { client: CLIENTS[15]!, planId: planBarba.id, status: "PAUSED", visitsUsed: 1, periodEndOffset: 8 },
    { client: CLIENTS[16]!, planId: plan2Cortes.id, status: "ACTIVE", visitsUsed: 2, periodEndOffset: 4 },
    { client: CLIENTS[17]!, planId: plan2Cortes.id, status: "CANCELLED", visitsUsed: 1, periodEndOffset: -20 },
  ];

  const clubSubs: Array<{ id: string; client: ClientDef; status: string }> = [];
  for (const s of subSeeds) {
    const sub = await prisma.clientSubscription.create({
      data: {
        organizationId: org.id,
        planId: s.planId,
        clientName: s.client.name,
        clientPhone: s.client.phone,
        clientEmail: `${s.client.phone}@demo.barbergon.local`,
        status: s.status,
        startsAt: addDays(today, -25),
        currentPeriodEnd: addDays(today, s.periodEndOffset),
        visitsUsed: s.visitsUsed,
        cancelledAt: s.status === "CANCELLED" ? addDays(today, -18) : null,
        notes: `${MARK} assinatura demonstrativa`,
      },
    });
    clubSubs.push({ id: sub.id, client: s.client, status: s.status });
  }

  // Consumo de crédito do clube em atendimentos recentes
  const activeSubs = clubSubs.filter((s) => s.status === "ACTIVE");
  const clubAppts = await prisma.appointment.findMany({
    where: {
      unitId: unit.id,
      status: "COMPLETED",
      paymentStatus: "PAID",
      notes: { contains: MARK },
      startsAt: { gte: addDays(today, -20) },
    },
    take: 14,
    orderBy: { startsAt: "desc" },
  });
  for (let i = 0; i < clubAppts.length && i < activeSubs.length; i++) {
    const appt = clubAppts[i]!;
    const sub = activeSubs[i % activeSubs.length]!;
    if (appt.clientPhone !== sub.client.phone) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: {
          usedSubscriptionId: sub.id,
          clientName: sub.client.name,
          clientPhone: sub.client.phone,
        },
      });
    } else {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { usedSubscriptionId: sub.id },
      });
    }
  }

  // Avaliações
  const reviewSnippets = [
    "Atendimento top, corte ficou impecável.",
    "Ambiente limpo e profissionais pontuais.",
    "Volto sempre — melhor combo da região.",
    "Barba terapia excelente, recomendo.",
    "Agendamento pelo celular facilitou demais.",
    "Equipe atenciosa, recomendo o clube.",
    "Melhor barbearia de SJC.",
    "Sempre pontual, nota 10.",
    "Corte premium vale cada centavo.",
    "Indico para todos os amigos.",
    "WhatsApp com lembrete salvou meu horário.",
    "Produtos de qualidade na recepção.",
  ];
  const reviewClients = [...CLIENTS.slice(0, 10), ...AT_RISK_CLIENTS.slice(0, 2)];
  const linkedAppts = await prisma.appointment.findMany({
    where: {
      unitId: unit.id,
      status: "COMPLETED",
      notes: { contains: MARK },
    },
    take: 4,
    orderBy: { startsAt: "desc" },
  });
  for (let i = 0; i < reviewClients.length; i++) {
    const c = reviewClients[i]!;
    await prisma.organizationReview.create({
      data: {
        organizationId: org.id,
        rating: 4 + (rand() > 0.25 ? 1 : 0),
        clientName: c.name,
        clientPhone: c.phone,
        comment: `${reviewSnippets[i % reviewSnippets.length]} ${MARK}`,
        appointmentId: i < linkedAppts.length ? linkedAppts[i]!.id : null,
      },
    });
  }

  // Regras de comissão
  for (const b of barbers) {
    await prisma.staffCommissionRule.upsert({
      where: { staffMemberId: b.id },
      create: {
        organizationId: org.id,
        staffMemberId: b.id,
        servicePercent: 40,
        subscriptionPercent: 30,
        productPercent: 10,
      },
      update: {
        organizationId: org.id,
        servicePercent: 40,
        subscriptionPercent: 30,
        productPercent: 10,
      },
    });
  }

  // Metas mensais (briefing — barbeiros ~60% da meta)
  const yearMonth = format(today, "yyyy-MM");
  const goalTargets = [9500, 11000, 8800];
  for (let i = 0; i < barbers.length; i++) {
    const b = barbers[i]!;
    await prisma.staffMonthlyGoal.upsert({
      where: {
        staffMemberId_yearMonth: { staffMemberId: b.id, yearMonth },
      },
      create: {
        organizationId: org.id,
        staffMemberId: b.id,
        yearMonth,
        revenueGoal: goalTargets[i] ?? 10000,
        visitGoal: 95 + i * 8,
      },
      update: {
        revenueGoal: goalTargets[i] ?? 10000,
        visitGoal: 95 + i * 8,
      },
    });
  }

  // Logs WhatsApp (auditoria / winback)
  const waKinds = [
    "CONFIRMATION",
    "REMINDER",
    "WINBACK",
    "BOT_REPLY",
  ] as const;
  const waClients = [...CLIENTS.slice(0, 15), ...AT_RISK_CLIENTS];
  let waLogs = 0;
  for (let d = 0; d < 28; d++) {
    const day = addDays(today, -d);
    const count = d === 0 ? 2 : 1 + Math.floor(rand() * 2);
    for (let j = 0; j < count; j++) {
      const client = waClients[(d + j) % waClients.length]!;
      const kind =
        d < 3 && j === 0
          ? "CONFIRMATION"
          : d < 7 && j === 0
            ? "REMINDER"
            : d % 5 === 0
              ? "WINBACK"
              : waKinds[Math.floor(rand() * waKinds.length)]!;
      const apptForLog =
        kind === "CONFIRMATION" || kind === "REMINDER"
          ? await prisma.appointment.findFirst({
              where: {
                unitId: unit.id,
                clientPhone: client.phone,
                notes: { contains: MARK },
              },
              orderBy: { startsAt: "desc" },
            })
          : null;
      await prisma.whatsAppOutboundLog.create({
        data: {
          organizationId: org.id,
          appointmentId: apptForLog?.id ?? null,
          waUserPhone: phoneKeyFromRaw(client.phone),
          kind,
          status: "sent",
          metaMessageId: `demo_wamid_${d}_${j}_${randomUUID().slice(0, 8)}`,
          createdAt: shopInstant(day, 9 + j, 15),
        },
      });
      waLogs += 1;
    }
  }

  // Chamados de suporte
  await prisma.supportTicket.create({
    data: {
      id: DEMO_TICKET_WHATSAPP_ID,
      organizationId: org.id,
      createdByStaffId: owner.id,
      subject: `${MARK} Bot não responde após conectar número`,
      category: "WHATSAPP",
      status: "OPEN",
      messages: {
        create: [
          {
            body: "Conectei o WhatsApp ontem. Clientes mandam 'oi' e não recebem resposta automática. A comanda de confirmação chega normal.",
            authorKind: "STAFF",
            authorStaffId: owner.id,
          },
        ],
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      id: DEMO_TICKET_PAYMENTS_ID,
      organizationId: org.id,
      createdByStaffId: owner.id,
      subject: `${MARK} Assinatura do clube ficou PAST_DUE no Asaas`,
      category: "CLUB",
      status: "IN_PROGRESS",
      messages: {
        create: [
          {
            body: "Três clientes do clube apareceram inadimplentes hoje. Preciso saber se o sistema pausa o crédito automaticamente.",
            authorKind: "STAFF",
            authorStaffId: owner.id,
          },
          {
            body: "Olá! Quando o Asaas marca PAST_DUE, o crédito do clube fica bloqueado até regularizar. Posso revisar os webhooks com você.",
            authorKind: "PLATFORM",
            authorEmail: "suporte@barbernegon.com.br",
          },
        ],
      },
    },
  });

  await refreshClientProfiles(org.id);

  // Opt-in marketing para winback (perfis recorrentes + em risco)
  const optInPhones = [
    ...CLIENTS.slice(0, 10),
    ...AT_RISK_CLIENTS,
  ].map((c) => phoneKeyFromRaw(c.phone));
  for (const phoneKey of optInPhones) {
    await prisma.clientProfile.updateMany({
      where: { organizationId: org.id, phoneKey },
      data: { marketingOptIn: true },
    });
  }

  console.log(`[demo:day] Org ${org.slug} (${org.name}) pronta — plano PLUS.`);
  console.log(`[demo:day] Unidade: ${unit.name}`);
  console.log(
    `[demo:day] Equipe: ${staffRows.length} · Serviços: ${services.length} · Produtos: ${products.length}`,
  );
  console.log(
    `[demo:day] Financeiro: ${financeEntriesCreated} lançamentos · perfis CSV em ${services.length} serviços`,
  );
  console.log(
    `[demo:day] Agendamentos: ${createdAppts} · Clube: ${clubSubs.length} assinantes · WA logs: ${waLogs}`,
  );
  console.log(
    `[demo:day] CRM: ${AT_RISK_CLIENTS.length} em risco · ${LOST_CLIENTS.length} perdidos · Caixa a receber: ${unpaidCandidates.length}`,
  );
  console.log(`[demo:day] Agenda hoje: ${todayApptIds.length} horários (roteiro vídeo)`);
  console.log(`[demo:day] Login demo barbeiros: senha DemoBarber123!`);
  console.log(`[demo:day] Owner demo: ${owner.email}`);
  console.log(
    `[demo:day] Site: /${DEMO_ORG_SLUG} · Admin: /admin · Agendar: /${DEMO_ORG_SLUG}/agendar`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
