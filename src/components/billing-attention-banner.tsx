import Link from "next/link";

export function BillingAttentionBanner() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-medium">Assinatura pendente</p>
      <p className="mt-1 text-amber-100/80">
        O trial expirou ou o pagamento está em atraso. Caixa e Clube ficam bloqueados no
        Starter / após o trial —{" "}
        <Link href="/admin/plano" className="underline hover:text-white">
          regularize em Plano
        </Link>
        .
      </p>
    </div>
  );
}
