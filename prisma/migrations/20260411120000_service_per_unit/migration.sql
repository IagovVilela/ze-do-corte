-- Serviços por unidade: cada linha de Service pertence a uma BarbershopUnit; nome único por unidade.

-- Unidade mínima se ainda não existir (bases só com Service legacy).
INSERT INTO "BarbershopUnit" ("id", "name", "slug", "isActive", "isDefault", "createdAt", "updatedAt")
SELECT
  'cm_unit_migration_fallback',
  'Unidade principal',
  'principal',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "BarbershopUnit" LIMIT 1);

ALTER TABLE "Service" ADD COLUMN "unitId" TEXT;

UPDATE "Service" s
SET "unitId" = u.id
FROM (
  SELECT id
  FROM "BarbershopUnit"
  WHERE "isDefault" = true AND "isActive" = true
  ORDER BY "createdAt" ASC
  LIMIT 1
) u
WHERE s."unitId" IS NULL;

UPDATE "Service" s
SET "unitId" = (
  SELECT id FROM "BarbershopUnit" WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1
)
WHERE s."unitId" IS NULL;

-- Pode ser índice único (db push) ou constraint; ambos os casos cobertos
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_name_key";
DROP INDEX IF EXISTS "Service_name_key";

ALTER TABLE "Service" ALTER COLUMN "unitId" SET NOT NULL;

ALTER TABLE "Service"
ADD CONSTRAINT "Service_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "BarbershopUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Service_unitId_name_key" ON "Service"("unitId", "name");

CREATE INDEX "Service_unitId_idx" ON "Service"("unitId");
