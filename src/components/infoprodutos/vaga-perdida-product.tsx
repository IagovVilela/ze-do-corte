"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STORAGE_KEY = "bn-vaga-perdida-v1";

const theme = {
  "--vp-bg": "#0a0e13",
  "--vp-surface": "#0f1419",
  "--vp-elevated": "#151c26",
  "--vp-line": "#1e2a3a",
  "--vp-on": "#e2eaf4",
  "--vp-muted": "#a8b6c9",
  "--vp-blue": "#3b82f6",
  "--vp-blue-soft": "#8eb6ff",
  "--vp-warn": "#f59e0b",
  "--vp-ok": "#34d399",
} as CSSProperties;

type Snapshot = {
  slots: string;
  done: string;
  ticket: string;
  leaks: string[];
  days: number[];
};

const LEAKS = [
  {
    id: "noshow",
    title: "No-show",
    blurb: "Confirmou e não apareceu. A cadeira ficou fria.",
    shot: "/infoprodutos/vaga-perdida/S02-admin-reservas.png",
    tip: "Confirmação + lembrete na véspera. Grade no painel mostra onde a ocupação cai.",
  },
  {
    id: "buraco",
    title: "Horário morto",
    blurb: "Buraco no meio do dia que ninguém preenche.",
    shot: "/infoprodutos/vaga-perdida/S04-admin-dia.png",
    tip: "Operacional do dia: enxergue o buraco cedo e dispare a lista de encaixe.",
  },
  {
    id: "whats",
    title: "Só WhatsApp",
    blurb: "Marcação solta. Demora = cliente marca em outro lugar.",
    shot: "/infoprodutos/vaga-perdida/S03-agendar.png",
    tip: "Agenda online na sua marca: o cliente marca sem depender da sua resposta.",
  },
  {
    id: "market",
    title: "Marketplace",
    blurb: "Você aluga atenção. O hábito fica com a plataforma.",
    shot: "/infoprodutos/vaga-perdida/S05-site-home.png",
    tip: "Site white-label na sua URL — presença própria, não comparação eterna.",
  },
  {
    id: "cara",
    title: "Sem cara digital",
    blurb: "Parece “mais uma”. Menos compromisso, mais falta.",
    shot: "/infoprodutos/vaga-perdida/S06-site-servicos.png",
    tip: "Identidade + agenda no mesmo lugar. Cliente vê a casa, não um app genérico.",
  },
] as const;

const DAYS = [
  "Calcule A, T e R$ na mesa",
  "Ajuste expediente e bloqueios",
  "Salve os 3 scripts",
  "Monte lista de espera (10)",
  "Publique regra anti no-show",
  "Publique agenda com a cara da casa",
  "Meça de novo e compare",
];

const SCRIPTS = [
  {
    label: "Marcação",
    text: "Fala, [Nome]! Seu horário na [Barbearia] está marcado para [dia] às [hora] — [serviço]. Responde 1 para confirmar ou 2 para remarcar.",
  },
  {
    label: "Véspera",
    text: "[Nome], amanhã às [hora] te esperamos. Se não puder, avisa até [limite] que eu encaixo outra pessoa.",
  },
  {
    label: "Encaixe",
    text: "Abriu vaga hoje às [hora] para [serviço]. Quer encaixar? Responde AGORA.",
  },
];

