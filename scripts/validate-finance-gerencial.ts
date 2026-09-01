/**
 * Validação do módulo financeiro gerencial (sem browser).
 * Uso: npx tsx scripts/validate-finance-gerencial.ts
 */
import { endOfMonth, format, startOfMonth } from "date-fns";

import { buildBreakEvenSnapshot } from "../src/lib/finance-break-even";
import { buildCashFlowSnapshot } from "../src/lib/finance-cashflow";
import { buildDreSnapshot } from "../src/lib/finance-dre";
import {
  ensureProLaboreMonthlyEntry,
  getOrCreateFinanceSettings,
  updateFinanceSettings,
} from "../src/lib/finance-settings";
import {
  listServiceCostRows,
  upsertServiceCostProfile,
} from "../src/lib/service-costing-admin";
import {
  computeSellingPrice,
  computeServiceCost,
  workshopExampleCheck,
} from "../src/lib/service-costing";
import { prisma } from "../src/lib/prisma";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  checks.push({ name, ok: false, detail });
  console.error(`✗ ${name} — ${detail}`);
}

async function main() {
  console.log("=== Validação Financeiro Gerencial ===\n");

  // 1. Fórmulas puras
  if (workshopExampleCheck()) {
    pass("workshopExampleCheck", "CSV 458,96 → PV 655,66");
  } else {
    fail("workshopExampleCheck", "Fórmulas do workshop não batem");
  }

  const cost = computeServiceCost({
    directLaborCost: 153.84,
    materialCost: 100,
    durationMinutes: 480,
    fixedCostPerHour: 25.64,
  });
  const pv = computeSellingPrice(cost.csvTotal, 10, 20);
  if (Math.abs(cost.csvTotal - 458.96) < 0.02 && Math.abs(pv.suggestedPrice - 655.66) < 0.02) {
    pass("computeServiceCost + computeSellingPrice");
  } else {
    fail("fórmulas", `csv=${cost.csvTotal} pv=${pv.suggestedPrice}`);
  }

  // 2. Org de teste
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, planStatus: true, planTier: true },
  });
  if (!org) {
    fail("organização", "Nenhuma org no banco — rode npm run db:seed");
    printSummary();
    process.exit(1);
  }
  pass("organização encontrada", `${org.slug} (${org.planTier}/${org.planStatus})`);

  const yearMonth = format(new Date(), "yyyy-MM");

  // 3. Settings CRUD
  try {
    const before = await getOrCreateFinanceSettings(org.id);
    await updateFinanceSettings(org.id, {
      proLaboreMonthly: 2000,
      productiveHoursPerMonth: 156,
      defaultVariableExpensePercent: 10,
      defaultProfitMarginPercent: 20,
    });
    const after = await getOrCreateFinanceSettings(org.id);
    if (after.proLaboreMonthly === 2000 && after.productiveHoursPerMonth === 156) {
      pass("FinanceSettings get/update");
    } else {
      fail("FinanceSettings", "Valores não persistiram");
    }
    // restore
    await updateFinanceSettings(org.id, before);
  } catch (e) {
    fail("FinanceSettings", String(e));
  }

  // 4. Service costs
  try {
    const service = await prisma.service.findFirst({
      where: { unit: { organizationId: org.id }, isActive: true },
      select: { id: true, name: true },
    });
    if (service) {
      await upsertServiceCostProfile(org.id, service.id, {
        directLaborCost: 50,
        materialCost: 30,
      });
      const { rows, fixedCostPerHour } = await listServiceCostRows(org.id);
      const row = rows.find((r) => r.serviceId === service.id);
      if (row && row.cost.csvTotal > 0) {
        pass("ServiceCostProfile + listServiceCostRows", `DF/h=${fixedCostPerHour.toFixed(2)}`);
      } else {
        fail("ServiceCostProfile", "Linha não calculada");
      }
    } else {
      pass("ServiceCostProfile", "Sem serviços ativos — pulado");
    }
  } catch (e) {
    fail("ServiceCostProfile", String(e));
  }

  // 5. DRE
  try {
    const dre = await buildDreSnapshot({ organizationId: org.id, yearMonth });
    if (dre.lines.length >= 8 && dre.lines.some((l) => l.key === "net")) {
      pass("buildDreSnapshot", `${dre.lines.length} linhas, mês ${dre.yearMonth}`);
    } else {
      fail("buildDreSnapshot", "Estrutura incompleta");
    }
  } catch (e) {
    fail("buildDreSnapshot", String(e));
  }

  // 6. Break-even
  try {
    const pe = await buildBreakEvenSnapshot({ organizationId: org.id, yearMonth });
    if (pe.breakEvenUnits >= 0 && pe.progressPercent >= 0) {
      pass("buildBreakEvenSnapshot", `PE=${pe.breakEvenUnits} atend., progresso=${pe.progressPercent}%`);
    } else {
      fail("buildBreakEvenSnapshot", "Valores inválidos");
    }
  } catch (e) {
    fail("buildBreakEvenSnapshot", String(e));
  }

  // 7. Cash flow
  try {
    const from = startOfMonth(new Date());
    const to = endOfMonth(new Date());
    const cf = await buildCashFlowSnapshot({
      organizationId: org.id,
      from,
      to,
    });
    if (cf.buckets.length > 0 && typeof cf.closingBalance === "number") {
      pass("buildCashFlowSnapshot", `${cf.buckets.length} dias, saldo=${cf.closingBalance}`);
    } else {
      fail("buildCashFlowSnapshot", "Snapshot vazio");
    }
  } catch (e) {
    fail("buildCashFlowSnapshot", String(e));
  }

  // 8. Pró-labore auto
  try {
    await updateFinanceSettings(org.id, {
      autoCreateProLaboreExpense: true,
      proLaboreMonthly: 1500,
    });
    const created = await ensureProLaboreMonthlyEntry(org.id);
    const again = await ensureProLaboreMonthlyEntry(org.id);
    if (created && !again) {
      pass("ensureProLaboreMonthlyEntry", "Cria uma vez, idempotente");
    } else if (!created && !again) {
      pass("ensureProLaboreMonthlyEntry", "Já existia no mês");
    } else {
      fail("ensureProLaboreMonthlyEntry", `created=${created} again=${again}`);
    }
    await updateFinanceSettings(org.id, { autoCreateProLaboreExpense: false });
  } catch (e) {
    fail("ensureProLaboreMonthlyEntry", String(e));
  }

  // 9. Schema tables exist
  try {
    await prisma.financeSettings.count();
    await prisma.serviceCostProfile.count();
    await prisma.bankAccount.count();
    pass("Tabelas Prisma acessíveis");
  } catch (e) {
    fail("Tabelas Prisma", String(e));
  }

  printSummary();
  await prisma.$disconnect();
  process.exit(checks.some((c) => !c.ok) ? 1 : 0);
}

function printSummary() {
  const failed = checks.filter((c) => !c.ok);
  console.log("\n=== Resumo ===");
  console.log(`Total: ${checks.length} | OK: ${checks.length - failed.length} | Falhas: ${failed.length}`);
  if (failed.length) {
    console.log("\nFalhas:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
