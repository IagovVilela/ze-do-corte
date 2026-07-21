-- Support tickets (salão ↔ Barbernegon ops)

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportTicketCategory" AS ENUM ('WHATSAPP', 'PAYMENTS', 'CLUB', 'SITE', 'BILLING', 'OTHER');
CREATE TYPE "SupportMessageAuthorKind" AS ENUM ('STAFF', 'PLATFORM');

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByStaffId" TEXT NOT NULL,
  "subject" VARCHAR(160) NOT NULL,
  "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "authorKind" "SupportMessageAuthorKind" NOT NULL,
  "authorStaffId" TEXT,
  "authorEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_status_updatedAt_idx"
  ON "SupportTicket"("organizationId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_updatedAt_idx"
  ON "SupportTicket"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdByStaffId_idx"
  ON "SupportTicket"("createdByStaffId");

CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_createdAt_idx"
  ON "SupportTicketMessage"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_authorStaffId_idx"
  ON "SupportTicketMessage"("authorStaffId");

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_createdByStaffId_fkey"
  FOREIGN KEY ("createdByStaffId") REFERENCES "StaffMember"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicketMessage"
  ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketMessage"
  ADD CONSTRAINT "SupportTicketMessage_authorStaffId_fkey"
  FOREIGN KEY ("authorStaffId") REFERENCES "StaffMember"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
