import { redirect } from "next/navigation";

import { AdminConfigAppearance } from "@/components/admin-config-appearance";
import { AdminConfigFeatureToggles } from "@/components/admin-config-feature-toggles";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminSettingsManager } from "@/components/admin-settings-manager";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRESET_KEYS = [
  {
    key: "institucional.sobre_curto",
    label: "Texto institucional (curto)",
    hint: "Usado em secções “Sobre” ou rodapé se integrar no site.",
  },
  {
    key: "institucional.politica_agendamento",
    label: "Política de agendamento / observações internas",
    hint: "Texto livre para referência da equipe.",
  },
] as const;

export default async function AdminConfiguracaoPage() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }

  const canManageSettings = access.permissions.manageSettings;
  const canManageBranding = access.permissions.manageBranding;
  const canManagePayments =
    access.role === "OWNER" || access.permissions.manageSettings;

  const [existing, org] = await Promise.all([
    canManageSettings
      ? prisma.barbershopSetting.findMany({
          where: {
            organizationId: access.organizationId,
            key: { in: PRESET_KEYS.map((p) => p.key) },
          },
        })
      : Promise.resolve([]),
    canManageBranding || canManagePayments
      ? prisma.organization.findUnique({
          where: { id: access.organizationId },
          select: {
            marketplaceListed: true,
            whatsappBotEnabled: true,
            whatsappPhoneNumberId: true,
            asaasEnabled: true,
            asaasApiKeyEnc: true,
            onboardingJson: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const map = Object.fromEntries(existing.map((r) => [r.key, r.value]));
  const textPresets = PRESET_KEYS.map((p) => ({
    key: p.key,
    label: p.label,
    hint: p.hint,
    value: map[p.key] ?? "",
  }));

  const onboarding =
    org?.onboardingJson &&
    typeof org.onboardingJson === "object" &&
    !Array.isArray(org.onboardingJson)
      ? (org.onboardingJson as Record<string, unknown>)
      : {};

  const featureInitial = org
    ? {
        marketplaceListed: org.marketplaceListed !== false,
        whatsappBotEnabled: org.whatsappBotEnabled,
        asaasEnabled: org.asaasEnabled,
        hideChecklist: onboarding.hideChecklist === true,
        whatsappConnected: Boolean(org.whatsappPhoneNumberId),
        asaasConfigured: Boolean(org.asaasApiKeyEnc),
      }
    : null;

  return (
    <main className="flex-1">
      <section className="container-max space-y-8 pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Conta"
            title="Configurações"
            subtitle="Aparência do painel, funções da barbearia e textos auxiliares."
          />
        </AnimatedSection>

        <AnimatedSection>
          <AdminConfigAppearance />
        </AnimatedSection>

        {featureInitial ? (
          <AnimatedSection>
            <AdminConfigFeatureToggles
              initial={featureInitial}
              canManageBranding={canManageBranding}
              canManagePayments={canManagePayments}
              canManageSettings={canManageSettings}
            />
          </AnimatedSection>
        ) : null}

        {canManageSettings ? (
          <AnimatedSection>
            <section
              id="textos"
              className="bn-card scroll-mt-24 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5 sm:p-6"
            >
              <h2 className="font-brand-headline text-lg font-bold tracking-tight text-[var(--bn-on)]">
                Textos auxiliares
              </h2>
              <p className="mt-1 text-sm text-[var(--bn-muted)]">
                Conteúdo interno da barbearia guardado na base de dados.
              </p>
              <div className="mt-5">
                <AdminSettingsManager presets={textPresets} />
              </div>
            </section>
          </AnimatedSection>
        ) : null}
      </section>
    </main>
  );
}
