-- Configuração do site institucional por organização (tema + blocos).
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "siteJson" JSONB;
