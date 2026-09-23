import Image from "next/image";
import type { ReactNode } from "react";

import { VAGA_PERDIDA_CHECKOUT_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STACK = [
  "Diagnóstico rápido: descubra em minutos quanto você perdeu essa semana",
  "Os 5 motivos pelos quais a vaga some (e qual atacar primeiro)",
  "3 mensagens prontas para confirmar, proteger e repor horário",
  "Checklist de 7 dias para aplicar tudo, passo a passo",
  "O caminho direto para fazer isso rodar sozinho, todo dia",
] as const;

const PREVIEW = [
  {
    title: "Diagnóstico",
    body: "Teste expresso de 2 minutos + conta da semana para achar o R$ que ficou na mesa.",
  },
  {
    title: "Scripts prontos",
    body: "Confirmação com prazo, lembrete na véspera e disparo de encaixe — copie e cole no WhatsApp.",
  },
  {
    title: "Checklist 7 dias",
    body: "Uma ação por dia para tirar a agenda do improviso sem virar planilha.",
  },
] as const;

function CheckoutButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={VAGA_PERDIDA_CHECKOUT_URL}
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#2563eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function VagaPerdidaLanding({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "brand-onyx relative min-h-svh overflow-hidden bg-[#0b0e15] text-[#e1e2ec]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.22),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5">
          <Image
            src="/images/barbernegon-logo.png"
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-[family-name:var(--font-auth-headline)] text-lg font-bold tracking-tight">
            Barbernegon
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pb-24 sm:pt-14">
        {/* Hero — uma composição */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#3B82F6] uppercase">
              Guia prático · Info-produto
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-auth-headline)] text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Descubra quanto a vaga perdida está tirando do seu caixa
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              A casa parece cheia no WhatsApp e a semana ainda fecha fraca. Este
              guia mostra o motivo — e o caminho mais curto para parar de perder
              dinheiro em horário vazio.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Leitura rápida · R$&nbsp;19,90
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CheckoutButton>Quero o guia agora →</CheckoutButton>
              <span className="text-xs text-zinc-500">
                Acesso digital imediato após o pagamento
              </span>
            </div>
          </div>

          {/* Mockup tipográfico do e-book */}
          <div className="mx-auto w-full max-w-[280px] lg:mx-0 lg:justify-self-end">
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-gradient-to-br from-[#191b23] via-[#10131a] to-[#0b0e15] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%)]" />
              <div className="relative flex h-full flex-col p-7">
                <p className="text-[10px] font-bold tracking-[0.2em] text-[#C5A059] uppercase">
                  Barbernegon
                </p>
                <p className="mt-8 font-[family-name:var(--font-auth-headline)] text-3xl font-bold leading-none tracking-tight text-white">
                  Vaga
                  <br />
                  Perdida
                </p>
                <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                  Por que a agenda “anda” e o caixa não — e o que fazer em 7
                  dias.
                </p>
                <div className="mt-auto border-t border-white/10 pt-4">
                  <p className="text-[10px] tracking-wide text-zinc-500 uppercase">
                    Guia prático
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stack */}
        <section className="mt-16 sm:mt-20">
          <h2 className="font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white">
            O que você recebe
          </h2>
          <ul className="mt-6 space-y-0 divide-y divide-white/10 border-y border-white/10">
            {STACK.map((item) => (
              <li
                key={item}
                className="flex gap-3 py-3.5 text-[15px] leading-snug text-zinc-300"
              >
                <span className="mt-0.5 font-bold text-[#3B82F6]" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Para quem */}
        <section className="mt-14 sm:mt-16">
          <h2 className="font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white">
            Para quem é
          </h2>
          <ul className="mt-5 space-y-3 text-[15px] text-zinc-400">
            <li className="flex gap-2">
              <span className="text-[#3B82F6]">—</span>
              1 unidade, poucos barbeiros, agenda ainda misturada no WhatsApp
            </li>
            <li className="flex gap-2">
              <span className="text-[#3B82F6]">—</span>
              Casa “andando”, mas o caixa da semana não fecha como o movimento
              sugere
            </li>
            <li className="flex gap-2">
              <span className="text-[#3B82F6]">—</span>
              Já tentou organizar e em poucos dias voltou ao improviso
            </li>
          </ul>
          <p className="mt-5 text-sm text-zinc-500">
            Não é para rede com sistema maduro nem para quem só quer “mais um
            app”. É para quem quer medir o buraco e tapar com regra simples.
          </p>
        </section>

        {/* Prévia */}
        <section className="mt-14 sm:mt-16">
          <h2 className="font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white">
            Por dentro do guia
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {PREVIEW.map((block) => (
              <div key={block.title}>
                <h3 className="font-[family-name:var(--font-auth-headline)] text-sm font-bold tracking-wide text-[#adc6ff] uppercase">
                  {block.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {block.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Preço + CTA */}
        <section className="mt-16 border-t border-white/10 pt-12 text-center sm:mt-20">
          <p className="text-sm text-zinc-500">
            <span className="mr-2 line-through">R$&nbsp;97</span>
            <span className="font-[family-name:var(--font-auth-headline)] text-4xl font-bold text-white">
              R$&nbsp;19,90
            </span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Preço de entrada · pagamento único · entrega digital
          </p>
          <div className="mt-8">
            <CheckoutButton className="min-w-[220px] px-10 py-4 text-base">
              Comprar o guia Vaga Perdida →
            </CheckoutButton>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-6 text-center text-xs text-zinc-600">
        © Barbernegon — material educativo. Adapte as regras à sua operação.
      </footer>
    </div>
  );
}
