import { redirect } from "next/navigation";

import { AdminSettingsManager } from "@/components/admin-settings-manager";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";
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
  if (!access?.permissions.manageSettings) {
    redirect("/admin");
  }

  const existing = await prisma.barbershopSetting.findMany({
    where: {
      key: { in: PRESET_KEYS.map((p) => p.key) },
    },
  });
  const map = Object.fromEntries(existing.map((r) => [r.key, r.value]));

  const initial = PRESET_KEYS.map((p) => ({
    key: p.key,
    label: p.label,
    hint: p.hint,
    value: map[p.key] ?? "",
  }));

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <SectionTitle
            eyebrow="Marca"
            title="Informações da barbearia"
            subtitle="Conteúdo auxiliar guardado na base de dados. Pode expandir chaves via API se precisar."
          />
          <div className="mt-8">
            <AdminSettingsManager presets={initial} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
