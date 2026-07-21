/**
 * Aplica a vitrine Barbergon na org demo (slug ze-do-corte).
 *
 * Local:  npx tsx scripts/apply-demo-vitrine.ts
 * Prod:   railway run npx tsx scripts/apply-demo-vitrine.ts
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resolveDatabaseUrlForCli } from "../prisma/database-url";
import {
  DEMO_ORG_BRANDING,
  DEMO_ORG_ID,
  DEMO_ORG_SLUG,
  demoSiteJson,
} from "../src/lib/demo-vitrine";

const connectionString = resolveDatabaseUrlForCli();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const siteJson = demoSiteJson();

  const existing = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
    select: { id: true, name: true },
  });

  if (!existing) {
    const created = await prisma.organization.create({
      data: {
        id: DEMO_ORG_ID,
        slug: DEMO_ORG_SLUG,
        planStatus: "ACTIVE",
        timezone: "America/Sao_Paulo",
        marketplaceListed: true,
        ...DEMO_ORG_BRANDING,
        siteJson,
      },
      select: { id: true, slug: true, name: true },
    });
    console.log(
      `[apply-demo-vitrine] Criada org ${created.slug} (${created.name}).`,
    );
    return;
  }

  const updated = await prisma.organization.update({
    where: { slug: DEMO_ORG_SLUG },
    data: {
      ...DEMO_ORG_BRANDING,
      siteJson,
      marketplaceListed: true,
    },
    select: { id: true, slug: true, name: true },
  });

  console.log(
    `[apply-demo-vitrine] Atualizada ${updated.slug} → "${updated.name}" com template vitrine.`,
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
