type Props = {
  variant?: "section" | "compact";
};

export function DatabaseUnavailableNotice({ variant = "section" }: Props) {
  return (
    <div
      className={
        variant === "section"
          ? "rounded-2xl border border-sky-500/30 bg-sky-500/10 px-6 py-6 text-sky-50"
          : "rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4 text-sm text-sky-50"
      }
    >
      <p className="font-semibold text-sky-200">Banco de dados indisponível</p>
      <p className="mt-2 text-sky-100/95">
        Não foi possível ligar ao PostgreSQL (erro típico:{" "}
        <code className="rounded bg-black/20 px-1 py-0.5 text-xs">ECONNREFUSED</code> /{" "}
        <code className="rounded bg-black/20 px-1 py-0.5 text-xs">P1001</code>). Inicie o
        serviço PostgreSQL, confira a <code className="text-xs">DATABASE_URL</code> no{" "}
        <code className="text-xs">.env</code> e crie a base se necessário. Depois execute:{" "}
        <code className="text-xs">npx prisma db push</code>
      </p>
      <p className="mt-3 text-xs text-sky-200/80">
        Guia: <span className="font-mono">docs/operacao.md</span> (seção Erro P1001).
      </p>
    </div>
  );
}
