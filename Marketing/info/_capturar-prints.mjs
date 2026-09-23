/**
 * Captura prints nítidos do Barbernegon (desktop) para o e-book Vaga Perdida.
 * Uso: node Marketing/info/_capturar-prints.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "prints");
const BASE = "https://barbernegon-production.up.railway.app";
const EMAIL = process.env.BN_SHOT_EMAIL;
const PASS = process.env.BN_SHOT_PASS;
if (!EMAIL || !PASS) {
  console.error("Defina BN_SHOT_EMAIL e BN_SHOT_PASS no ambiente.");
  process.exit(1);
}

async function hideNoise(page) {
  await page.evaluate(() => {
    document.querySelectorAll("div,section,aside").forEach((el) => {
      const first = el.children[0];
      if (first && /Assinatura Pro/.test(first.textContent || "")) {
        el.style.setProperty("display", "none", "important");
      }
    });
    document.querySelectorAll("button,div,a").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t === "Baixar aplicativo" || t.includes("Baixar aplicativo")) {
        const box = el.closest("div");
        if (box) box.style.setProperty("display", "none", "important");
      }
    });
  });
}

async function shot(page, file, opts = {}) {
  await hideNoise(page);
  await page.waitForTimeout?.(400);
  await new Promise((r) => setTimeout(r, 500));
  const dest = path.join(OUT, file);
  await page.screenshot({
    path: dest,
    type: "png",
    fullPage: false,
    ...opts,
  });
  console.log("ok", file);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  defaultViewport: { width: 1280, height: 820, deviceScaleFactor: 1 },
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();

  // Login
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2", timeout: 90000 });
  await shot(page, "01-login.png");

  // Login form fields can be type=text for email
  await page.waitForSelector("input", { timeout: 15000 });
  await page.evaluate((email, pass) => {
    const all = [...document.querySelectorAll("input")];
    const emailInput =
      all.find((i) => /email/i.test(i.type) || /email/i.test(i.name) || /email/i.test(i.id) || /e-?mail/i.test(i.placeholder || "") || /e-?mail/i.test(i.getAttribute("aria-label") || "") || /E-mail/i.test(i.labels?.[0]?.textContent || "")) ||
      all.find((i) => i.type === "text" || i.type === "");
    const passInput = all.find((i) => i.type === "password");
    if (!emailInput || !passInput) throw new Error("login fields missing: " + all.map(i => i.type).join(","));
    const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const set = (el, v) => {
      el.focus();
      nativeSet?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(emailInput, email);
    set(passInput, pass);
  }, EMAIL, PASS);
  // Prefer keyboard submit for React forms
  await page.focus('input[type="password"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }).catch(() => null),
    page.keyboard.press("Enter"),
  ]);
  if (page.url().includes("/login")) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Entrar/i.test(x.textContent || ""),
      );
      b?.click();
    });
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }).catch(() => null);
  }
  if (page.url().includes("/login")) {
    const err = await page.evaluate(() => document.body.innerText.slice(0, 500));
    throw new Error("Login failed. Page text: " + err);
  }

  // Painel — esconder sidebar se existir overlay
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.evaluate(() => {
    document.querySelectorAll("nav, aside").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 240 && r.width < 420) el.style.setProperty("display", "none", "important");
    });
  });
  await hideNoise(page);
  await shot(page, "02-painel-acoes.png");

  // Grade
  await page.goto(`${BASE}/admin/agendamentos`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.evaluate(() => {
    document.querySelectorAll("nav, aside").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 240 && r.width < 420) el.style.setProperty("display", "none", "important");
    });
  });
  await hideNoise(page);
  // rola até o heatmap
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h1,h2,h3")].find((x) =>
      /Frequência|ocupação|Agendamentos/i.test(x.textContent || ""),
    );
    h?.scrollIntoView({ block: "start" });
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => window.scrollBy(0, 280));
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, "03-grade-ocupacao.png");

  // Site
  await page.goto(`${BASE}/ze-do-corte`, { waitUntil: "networkidle2", timeout: 90000 });
  await hideNoise(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "04-site-marca.png");

  // Agendar
  await page.goto(`${BASE}/ze-do-corte/agendar`, { waitUntil: "networkidle2", timeout: 90000 });
  await hideNoise(page);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2,h3,p")].find((x) =>
      /Nova reserva|Selecione os serviços/i.test(x.textContent || ""),
    );
    h?.scrollIntoView({ block: "start" });
  });
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, "05-fluxo-agendar.png");

  // Cadastro
  await page.goto(`${BASE}/cadastro`, { waitUntil: "networkidle2", timeout: 90000 });
  await hideNoise(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "06-cadastro.png");
} finally {
  await browser.close();
}
