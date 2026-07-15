-- Marketplace: opt-in para aparecer em /explorar
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "marketplaceListed" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Organization_marketplaceListed_planStatus_idx"
  ON "Organization"("marketplaceListed", "planStatus");
