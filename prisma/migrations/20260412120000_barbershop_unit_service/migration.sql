-- Tabela de preço/duração por unidade (overrides) ligada a Service + BarbershopUnit.

CREATE TABLE "BarbershopUnitService" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "durationMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarbershopUnitService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BarbershopUnitService_unitId_serviceId_key" ON "BarbershopUnitService"("unitId", "serviceId");

CREATE INDEX "BarbershopUnitService_unitId_idx" ON "BarbershopUnitService"("unitId");

CREATE INDEX "BarbershopUnitService_serviceId_idx" ON "BarbershopUnitService"("serviceId");

ALTER TABLE "BarbershopUnitService" ADD CONSTRAINT "BarbershopUnitService_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BarbershopUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BarbershopUnitService" ADD CONSTRAINT "BarbershopUnitService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
