import { ConsultantInbox } from "@/components/consultores/consultant-inbox";

export const dynamic = "force-dynamic";

export default function ConsultoresHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.1em] text-brand-300 uppercase">
          Consultores
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Chamados
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Responda o salão e, se precisar, abra o painel em modo assistência
          (sem dados financeiros).
        </p>
      </div>
      <ConsultantInbox />
    </div>
  );
}
