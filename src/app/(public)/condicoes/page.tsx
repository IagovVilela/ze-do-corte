import { PlatformInformativosList } from "@/components/platform-informativos-list";

export const metadata = {
  title: "Condições e informativos | Barbernegon",
  description:
    "Termos, privacidade e PDFs explicativos para o dono da barbearia: pagamentos Asaas e WhatsApp Plus+.",
};

export default function CondicoesPage() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[20rem] bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.14),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
        <span className="mb-3 block text-[11px] font-bold tracking-[0.1em] text-[var(--bn-primary)] uppercase sm:text-[12px]">
          Transparência
        </span>
        <h1 className="font-brand-headline text-3xl font-bold tracking-tight text-[var(--bn-on)] sm:text-4xl">
          Condições da plataforma
        </h1>
        <p className="mt-2 text-sm text-[var(--bn-muted)]">
          Última atualização: 15 de agosto de 2026
        </p>
        <p className="mt-8 text-[15px] leading-relaxed text-[var(--bn-on-variant)]">
          Tudo o que o dono do salão precisa conhecer: contratos em página e os
          informativos em PDF (dinheiro no Asaas e WhatsApp oficial / Plus+).
          Ao criar conta ou assinar um plano, você declara ciência destes
          documentos.
        </p>
        <div className="mt-10">
          <PlatformInformativosList tone="public" />
        </div>
      </div>
    </div>
  );
}
