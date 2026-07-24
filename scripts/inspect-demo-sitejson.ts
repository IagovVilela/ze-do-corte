import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrlForCli } from "../prisma/database-url";
import { parseSiteCanvasConfig } from "../src/lib/site-canvas";

async function main() {
  const label = process.argv[2] ?? "DB";
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: resolveDatabaseUrlForCli() }),
  });
  const org = await prisma.organization.findUnique({
    where: { slug: "ze-do-corte" },
    select: { name: true, slogan: true, siteJson: true },
  });
  console.log(`[${label}] name:`, org?.name);
  console.log(`[${label}] slogan:`, org?.slogan);
  const sj = org?.siteJson as Record<string, unknown> | null;
  if (!sj) {
    console.log(`[${label}] siteJson: NULL`);
  } else {
    const theme = sj.theme as Record<string, unknown> | undefined;
    const elements = sj.elements as unknown[] | undefined;
    console.log(
      `[${label}] version:`,
      sj.version,
      "bgArt:",
      theme?.bgArt,
      "elements:",
      elements?.length,
    );
    const first = (elements ?? []).slice(0, 4) as Array<{
      id?: string;
      type?: string;
    }>;
    console.log(
      `[${label}] first:`,
      first.map((e) => `${e.type}:${e.id}`),
    );
  }
  const parsed = parseSiteCanvasConfig(org?.siteJson, org?.name ?? "x");
  const desk = parsed.elements.filter((e) => e.artboard === "desktop");
  const sample = desk.slice(0, 8).map((e) => {
    const t = e.props?.title || e.props?.text || e.props?.eyebrow || "";
    return `${e.type}:${String(t).slice(0, 36)}`;
  });
  console.log(`[${label}] parsed desk:`, desk.length, sample);
  console.log(
    `[${label}] looksClassic:`,
    sample.some((s) => s.includes("Corte clássico") || s.includes("Tradição")),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
