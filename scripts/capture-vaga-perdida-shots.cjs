const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const OUT = "/workspace/docs/infoprodutos/screenshots";
const BASE =
  process.env.CAPTURE_BASE ||
  "https://barbernegon-production.up.railway.app";
const EMAIL = process.env.CAPTURE_EMAIL || "admin@barbernegon.app";
const PASSWORD = process.env.CAPTURE_PASSWORD;
const PUBLIC_SLUG = process.env.CAPTURE_SLUG || "ze-do-corte";

if (!PASSWORD) {
  console.error("Defina CAPTURE_PASSWORD no ambiente.");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

function cookieDomain(baseUrl) {
  return new URL(baseUrl).hostname;
}

async function shot(page, name, url, opts = {}) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  if (opts.waitMs) await new Promise((r) => setTimeout(r, opts.waitMs));
  if (opts.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), opts.scrollY);
    await new Promise((r) => setTimeout(r, opts.waitMsAfterScroll || 600));
  }
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: !!opts.fullPage });
  const finalUrl = page.url();
  console.log("OK", name, fs.statSync(file).size, "→", finalUrl);
  return finalUrl;
}

(async () => {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const setCookie = loginRes.headers.getSetCookie?.() || [];
  const loginBody = await loginRes.json();
  console.log("login", loginRes.status, loginBody);

  const browser = await puppeteer.launch({
    executablePath: "/usr/local/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  let raw = null;
  for (const c of setCookie) {
    const m = c.match(/zdc_session=([^;]+)/);
    if (m) raw = m[1];
  }
  if (!raw) throw new Error("no session cookie");

  const domain = cookieDomain(BASE);
  await page.setCookie({
    name: "zdc_session",
    value: raw,
    domain,
    path: "/",
    httpOnly: true,
    secure: BASE.startsWith("https"),
  });

  await shot(page, "S01-dashboard", `${BASE}/admin`, { waitMs: 3500 });
  await shot(page, "S08-dashboard", `${BASE}/admin`, { waitMs: 1500 });
  await shot(page, "S02-admin-reservas", `${BASE}/admin`, {
    waitMs: 1500,
    scrollY: 1400,
    waitMsAfterScroll: 1000,
  });
  await shot(page, "S04-admin-dia", `${BASE}/admin`, {
    waitMs: 1500,
    scrollY: 800,
    waitMsAfterScroll: 800,
  });
  await shot(page, "S09-admin-lista", `${BASE}/admin`, {
    waitMs: 1500,
    scrollY: 1600,
    waitMsAfterScroll: 1000,
  });

  const caixaUrl = await shot(page, "S11-caixa", `${BASE}/admin/caixa`, {
    waitMs: 3000,
  });
  const clubeUrl = await shot(page, "S11b-clube", `${BASE}/admin/clube`, {
    waitMs: 3000,
  });
  console.log("caixa final:", caixaUrl);
  console.log("clube final:", clubeUrl);

  // If gated to plano, also capture marca as product depth
  await shot(page, "S11c-marca", `${BASE}/admin/marca`, { waitMs: 2500 });

  await shot(page, "S05-site-home", `${BASE}/${PUBLIC_SLUG}`, {
    waitMs: 2500,
  });
  await shot(page, "S06-site-servicos", `${BASE}/${PUBLIC_SLUG}`, {
    waitMs: 1200,
    scrollY: 1100,
    waitMsAfterScroll: 900,
  });
  await shot(page, "S03-agendar", `${BASE}/${PUBLIC_SLUG}/agendar`, {
    waitMs: 3000,
  });
  await shot(page, "S07-agendar-form", `${BASE}/${PUBLIC_SLUG}/agendar`, {
    waitMs: 2000,
    scrollY: 500,
    waitMsAfterScroll: 800,
  });
  await shot(page, "S12-piloto", `${BASE}/${PUBLIC_SLUG}`, { waitMs: 2000 });

  await browser.close();
  console.log("DONE from", BASE);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
