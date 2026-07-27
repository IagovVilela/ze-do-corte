/**
 * Popula a org demo (slug ze-do-corte / Barbergon) com dados fictícios
 * realistas para demonstração do dia a dia (agenda, caixa, financeiro, evolução).
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
  setHours,
  setMinutes,
  startOfDay,
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
import { hashPassword } from "../src/lib/password";

const TZ = "America/Sao_Paulo";
const MARK = "[demo-dia]";
const PHONE_PREFIX = "1199900";

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

const CLIENTS = [
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
  { name: "Pomada Matte", price: 49.9, stockQty: 18 },
  { name: "Pomada Brilho", price: 52.9, stockQty: 12 },
  { name: "Shampoo Antiqueda", price: 69.9, stockQty: 9 },
  { name: "Óleo para barba", price: 39.9, stockQty: 22 },
  { name: "Balm pós-barba", price: 34.9, stockQty: 15 },
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

async function main() {
  const rand = mulberry32(20260726);
  const siteJson = demoSiteJson();

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    create: {
      id: DEMO_ORG_ID,
      slug: DEMO_ORG_SLUG,
      planStatus: "ACTIVE",
      planTier: "PRO",
      timezone: TZ,
      marketplaceListed: true,
      ...DEMO_ORG_BRANDING,
      siteJson,
    },
    update: {
      planStatus: "ACTIVE",
      planTier: "PRO",
      marketplaceListed: true,
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
      phone: "12940028922",
    },
    update: {
      name: "Unidade Centro",
      isDefault: true,
      isActive: true,
      city: "São José dos Campos",
      addressLine: "Rua XV de Novembro, 420",
      phone: "12940028922",
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
        stockQty: def.stockQty,
        isActive: true,
      },
      update: {
        price: def.price,
        stockQty: def.stockQty,
        isActive: true,
      },
    });
    products.push(row);
  }

  // Limpa dados demo anteriores
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
    where: { organizationId: org.id, comment: { contains: MARK } },
  });

  const expenseCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_aluguel" },
    create: {
      id: "demo_cat_expense_aluguel",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Aluguel",
    },
    update: { name: "Aluguel", kind: "EXPENSE" },
  });
  const supplyCat = await prisma.financeCategory.upsert({
    where: { id: "demo_cat_expense_insumos" },
    create: {
      id: "demo_cat_expense_insumos",
      organizationId: org.id,
      kind: "EXPENSE",
      name: "Insumos",
    },
    update: { name: "Insumos", kind: "EXPENSE" },
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

  const today = startOfDay(new Date());
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
        notes: `${MARK} lançamento demonstrativo`,
        createdById: owner.id,
      },
    });
  }

  // Agendamentos: 55 dias atrás até 7 à frente
  let createdAppts = 0;
  for (let dayOffset = -55; dayOffset <= 7; dayOffset++) {
    const day = addDays(today, dayOffset);
    const weekday = day.getDay(); // 0=dom
    if (weekday === 0) continue; // fecha domingo
    const slotsPerDay =
      weekday === 6 ? 4 + Math.floor(rand() * 3) : 6 + Math.floor(rand() * 5);

    const usedHours = new Set<string>();
    for (let i = 0; i < slotsPerDay; i++) {
      const hour = 9 + Math.floor(rand() * 10); // 9–18
      const minute = rand() > 0.5 ? 0 : 30;
      const key = `${hour}:${minute}:${Math.floor(rand() * barbers.length)}`;
      if (usedHours.has(key)) continue;
      usedHours.add(key);

      const client = CLIENTS[Math.floor(rand() * CLIENTS.length)]!;
      const barber = barbers[Math.floor(rand() * barbers.length)]!;
      const noPref = rand() < 0.22;

      // Mix de serviços (pesos nos mais pedidos)
      const pick = rand();
      let serviceList: typeof services;
      if (pick < 0.28) {
        serviceList = [byName["Corte Premium"]!];
      } else if (pick < 0.48) {
        serviceList = [byName["Combo Corte + Barba"]!];
      } else if (pick < 0.62) {
        serviceList = [byName["Corte Social"]!];
      } else if (pick < 0.74) {
        serviceList = [byName["Barba Terapia"]!];
      } else if (pick < 0.84) {
        serviceList = [byName["Corte Premium"]!, byName["Sobrancelha"]!];
      } else if (pick < 0.92) {
        serviceList = [byName["Barba Express"]!];
      } else {
        serviceList = [byName["Hidratação capilar"]!];
      }

      const primary = serviceList[0]!;
      const duration = serviceList.reduce((s, x) => s + x.durationMinutes, 0);
      const totalPrice = serviceList.reduce((s, x) => s + Number(x.price), 0);
      const startsAt = shopInstant(day, hour, minute);
      const endsAt = addMinutes(startsAt, duration);

      let status: "CONFIRMED" | "COMPLETED" | "CANCELLED" = "CONFIRMED";
      if (dayOffset < -1) {
        status = rand() < 0.08 ? "CANCELLED" : "COMPLETED";
      } else if (dayOffset < 0) {
        status = rand() < 0.15 ? "CANCELLED" : "COMPLETED";
      } else if (dayOffset === 0 && hour < new Date().getHours()) {
        status = "COMPLETED";
      }

      const paid =
        status === "COMPLETED" && rand() < 0.88
          ? true
          : status === "CONFIRMED" && dayOffset <= 0 && rand() < 0.2;

      const sourceRoll = rand();
      const bookingSource =
        sourceRoll < 0.55 ? "site" : sourceRoll < 0.8 ? "whatsapp" : "admin";

      const manageToken = randomUUID();

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
          clientManageToken: manageToken,
          paymentStatus: paid ? "PAID" : "UNPAID",
          paidAt: paid ? endsAt : null,
          paymentMethod: paid ? (rand() < 0.6 ? "PIX" : "Dinheiro") : null,
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

      if (paid && rand() < 0.18) {
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

  // Avaliações
  const reviewSnippets = [
    "Atendimento top, corte ficou impecável.",
    "Ambiente limpo e profissionais pontuais.",
    "Volto sempre — melhor combo da região.",
    "Barba terapia excelente, recomendo.",
  ];
  for (let i = 0; i < 8; i++) {
    const c = CLIENTS[i]!;
    await prisma.organizationReview.create({
      data: {
        organizationId: org.id,
        rating: 4 + (rand() > 0.3 ? 1 : 0),
        clientName: c.name,
        clientPhone: c.phone,
        comment: `${reviewSnippets[i % reviewSnippets.length]} ${MARK}`,
      },
    });
  }

  // Regras de comissão básicas
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

  console.log(`[demo:day] Org ${org.slug} (${org.name}) pronta.`);
  console.log(`[demo:day] Unidade: ${unit.name}`);
  console.log(`[demo:day] Equipe: ${staffRows.length} · Serviços: ${services.length} · Produtos: ${products.length}`);
  console.log(`[demo:day] Agendamentos criados: ${createdAppts}`);
  console.log(`[demo:day] Login demo barbeiros: senha DemoBarber123!`);
  console.log(`[demo:day] Owner demo: ${owner.email}`);
  console.log(`[demo:day] Site: /${DEMO_ORG_SLUG} · Agendar: /${DEMO_ORG_SLUG}/agendar`);
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
