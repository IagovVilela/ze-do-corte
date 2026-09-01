/**
 * Valida rotas financeiras via HTTP (login + APIs + páginas).
 * Uso: npx tsx scripts/validate-finance-http.ts
 */
const BASE = process.env.VALIDATE_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SEED_OWNER_EMAIL ?? "admin@zdc.local";
const PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "AlterarSenha123!";

type Result = { name: string; ok: boolean; detail: string };

const results: Result[] = [];

function log(ok: boolean, name: string, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
}

async function main() {
  console.log(`=== Validação HTTP (${BASE}) ===\n`);

  const jar = new Map<string, string>();

  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  // Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    redirect: "manual",
  });
  const loginBody = (await loginRes.json().catch(() => ({}))) as {
    message?: string;
  };
  const setCookie = loginRes.headers.getSetCookie?.() ?? [];
  for (const raw of setCookie) {
    const part = raw.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  log(
    loginRes.ok,
    "POST /api/auth/login",
    loginRes.ok ? `200 autenticado` : `${loginRes.status} ${loginBody.message ?? ""}`,
  );
  if (!loginRes.ok) {
    printSummary();
    process.exit(1);
  }

  const yearMonth = new Date().toISOString().slice(0, 7);
  const endpoints: { name: string; url: string; method?: string }[] = [
    { name: "GET settings", url: `/api/admin/finance/settings` },
    { name: "GET service-costs", url: `/api/admin/finance/service-costs` },
    { name: "GET dre", url: `/api/admin/finance/dre?yearMonth=${yearMonth}` },
    {
      name: "GET break-even",
      url: `/api/admin/finance/break-even?yearMonth=${yearMonth}`,
    },
    {
      name: "GET cashflow",
      url: `/api/admin/finance/cashflow?from=${yearMonth}-01&to=${yearMonth}-28`,
    },
    { name: "GET alerts", url: `/api/admin/finance/alerts` },
    { name: "GET balance (existente)", url: `/api/admin/finance/balance` },
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep.url}`, {
      headers: { Cookie: cookieHeader() },
    });
    const ok = res.ok;
    let detail = String(res.status);
    if (!ok) {
      try {
        const j = (await res.json()) as { message?: string };
        detail += ` ${j.message ?? ""}`;
      } catch {
        detail += " (sem JSON)";
      }
    } else {
      try {
        const j = await res.json();
        detail += ` OK (${Object.keys(j as object).join(", ")})`;
      } catch {
        detail += " OK";
      }
    }
    log(ok, ep.name, detail);
  }

  // PUT settings smoke
  const putRes = await fetch(`${BASE}/api/admin/finance/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({ productiveHoursPerMonth: 156 }),
  });
  log(
    putRes.ok,
    "PUT settings",
    putRes.ok ? "200" : `${putRes.status}`,
  );

  const costsRes = await fetch(`${BASE}/api/admin/finance/service-costs`, {
    headers: { Cookie: cookieHeader() },
  });
  if (costsRes.ok) {
    const costsData = (await costsRes.json()) as {
      rows?: { serviceId: string; suggestedPrice: number }[];
    };
    const first = costsData.rows?.[0];
    if (first) {
      const putCost = await fetch(`${BASE}/api/admin/finance/service-costs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader(),
        },
        body: JSON.stringify({
          serviceId: first.serviceId,
          directLaborCost: 60,
          materialCost: 40,
        }),
      });
      log(putCost.ok, "PUT service-costs", String(putCost.status));

      const applyPrice = await fetch(`${BASE}/api/admin/finance/service-costs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader(),
        },
        body: JSON.stringify({
          serviceId: first.serviceId,
          price: first.suggestedPrice,
        }),
      });
      log(applyPrice.ok, "POST apply-price", String(applyPrice.status));
    }
  }

  const xlsxRes = await fetch(
    `${BASE}/api/admin/export?pack=month&yearMonth=${yearMonth}`,
    { headers: { Cookie: cookieHeader() } },
  );
  log(
    xlsxRes.ok,
    "GET export XLSX",
    `${xlsxRes.status} ${xlsxRes.headers.get("content-type") ?? ""}`,
  );

  const csvRes = await fetch(
    `${BASE}/api/admin/export?pack=month&yearMonth=${yearMonth}&format=csv`,
    { headers: { Cookie: cookieHeader() } },
  );
  const csvText = csvRes.ok ? await csvRes.text() : "";
  log(
    csvRes.ok && csvText.includes("Linha"),
    "GET export CSV (DRE)",
    `${csvRes.status} ${csvText.slice(0, 40)}`,
  );

  // Pages (HTML)
  const pages = [
    "/admin/financeiro/configuracao",
    "/admin/financeiro/precificacao",
    "/admin/financeiro/dre",
    "/admin/financeiro/ponto-equilibrio",
    "/admin/financeiro/fluxo-caixa",
    "/admin",
    "/admin/inteligencia",
  ];
  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Cookie: cookieHeader() },
      redirect: "manual",
    });
    const ok = res.status === 200;
    const loc = res.headers.get("location") ?? "";
    log(
      ok,
      `GET ${path}`,
      ok ? "200 HTML" : `${res.status}${loc ? ` → ${loc}` : ""}`,
    );
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Resumo: ${results.length - failed.length}/${results.length} OK ===`);
  if (failed.length) {
    for (const f of failed) console.log(`  FALHA: ${f.name} — ${f.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
