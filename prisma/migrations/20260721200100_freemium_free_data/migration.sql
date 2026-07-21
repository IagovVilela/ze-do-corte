-- Freemium: normaliza orgs para Free forever (requer enum FREE já commitado)

UPDATE "Organization"
SET "planTier" = 'FREE'
WHERE "planTier" = 'STARTER';

UPDATE "Organization"
SET
  "planStatus" = 'ACTIVE',
  "planTier" = 'FREE'
WHERE "planStatus" = 'TRIAL'
  AND "trialEndsAt" IS NOT NULL
  AND "trialEndsAt" < CURRENT_TIMESTAMP;

UPDATE "Organization"
SET
  "planStatus" = 'ACTIVE',
  "planTier" = 'FREE'
WHERE "planStatus" = 'PAST_DUE'
  AND ("asaasSubscriptionId" IS NULL OR "asaasSubscriptionId" = '');
