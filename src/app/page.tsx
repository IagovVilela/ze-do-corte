import Link from "next/link";

export const metadata = {
  title: "Barbernegon | Sua barbearia, sua cara",
  description:
    "Plataforma para barbearias: site com identidade forte, agendamento online, admin, caixa e clube de assinaturas — sem burocracia.",
};

export default function BarbernegonLandingPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0a0908] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 55% at 15% -5%, rgba(196,165,116,0.28), transparent 55%), radial-gradient(ellipse 70% 45% at 95% 10%, rgba(70,50,30,0.35), transparent 50%), linear-gradient(180deg, #0a0908 0%, #12100d 45%, #0a0908 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <p className="font-display text-2xl tracking-[0.08em] text-[#e8d5b5]">Barbernegon</p>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="hidden text-sm text-zinc-400 transition hover:text-white sm:inline"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-gradient-to-r from-[#c4a574] to-[#a8895a] px-4 py-2 text-sm font-bold text-zinc-950 transition hover:brightness-110"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[min(88svh,820px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-10 md:justify-center md:pb-24">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c4a574]">
            SaaS para barbearias
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-5xl leading-[0.92] tracking-wide text-white sm:text-6xl md:text-7xl">
            Barbernegon
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-300 md:text-xl">
            Sua barbearia, sua cara, sem burocracia. Site próprio, agendamento em segundos e
            painel limpo — não um ERP pesado.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#c4a574] to-[#a8895a] px-7 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_16px_48px_-12px_rgba(196,165,116,0.55)] transition hover:brightness-110"
            >
              Criar minha barbearia
            </Link>
            <Link
              href="/ze-do-corte"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Ver demo ao vivo
            </Link>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl tracking-wide text-white md:text-4xl">
              O que você leva no dia 1
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Identidade real no site — não só um logo em app genérico. Agenda, admin, caixa e
              clube no mesmo produto, com cancelamento claro.
            </p>
            <ul className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Site com a sua cara",
                  body: "Logo, cores, slogans e hero — em barbernegon.com/sua-marca.",
                },
                {
                  title: "Agenda em menos de 30s",
                  body: "Cliente agenda no navegador, sem baixar app nem ver concorrentes.",
                },
                {
                  title: "Caixa + clube simples",
                  body: "Relatórios no balcão e assinaturas com cancelamento imediato.",
                },
              ].map((item) => (
                <li key={item.title} className="border-l border-[#c4a574]/40 pl-5">
                  <h3 className="font-display text-xl tracking-wide text-[#e8d5b5]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="font-display text-3xl tracking-wide text-white md:text-4xl">
              Pronto em minutos, não em semanas
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              Sem App Store. Sem marketplace que dilui sua marca. Trial completo para validar com
              a sua clientela.
            </p>
            <Link
              href="/cadastro"
              className="mt-8 inline-flex rounded-full bg-gradient-to-r from-[#c4a574] to-[#a8895a] px-8 py-3.5 text-sm font-bold text-zinc-950 transition hover:brightness-110"
            >
              Começar agora
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Barbernegon ·{" "}
        <Link href="/planos" className="text-zinc-400 hover:text-zinc-200">
          Planos
        </Link>
      </footer>
    </div>
  );
}
