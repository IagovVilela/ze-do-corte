import Link from "next/link";

import { LegalDoc } from "@/components/legal-doc";

export const metadata = {
  title: "Política de Privacidade | Barbernegon",
  description:
    "Como a Barbernegon trata dados pessoais (LGPD) de salões, equipe e clientes finais.",
};

export default function PrivacidadePage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Política de Privacidade"
      updatedAt="27 de julho de 2026"
    >
      <p>
        Esta Política descreve como a{" "}
        <strong className="text-[var(--bn-on)]">Barbernegon</strong> trata
        dados pessoais no uso da plataforma, em conformidade com a Lei Geral de
        Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>
      <p>
        Ao usar o serviço, você também concorda com os{" "}
        <Link href="/termos">Termos de Uso</Link> e declara ciência das{" "}
        <Link href="/condicoes">condições e informativos</Link>.
      </p>

      <h2>1. Controladores e operadores</h2>
      <ul>
        <li>
          <strong className="text-[var(--bn-on)]">Barbernegon</strong> é
          controladora dos dados da conta do salão (cadastro, billing da
          plataforma, logs de segurança e suporte).
        </li>
        <li>
          A <strong className="text-[var(--bn-on)]">barbearia (organização)</strong>{" "}
          é, em regra, controladora dos dados dos seus clientes finais
          (nome, telefone, agendamentos, avaliações, clube), tratados na
          plataforma sob instrução do salão. A Barbernegon atua como operadora
          nesses casos.
        </li>
      </ul>

      <h2>2. Dados que coletamos</h2>
      <h3>2.1 Conta e equipe</h3>
      <ul>
        <li>Nome, e-mail, telefone, senha (armazenada com hash).</li>
        <li>Dados da barbearia: nome, slug, marca, conteúdos do site.</li>
        <li>Informações de plano, trial e cobrança SaaS (via Asaas).</li>
      </ul>
      <h3>2.2 Clientes finais (pelo salão / site / reserva)</h3>
      <ul>
        <li>Nome, telefone, e-mail (quando informado).</li>
        <li>Histórico de agendamentos, pagamentos PIX do salão, clube.</li>
        <li>Avaliações e comentários, quando enviados.</li>
      </ul>
      <h3>2.3 Técnicos</h3>
      <ul>
        <li>IP, logs de acesso, cookies/sessão necessários ao login.</li>
        <li>
          Analytics opcional (ex.: PostHog), se configurado — eventos de
          produto sem necessidade de dados sensíveis.
        </li>
        <li>
          Integrações: WhatsApp (Meta), Asaas, Cloudinary, e-mail (Resend),
          hospedagem (ex.: Railway), conforme habilitadas.
        </li>
      </ul>

      <h2>3. Finalidades e bases legais</h2>
      <ul>
        <li>
          <strong className="text-[var(--bn-on)]">Execução de contrato</strong> —
          prestar o SaaS, agenda, painel e cobrança do plano.
        </li>
        <li>
          <strong className="text-[var(--bn-on)]">Legítimo interesse</strong> —
          segurança, prevenção a fraude, melhoria do produto (com
          salvaguardas).
        </li>
        <li>
          <strong className="text-[var(--bn-on)]">Consentimento</strong> —
          quando exigido (ex.: marketing direto, cookies não essenciais).
        </li>
        <li>
          <strong className="text-[var(--bn-on)]">Obrigação legal</strong> —
          retenção mínima exigida por lei.
        </li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos com operadores necessários
        à operação (nuvem, e-mail, pagamentos, WhatsApp, mídia), sob contratos
        e finalidades limitadas. Autoridades podem receber dados mediante
        ordem legal.
      </p>

      <h2>5. Internacional</h2>
      <p>
        Alguns provedores podem processar dados fora do Brasil. Nesses casos,
        buscamos mecanismos adequados previstos na LGPD.
      </p>

      <h2>6. Retenção e segurança</h2>
      <p>
        Mantemos dados pelo tempo necessário às finalidades e a obrigações
        legais. Aplicamos medidas técnicas e organizacionais razoáveis
        (HTTPS, hash de senha, controle de acesso por papel, rate limit em
        rotas sensíveis). Nenhum sistema é 100% isento de risco.
      </p>

      <h2>7. Seus direitos (LGPD)</h2>
      <p>
        Titulares podem solicitar confirmação de tratamento, acesso, correção,
        anonimização, portabilidade, eliminação (quando cabível), informação
        sobre compartilhamentos e revogação de consentimento. Para dados de
        clientes finais tratados pelo salão, o pedido pode ser direcionado
        primeiro à barbearia; a Barbernegon auxilia como operadora.
      </p>

      <h2>8. Crianças e adolescentes</h2>
      <p>
        O serviço B2B não é destinado a menores. Contas devem ser criadas por
        maiores capazes.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Esta Política pode ser atualizada. A data no topo indica a versão
        vigente.
      </p>

      <h2>10. Contato do encarregado / privacidade</h2>
      <p>
        Para exercer direitos ou tirar dúvidas sobre privacidade, use o
        suporte do painel ou o e-mail de suporte da plataforma. Indique no
        assunto “LGPD / Privacidade”.
      </p>
    </LegalDoc>
  );
}
