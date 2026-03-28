-- CreateTable
CREATE TABLE "StaffPushSubscription" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffPushSubscription_endpoint_key" ON "StaffPushSubscription"("endpoint");

CREATE INDEX "StaffPushSubscription_staffMemberId_idx" ON "StaffPushSubscription"("staffMemberId");

ALTER TABLE "StaffPushSubscription" ADD CONSTRAINT "StaffPushSubscription_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
