-- Freemium: adiciona tier FREE (valor novo; dados em migração seguinte)

ALTER TYPE "OrganizationPlanTier" ADD VALUE IF NOT EXISTS 'FREE';