function money(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function num(raw: string) {
  const n = Number(String(raw).replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function loadSnapshot(): Snapshot {
  const empty: Snapshot = {
    slots: "40",
    done: "31",
    ticket: "75",
    leaks: [],
    days: [],
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export function VagaPerdidaProduct() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [slots, setSlots] = useState("40");
  const [done, setDone] = useState("31");
  const [ticket, setTicket] = useState("75");
  const [leaks, setLeaks] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeLeak, setActiveLeak] = useState<string>("noshow");

  const onHydrate = useEffectEvent(() => {
    const s = loadSnapshot();
    setSlots(s.slots);
    setDone(s.done);
    setTicket(s.ticket);
    setLeaks(s.leaks);
    setDays(s.days);
    setReady(true);
  });

  useEffect(() => {
    onHydrate();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Snapshot = { slots, done, ticket, leaks, days };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, slots, done, ticket, leaks, days]);

  const A = num(slots);
  const T = Math.min(num(done), A);
  const lost = Math.max(A - T, 0);
  const left = lost * num(ticket);
  const fillPct = A > 0 ? Math.round((T / A) * 100) : 0;

  const chartData = [
    { name: "Atendidos", value: T, fill: "#34d399" },
    { name: "Perdidas", value: lost, fill: "#3b82f6" },
  ];

  function toggleLeak(id: string) {
    setActiveLeak(id);
    setLeaks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleDay(i: number) {
    setDays((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  }

  async function copyScript(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  const fade = reduce
    ? {}
    : {
        initial: { y: 14 },
        whileInView: { y: 0 },
        viewport: { once: true, margin: "-40px", amount: 0.15 },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      };

  const active = LEAKS.find((l) => l.id === activeLeak) ?? LEAKS[0];

  return (
    <div
      className="min-h-svh bg-[var(--vp-bg)] font-[family-name:var(--font-geist-sans)] text-[var(--vp-on)] antialiased"
      style={theme}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,rgba(59,130,246,0.28),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_10%,rgba(142,182,255,0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-[var(--vp-blue-soft)]"
        >
          Barbernegon
        </Link>
        <a
          href="#calculadora"
          className="rounded-full bg-[var(--vp-blue)] px-4 py-2 text-sm font-semibold text-[#04101f]"
        >
          Calcular minha perda
        </a>
      </header>

      {/* Hero — uma composição */}
      <section className="relative z-10 mx-auto grid max-w-5xl gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pb-20 lg:pt-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--vp-blue-soft)]">
            Produto Barbernegon · R$ 19,90
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(3.4rem,12vw,5.6rem)] leading-[0.92] tracking-wide text-white">
            VAGA
            <br />
            PERDIDA
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--vp-muted)] sm:text-lg">
            Pare de deixar dinheiro na mesa na agenda. Calcule o estrago, feche
            os vazadouros e coloque a marcação sob o controle da sua marca.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#calculadora"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0e13]"
            >
              Abrir calculadora
            </a>
            <a
              href="#vazadouros"
              className="inline-flex items-center justify-center rounded-full border border-[var(--vp-line)] px-5 py-3 text-sm font-semibold text-[var(--vp-on)]"
            >
              Ver os 5 vazadouros
            </a>
          </div>
        </div>

        <motion.div
          className="relative overflow-hidden rounded-[1.25rem] border border-[var(--vp-line)] bg-[var(--vp-surface)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          initial={reduce ? false : { y: 10 }}
          animate={reduce ? undefined : { y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src="/infoprodutos/vaga-perdida/S01-dashboard.png"
            alt="Painel Barbernegon — visão da operação"
            width={1440}
            height={900}
            className="h-auto w-full"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0e13] via-[#0a0e13]/70 to-transparent p-4 pt-16">
            <p className="text-xs text-[var(--vp-muted)]">
              Print real do painel · o produto te ensina a ler a operação
            </p>
          </div>
        </motion.div>
      </section>

      {/* Calculadora */}
      <motion.section
        id="calculadora"
        className="relative z-10 mx-auto max-w-5xl scroll-mt-8 px-4 py-14 sm:px-6"
        {...fade}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vp-blue-soft)]">
          Passo 1 · Diagnóstico em 15 min
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
          Quanto você deixou na mesa?
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--vp-muted)]">
          Preencha com a última semana. A ferramenta calcula na hora — e salva
          no seu aparelho para você voltar.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-[var(--vp-line)] bg-[var(--vp-surface)] p-5 sm:p-6">
            <Field
              label="A — Horários abertos no expediente"
              value={slots}
              onChange={setSlots}
              hint="Slots que poderiam ser vendidos"
            />
            <Field
              label="T — Atendimentos realizados"
              value={done}
              onChange={setDone}
              hint="Confirmados / concluídos de fato"
            />
            <Field
              label="Ticket — preço do serviço mais vendido (R$)"
              value={ticket}
              onChange={setTicket}
              hint="Ex.: corte ou combo principal"
            />
            <p className="rounded-xl bg-[var(--vp-elevated)] px-4 py-3 text-sm text-[var(--vp-muted)]">
              Fórmula:{" "}
              <span className="text-[var(--vp-on)]">
                (A − T) × Ticket = R$ deixado na mesa
              </span>
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-[var(--vp-line)] bg-[var(--vp-surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--vp-muted)]">
                  Resultado da semana
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-5xl tracking-wide text-white">
                  {money(left)}
                </p>
                <p className="mt-1 text-sm text-[var(--vp-muted)]">
                  {lost} vagas perdidas · ocupação {fillPct}%
                </p>
              </div>
              <div className="text-right text-sm text-[var(--vp-muted)]">
                <p>
                  Abertos <span className="text-[var(--vp-on)]">{A}</span>
                </p>
                <p>
                  Feitos <span className="text-[var(--vp-ok)]">{T}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 h-48 w-full min-h-[12rem]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                <BarChart data={chartData} barCategoryGap="28%">
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#a8b6c9", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#151c26",
                      border: "1px solid #1e2a3a",
                      borderRadius: 12,
                      color: "#e2eaf4",
                    }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 4, 4]}>
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-auto pt-4 text-sm leading-relaxed text-[var(--vp-muted)]">
              {left >= 500
                ? "Esse número cabe num corte de cabelo por dia recuperado. O risco não é “dia fraco” — é vazão de operação."
                : "Mesmo em semanas mais cheias, o método protege a cadeira quando o cancelamento chega."}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Vazadouros interativos */}
      <motion.section
        id="vazadouros"
        className="relative z-10 mx-auto max-w-5xl scroll-mt-8 px-4 py-14 sm:px-6"
        {...fade}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vp-blue-soft)]">
          Passo 2 · Onde a vaga some
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
          Marque os vazadouros da sua casa
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--vp-muted)]">
          Toque nos que batem com a sua operação. Cada um abre o print e a
          ponte com o Barbernegon.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEAKS.map((leak) => {
            const on = leaks.includes(leak.id);
            const focus = activeLeak === leak.id;
            return (
              <button
                key={leak.id}
                type="button"
                onClick={() => toggleLeak(leak.id)}
                className={`rounded-2xl border px-3 py-4 text-left transition ${
                  focus
                    ? "border-[var(--vp-blue)] bg-[var(--vp-blue)]/15"
                    : "border-[var(--vp-line)] bg-[var(--vp-surface)] hover:border-[var(--vp-blue-soft)]/40"
                }`}
              >
                <span
                  className={`mb-2 inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px] ${
                    on
                      ? "border-[var(--vp-ok)] bg-[var(--vp-ok)] text-[#06241a]"
                      : "border-[var(--vp-line)] text-[var(--vp-muted)]"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <p className="font-semibold text-white">{leak.title}</p>
                <p className="mt-1 text-xs leading-snug text-[var(--vp-muted)]">
                  {leak.blurb}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid overflow-hidden rounded-2xl border border-[var(--vp-line)] bg-[var(--vp-surface)] lg:grid-cols-2">
          <div className="relative min-h-[220px] border-b border-[var(--vp-line)] lg:border-b-0 lg:border-r">
            <Image
              src={active.shot}
              alt={active.title}
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-7">
            <p className="text-xs uppercase tracking-wider text-[var(--vp-blue-soft)]">
              Como isso fica no Barbernegon
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {active.title}
            </h3>
            <p className="mt-3 text-[var(--vp-muted)]">{active.tip}</p>
            <p className="mt-4 text-sm text-[var(--vp-muted)]">
              Selecionados:{" "}
              <span className="text-[var(--vp-on)]">
                {leaks.length === 0
                  ? "nenhum ainda — marque os seus"
                  : `${leaks.length} de 5`}
              </span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Método + scripts */}
      <motion.section
        id="metodo"
        className="relative z-10 mx-auto max-w-5xl scroll-mt-8 px-4 py-14 sm:px-6"
        {...fade}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vp-blue-soft)]">
          Passo 3 · Método
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
          Quatro movimentos
        </h2>

        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            [
              "A · Padronize a oferta",
              "Expediente real, bloqueios, serviços longos vs curtos, 1–2 janelas de encaixe.",
            ],
            [
              "B · Confirmação em 2 toques",
              "Marcação + véspera. Sem isso, no-show vira cultura.",
            ],
            [
              "C · Reposição imediata",
              "Lista de 10–20 flexíveis. Cancelou → dispara em sequência.",
            ],
            [
              "D · Tire a agenda do chat solto",
              "WhatsApp é relacionamento. Marcação precisa de fluxo próprio.",
            ],
          ].map(([t, d], i) => (
            <li
              key={t}
              className="rounded-2xl border border-[var(--vp-line)] bg-[var(--vp-surface)] p-5"
            >
              <p className="text-xs text-[var(--vp-blue-soft)]">0{i + 1}</p>
              <p className="mt-1 text-lg font-semibold text-white">{t}</p>
              <p className="mt-2 text-sm text-[var(--vp-muted)]">{d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-3">
          <h3 className="text-lg font-semibold text-white">
            Scripts prontos — toque para copiar
          </h3>
          {SCRIPTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => copyScript(s.label, s.text)}
              className="flex w-full items-start justify-between gap-4 rounded-2xl border border-[var(--vp-line)] bg-[var(--vp-elevated)] px-4 py-4 text-left transition hover:border-[var(--vp-blue)]/50"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--vp-blue-soft)]">
                  {s.label}
                  {copied === s.label ? " · copiado" : ""}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--vp-on)]">
                  {s.text}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--vp-blue)]/20 px-3 py-1 text-xs font-semibold text-[var(--vp-blue-soft)]">
                Copiar
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--vp-line)]">
          <Image
            src="/infoprodutos/vaga-perdida/S07-agendar-form.png"
            alt="Formulário de agendamento online"
            width={1440}
            height={900}
            className="h-auto w-full"
          />
        </div>
        <p className="mt-3 text-center text-sm text-[var(--vp-muted)]">
          Passo D na prática: o cliente marca no navegador — você opera o painel.
        </p>
      </motion.section>

      {/* Checklist 7 dias */}
      <motion.section
        id="checklist"
        className="relative z-10 mx-auto max-w-5xl scroll-mt-8 px-4 py-14 sm:px-6"
        {...fade}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vp-blue-soft)]">
          Passo 4 · Execução
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
          Checklist de 7 dias
        </h2>
        <p className="mt-3 text-[var(--vp-muted)]">
          Marque conforme for fazendo. Progresso: {days.length}/7
        </p>

        <ul className="mt-6 space-y-2">
          {DAYS.map((label, i) => {
            const on = days.includes(i);
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                    on
                      ? "border-[var(--vp-ok)]/50 bg-[var(--vp-ok)]/10"
                      : "border-[var(--vp-line)] bg-[var(--vp-surface)]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      on
                        ? "bg-[var(--vp-ok)] text-[#06241a]"
                        : "bg-[var(--vp-elevated)] text-[var(--vp-muted)]"
                    }`}
                  >
                    {on ? "✓" : i + 1}
                  </span>
                  <span className="text-[var(--vp-on)]">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--vp-elevated)]">
          <motion.div
            className="h-full rounded-full bg-[var(--vp-blue)]"
            animate={{ width: `${(days.length / 7) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </motion.section>

      {/* Tour visual */}
      <motion.section
        className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6"
        {...fade}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--vp-blue-soft)]">
          Prova · Barbernegon
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
          Tire a agenda do improviso
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--vp-muted)]">
          Site com a sua cara, agenda em segundos, painel limpo. Prints reais do
          piloto em produção.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            ["Painel", "/infoprodutos/vaga-perdida/S08-dashboard.png"],
            ["Grade de vagas", "/infoprodutos/vaga-perdida/S09-admin-lista.png"],
            ["Site da marca", "/infoprodutos/vaga-perdida/S12-piloto.png"],
            ["Identidade", "/infoprodutos/vaga-perdida/S11c-marca.png"],
          ].map(([label, src]) => (
            <figure
              key={label}
              className="overflow-hidden rounded-2xl border border-[var(--vp-line)] bg-[var(--vp-surface)]"
            >
              <Image
                src={src}
                alt={label}
                width={1440}
                height={900}
                className="h-auto w-full"
              />
              <figcaption className="px-4 py-3 text-sm text-[var(--vp-muted)]">
                {label}
              </figcaption>
            </figure>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-[var(--vp-blue)]/40 bg-[linear-gradient(135deg,#0f1419_0%,#122036_55%,#0a0e13_100%)] px-6 py-10 sm:px-10">
          <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
            Sua barbearia, sua cara
          </h2>
          <p className="mt-3 max-w-xl text-[var(--vp-muted)]">
            Você já sabe onde a vaga some. Crie sua barbearia no Barbernegon,
            publique o link e rode o checklist.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/cadastro"
              className="rounded-full bg-[var(--vp-blue)] px-6 py-3 text-sm font-semibold text-white"
            >
              Criar minha barbearia
            </Link>
            <Link
              href="/ze-do-corte"
              className="rounded-full border border-[var(--vp-line)] px-6 py-3 text-sm font-semibold text-[var(--vp-on)]"
            >
              Ver piloto ao vivo
            </Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-[var(--vp-muted)]">
          Vaga Perdida · produto Barbernegon · progresso salvo neste aparelho
        </p>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--vp-on)]">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-[var(--vp-line)] bg-[var(--vp-elevated)] px-4 py-3 text-lg text-white outline-none ring-[var(--vp-blue)] focus:ring-2"
      />
      <span className="mt-1 block text-xs text-[var(--vp-muted)]">{hint}</span>
    </label>
  );
}
