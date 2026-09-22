import type { Metadata } from "next";

import { VagaPerdidaProduct } from "@/components/infoprodutos/vaga-perdida-product";

export const metadata: Metadata = {
  title: "Vaga Perdida | Barbernegon",
  description:
    "Produto prático para donos de barbearia: calcule o dinheiro deixado na mesa, feche os vazadouros da agenda e rode em 7 dias com presença própria.",
};

export default function VagaPerdidaPage() {
  return <VagaPerdidaProduct />;
}
