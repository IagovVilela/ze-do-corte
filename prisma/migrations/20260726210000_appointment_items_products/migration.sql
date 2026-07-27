-- Multi-serviço (comanda) + catálogo de produtos
CREATE TABLE "AppointmentItem" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentProduct" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentItem_appointmentId_idx" ON "AppointmentItem"("appointmentId");
CREATE INDEX "AppointmentItem_serviceId_idx" ON "AppointmentItem"("serviceId");
CREATE INDEX "Product_organizationId_isActive_idx" ON "Product"("organizationId", "isActive");
CREATE UNIQUE INDEX "Product_organizationId_name_key" ON "Product"("organizationId", "name");
CREATE INDEX "AppointmentProduct_appointmentId_idx" ON "AppointmentProduct"("appointmentId");
CREATE INDEX "AppointmentProduct_productId_idx" ON "AppointmentProduct"("productId");

ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentProduct" ADD CONSTRAINT "AppointmentProduct_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentProduct" ADD CONSTRAINT "AppointmentProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Espelha o serviço principal em AppointmentItem para reservas existentes
INSERT INTO "AppointmentItem" ("id", "appointmentId", "serviceId", "price", "durationMinutes", "sortOrder", "createdAt")
SELECT
  gen_random_uuid()::text,
  a."id",
  a."serviceId",
  s."price",
  s."durationMinutes",
  0,
  CURRENT_TIMESTAMP
FROM "Appointment" a
INNER JOIN "Service" s ON s."id" = a."serviceId"
WHERE NOT EXISTS (
  SELECT 1 FROM "AppointmentItem" i WHERE i."appointmentId" = a."id"
);
