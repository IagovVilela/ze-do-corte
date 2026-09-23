/**
 * Recaptura só painel + grade (as outras já estão ok).
 */
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

async function login(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector("input", { timeout: 15000 });
  await page.evaluate((email, pass) => {
    const all = [...document.querySelectorAll("input")];
    const emailInput =
      all.find((i) => /email/i.test(i.type + i.name + i.id)) ||
      all.find((i) => i.type === "text" || i.type === "");
    const passInput = all.find((i) => i.type === "password");
    const nativeSet = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    const set = (el, v) => {
      el.focus();
      nativeSet?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(emailInput, email);
    set(passInput, pass);
  }, EMAIL, PASS);
  await page.focus('input[type="password"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }).catch(() => null),
    page.keyboard.press("Enter"),
  ]);
  if (page.url().includes("/login")) {
    await page.evaluate(() => {
      [...document.querySelectorAll("button")]
        .find((x) => /Entrar/i.test(x.textContent || ""))
        ?.click();
    });
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 });
  }
}

async function hideProOnly(page) {
  await page.evaluate(() => {
    document.querySelectorAll("div,section").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t.startsWith("Assinatura Pro") && t.length < 450) {
        el.style.setProperty("display", "none", "important");
      }
    });
  });
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ["--no-sandbox", "--window-size=1440,900"],
});

try {
  const page = await browser.newPage();
  await login(page);

  // Painel
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(
    () => /Visão da operação|Ritual do dia/i.test(document.body.innerText),
    { timeout: 60000 },
  );
  await hideProOnly(page);
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT, "02-painel-acoes.png"), type: "png" });
  console.log("ok 02");

  // Grade
  await page.goto(`${BASE}/admin/agendamentos`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(
    () => /Frequência de cortes|Agendamentos/i.test(document.body.innerText),
    { timeout: 60000 },
  );
  await hideProOnly(page);
  await new Promise((r) => setTimeout(r, 2000));
  // scroll até o heatmap (legenda 0%–20%)
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((n) =>
      /^0%\s*[–-]\s*20%$/.test((n.textContent || "").trim()),
    );
    el?.scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, "03-grade-ocupacao.png"), type: "png" });
  console.log("ok 03");
} finally {
  await browser.close();
}
