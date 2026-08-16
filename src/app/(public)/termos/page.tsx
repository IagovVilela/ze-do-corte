import Link from "next/link";

import { LegalDoc } from "@/components/legal-doc";

export const metadata = {
  title: "Termos de Uso | Barbernegon",
  description:
    "Condições de uso da plataforma Barbernegon para barbearias e profissionais.",
};

export default function TermosPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Termos de Uso"
      updatedAt="15 de agosto de 2026"
    >
      <p>
        Estes Termos de Uso (“Termos”) regem o acesso e a utilização da
        plataforma <strong className="text-[var(--bn-on)]">Barbernegon</strong>{" "}
        (site, painel administrativo, APIs e serviços relacionados), oferecida
        para barbearias e profissionais de beleza masculina no Brasil.
      </p>
      <p>
        Ao criar uma conta, assinar um plano ou usar qualquer funcionalidade, você
        declara que leu e concorda com estes Termos, com a{" "}
        <Link href="/privacidade">Política de Privacidade</Link> e com os
        informativos reunidos em{" "}
        <Link href="/condicoes">/condicoes</Link> (PDFs de pagamentos Asaas e
        WhatsApp Plus+).
      </p>

      <h2>1. Quem somos e o que oferecemos</h2>
      <p>
        A Barbernegon disponibiliza software como serviço (SaaS) para que cada
        barbearia tenha presença digital (site white-label), agendamento online,
        painel de operação, recursos financeiros e, conforme o plano, clube de
        assinaturas e demais módulos descritos em{" "}
        <Link href="/planos">/planos</Link>.
      </p>
      <p>
        A plataforma é intermediária tecnológica. O relacionamento comercial e
        de atendimento entre a barbearia e o cliente final (corte, preço, horário,
        qualidade do serviço) é de responsabilidade exclusiva da barbearia.
      </p>

      <h2>2. Conta e elegibilidade</h2>
      <ul>
        <li>
          Você deve fornecer dados verdadeiros no cadastro (nome da barbearia,
          e-mail, responsável).
        </li>
        <li>
          É responsável por manter a confidencialidade da senha e por todas as
          ações realizadas na conta.
        </li>
        <li>
          Contas de funcionários (equipe) ficam sob responsabilidade do
          proprietário/administrador da organização.
        </li>
      </ul>

      <h2>3. Planos, trial e cobrança</h2>
      <ul>
        <li>
          Existem planos <strong className="text-[var(--bn-on)]">Free</strong>,{" "}
          <strong className="text-[var(--bn-on)]">Pro</strong> e{" "}
          <strong className="text-[var(--bn-on)]">Plus+</strong>, além de período
          de trial com recursos Pro, conforme a página de planos e o painel.
          Detalhes de PIX/clube e do WhatsApp oficial estão nos PDFs em{" "}
          <Link href="/condicoes">Condições</Link>.
        </li>
        <li>
          Limites do Free (ex.: número de barbeiros e unidades) e benefícios do
          Pro podem mudar com aviso prévio razoável.
        </li>
        <li>
          A mensalidade da plataforma (quando aplicável) é cobrada pela
          Barbernegon. Valores recebidos de clientes finais (PIX de agenda,
          clube do salão) transitam pela conta Asaas{" "}
          <em>da própria barbearia</em>, quando configurada — a Barbernegon não
          retém percentual desses valores como split de marketplace.
        </li>
        <li>
          Impostos, NF e obrigações fiscais do salão perante seus clientes são
          de responsabilidade do salão.
        </li>
      </ul>

      <h2>4. Uso aceitável</h2>
      <p>É vedado, entre outros:</p>
      <ul>
        <li>Usar a plataforma para fins ilícitos ou fraudulentos.</li>
        <li>
          Tentar acessar dados de outras organizações, explorar falhas de
          segurança ou sobrecarregar o serviço de forma abusiva.
        </li>
        <li>
          Publicar conteúdo ofensivo, discriminatório ou que viole direitos de
          terceiros no site da barbearia hospedado na plataforma.
        </li>
        <li>
          Revender o acesso à plataforma sem autorização escrita.
        </li>
      </ul>

      <h2>5. Conteúdo e marca da barbearia</h2>
      <p>
        Você mantém os direitos sobre logo, textos, imagens e demais conteúdos
        enviados. Concede à Barbernegon licença limitada para hospedar,
        exibir e processar esse conteúdo apenas para operar o serviço (incluindo
        CDN/armazenamento de mídia quando configurado).
      </p>

      <h2>6. Clientes finais e marketplace</h2>
      <p>
        Funcionalidades como Explorar, avaliações e link de reserva (“minha
        reserva”) existem para facilitar o contato entre público e barbearias.
        A Barbernegon não garante volume de clientes, conversão ou
        disponibilidade contínua de integrações de terceiros (Meta WhatsApp,
        Asaas, Cloudinary, etc.).
      </p>

      <h2>7. Disponibilidade e suporte</h2>
      <p>
        Envidamos esforços para manter o serviço disponível, mas não garantimos
        uptime ininterrupto. Manutenções, falhas de provedores de nuvem ou
        indisponibilidade de APIs externas podem ocorrer. O suporte segue os
        canais indicados no painel (central de ajuda / contato).
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei brasileira, a Barbernegon não se
        responsabiliza por lucros cessantes, perda de dados por culpa do
        usuário, disputas entre barbearia e cliente final, ou danos indiretos
        decorrentes do uso da plataforma. A responsabilidade total, quando
        cabível, limita-se ao valor pago à Barbernegon nos últimos 12 meses pelo
        plano Pro (ou zero no Free).
      </p>

      <h2>9. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos, com ou
        sem aviso prévio em caso de risco grave. Você pode cancelar o plano Pro
        conforme as opções do painel; dados podem ser retidos pelo prazo
        necessário a obrigações legais ou segurança.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Podemos atualizar estes Termos. A data no topo da página indica a
        versão vigente. O uso continuado após a publicação constitui
        aceitação das mudanças, salvo obrigação legal em contrário.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: utilize o canal de suporte do painel ou o
        e-mail de suporte publicado nas configurações da plataforma.
      </p>

      <h2>12. Foro</h2>
      <p>
        Fica eleito o foro da comarca do domicílio do prestador da plataforma
        no Brasil, salvo regra de proteção ao consumidor aplicável em sentido
        diverso.
      </p>
    </LegalDoc>
  );
}
