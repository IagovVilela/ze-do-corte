import Link from "next/link";

type Props = {
  /** Free forever — upsell Pro, sem tom de bloqueio total */
  freeUpsell?: boolean;
};

export function BillingAttentionBanner({ freeUpsell = false }: Props) {
  if (freeUpsell) {
    return (
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-[var(--bn-status-info)]">
        <p className="font-medium">Você está no Free</p>
        <p className="mt-1 text-[var(--bn-status-info)]/80">
          Site, agenda e Explorar continuam liberados (até 2 barbeiros e 1
          loja). O Pro desbloqueia Caixa, Clube, barbeiros ilimitados e várias
          unidades —{" "}
          <Link href="/admin/plano" className="underline hover:text-[var(--bn-on)]">
            ver planos
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-[var(--bn-status-info)]">
      <p className="font-medium">Assinatura Pro</p>
      <p className="mt-1 text-[var(--bn-status-info)]/80">
        O trial Pro acabou ou o pagamento está em atraso. Caixa e Clube ficam no Pro —{" "}
        <Link href="/admin/plano" className="underline hover:text-[var(--bn-on)]">
          assine ou regularize em Plano
        </Link>
        . Enquanto isso você continua no Free (site, agenda, até 2 barbeiros).
      </p>
    </div>
  );
}
