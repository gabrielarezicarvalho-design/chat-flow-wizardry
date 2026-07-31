import { useEffect, ReactNode } from "react";
import { FileText, AlertTriangle } from "lucide-react";
import LandingNav from "@/components/layout/LandingNav";
import LandingFooter from "@/components/layout/LandingFooter";

const COMPANY = "Next Pro";
const CNPJ = "65.146.817/0001-18";
const EMAIL = "suporte@nextprodev.com.br";
const UPDATED = "Julho de 2026";

const H2 = ({ children }: { children: ReactNode }) => (
  <h2
    className="mt-10 first:mt-0 text-xl md:text-2xl font-bold text-slate-900"
    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
  >
    {children}
  </h2>
);

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-4 text-[15px] leading-7 text-slate-600">{children}</p>
);

const UL = ({ items }: { items: ReactNode[] }) => (
  <ul className="mt-4 space-y-2.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-600">
        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);

const B = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-slate-900">{children}</strong>
);

const TermsOfService = () => {
  useEffect(() => {
    document.title = `Termos de Uso | ${COMPANY}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `Termos de Uso da ${COMPANY}: regras de utilização da plataforma de CRM, automação de WhatsApp, IA, disparos, API pública e planos.`,
      );
    }
  }, []);

  return (
    <div className="light min-h-screen bg-[#fafaf8] text-slate-900 flex flex-col">
      <LandingNav />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pt-16 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            Legal
          </div>
          <h1
            className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Termos de <span className="text-primary">Uso</span>
          </h1>
          <p className="mt-4 text-slate-500 text-[15px]">
            Última atualização: {UPDATED} · {COMPANY} · CNPJ {CNPJ}
          </p>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-20">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-12 shadow-sm">
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-[15px] leading-7 text-slate-700">
                <B>Aviso importante:</B> a Plataforma utiliza API própria baseada no WhatsApp Web e
                provedores de IA de terceiros (OpenAI e Google Gemini). O uso de automação e disparos em
                massa deve seguir as diretrizes do WhatsApp/Meta para preservar a saúde do seu número. Leia
                as Seções 4 a 9 com atenção.
              </p>
            </div>

            <H2>1. Aceitação dos Termos</H2>
            <P>
              Ao acessar e usar a plataforma {COMPANY}, operada pela {COMPANY} (CNPJ: {CNPJ}), você concorda
              em cumprir e ficar vinculado a estes Termos de Uso. Caso não concorde com qualquer parte destes
              termos, você não está autorizado a acessar ou utilizar o serviço. O aceite é feito de forma
              eletrônica no momento do cadastro e tem plena validade jurídica.
            </P>

            <H2>2. Definições</H2>
            <UL
              items={[
                <><B>"Plataforma"</B>: o sistema {COMPANY}, incluindo website, aplicativo, APIs públicas e todas as funcionalidades.</>,
                <><B>"Usuário"</B>: pessoa física ou jurídica que utiliza a Plataforma.</>,
                <><B>"Cliente Final"</B>: pessoa que entra em contato via WhatsApp com o Usuário.</>,
                <><B>"API WhatsApp"</B>: tecnologia própria da {COMPANY}, baseada no WhatsApp Web, utilizada para conectar o número do Usuário à Plataforma.</>,
                <><B>"Provedores de IA"</B>: serviços de inteligência artificial de terceiros utilizados para gerar respostas, incluindo <B>OpenAI</B> (ChatGPT/GPT) e <B>Google Gemini</B>.</>,
                <><B>"Disparos em Massa"</B>: envio de mensagens em volume para múltiplos contatos (broadcasts/campanhas).</>,
                <><B>"Grupos WhatsApp"</B>: funcionalidade de monitoramento e interação automatizada com grupos do WhatsApp.</>,
                <><B>"API Pública"</B>: interface de programação que permite a sistemas externos integrarem-se à Plataforma via chaves de autenticação.</>,
                <><B>"Webhooks"</B>: notificações HTTP enviadas pela Plataforma a URLs configuradas pelo Usuário quando eventos ocorrem.</>,
                <><B>"Conexão WhatsApp"</B> ou <B>"Instância"</B>: vínculo entre o número do Usuário e a Plataforma via leitura de QR Code (WhatsApp Web).</>,
                <><B>"Créditos"</B>: unidades consumidas por respostas de IA e por mensagens de disparo (1 crédito = 1 resposta de IA ou 1 disparo).</>,
                <><B>"Workspace"</B>: ambiente de trabalho isolado do Usuário na Plataforma.</>,
              ]}
            />

            <H2>3. Descrição do Serviço</H2>
            <P>
              O {COMPANY} é uma plataforma de CRM e automação de atendimento via WhatsApp com inteligência
              artificial, que permite, entre outras funções: automatizar respostas com Agentes de IA,
              capturar e gerenciar leads (CRM), agendar compromissos, gerar orçamentos, emitir cobranças via
              PIX, realizar prospecção, executar Disparos em Massa, monitorar e interagir automaticamente em
              Grupos WhatsApp, e disponibilizar API Pública e Webhooks para integração com sistemas externos.
              A Plataforma é fornecida como ferramenta — a configuração, o conteúdo, o uso e todas as decisões
              de automação são de responsabilidade exclusiva do Usuário.
            </P>

            <H2>4. Inteligência Artificial e Provedores Terceiros</H2>
            <P>
              A Plataforma utiliza Provedores de IA de terceiros — <B>OpenAI</B> e <B>Google Gemini</B> — para
              processar mensagens e gerar respostas, tanto em conversas individuais quanto em Grupos
              WhatsApp. Ao utilizar os recursos de IA, o Usuário reconhece e concorda que:
            </P>
            <UL
              items={[
                "Conteúdos de conversa podem ser transmitidos aos Provedores de IA para geração de respostas.",
                "As respostas são geradas automaticamente e podem conter imprecisões, sendo o Usuário responsável por revisar, configurar e supervisionar os Agentes de IA.",
                "A qualidade das respostas depende diretamente dos prompts, base de conhecimento e configurações definidas pelo Usuário.",
                <>A {COMPANY} <B>não se responsabiliza</B> por falhas, indisponibilidades, alterações de preço ou descontinuação dos Provedores de IA.</>,
                "O Usuário deve informar seus Clientes Finais sobre o uso de inteligência artificial no atendimento.",
              ]}
            />

            <H2>5. Conexão WhatsApp (API Própria)</H2>
            <UL
              items={[
                "A conexão é feita via QR Code, com tecnologia baseada no WhatsApp Web, e não constitui a WhatsApp Business API oficial da Meta.",
                "O WhatsApp/Meta pode, a qualquer momento, alterar suas regras, limitar, bloquear ou banir números que apresentem comportamento considerado abusivo.",
                "Desconexões podem ocorrer por instabilidade, atualização do WhatsApp, uso do aparelho ou desempenho da conexão.",
                <><B>O Usuário assume a responsabilidade</B> pelo uso da integração e pelo cumprimento das diretrizes do WhatsApp/Meta.</>,
              ]}
            />

            <H2>6. Disparos em Massa e Regras Antispam</H2>
            <P>
              Os Disparos em Massa são uma funcionalidade de alto risco. O envio de mensagens não solicitadas
              é a principal causa de banimento de números pelo WhatsApp. Ao utilizar Disparos, o Usuário
              obriga-se a:
            </P>
            <UL
              items={[
                <><B>Obter consentimento prévio (opt-in)</B> dos destinatários antes de enviar qualquer mensagem, especialmente promocional.</>,
                <><B>Não enviar spam</B>, correntes, conteúdo enganoso, golpes, phishing ou mensagens a quem não autorizou o contato.</>,
                <>Disponibilizar e respeitar mecanismo de <B>descadastro (opt-out)</B>, cessando imediatamente os envios a quem solicitar.</>,
                "Respeitar horários razoáveis e boas práticas de envio, definindo intervalos adequados entre as mensagens.",
                <>Cumprir o <B>Código de Defesa do Consumidor, a LGPD, a legislação de telecomunicações</B> e os Termos do WhatsApp/Meta.</>,
                'Não utilizar listas de contatos compradas, raspadas ("scraping") ou obtidas sem base legal.',
              ]}
            />
            <P>
              A {COMPANY} <B>apenas fornece a ferramenta</B> de envio. O conteúdo, a lista de destinatários, a
              base legal, a frequência e o volume dos disparos são de{" "}
              <B>responsabilidade exclusiva do Usuário</B>. A {COMPANY} <B>não se responsabiliza</B> por
              banimentos, bloqueios, multas, reclamações, sanções administrativas ou demandas judiciais
              decorrentes de Disparos realizados pelo Usuário, e poderá <B>suspender imediatamente</B> a conta
              diante de indícios de spam ou abuso.
            </P>

            <H2>7. Grupos WhatsApp — Monitoramento e Interação por IA</H2>
            <UL
              items={[
                "A Plataforma permite ativar o monitoramento e a interação automatizada por IA em grupos, sendo o Usuário responsável pela configuração e pelas respostas geradas.",
                <>O uso de bots em grupos <B>pode violar os Termos de Serviço do WhatsApp/Meta</B> e resultar em bloqueio do número ou remoção do grupo.</>,
                <>A {COMPANY} <B>não se responsabiliza</B> por reclamações de membros do grupo, expulsão do número, denúncias, ou quaisquer consequências decorrentes do uso de IA em grupos.</>,
                <>O Usuário deve garantir que os administradores e participantes do grupo <B>estejam cientes</B> do uso de IA e automação, sendo o responsável por obter eventual consentimento necessário.</>,
                'A funcionalidade de grupos é fornecida "como está" (as is) e pode ser alterada, limitada ou descontinuada a qualquer momento.',
              ]}
            />

            <H2>8. API Pública e Webhooks</H2>
            <P>
              A Plataforma disponibiliza uma <B>API RESTful pública</B> e sistema de <B>Webhooks</B> que
              permitem ao Usuário integrar sistemas externos ao {COMPANY}. Ao utilizar a API ou Webhooks, o
              Usuário reconhece e concorda que:
            </P>
            <UL
              items={[
                <>O acesso à API é feito por meio de <B>chaves de autenticação (API Key + Secret)</B> geradas pelo Usuário, sendo ele responsável pela <B>guarda, sigilo e segurança</B> de suas credenciais.</>,
                "A API permite, entre outras operações: enviar mensagens, gerenciar leads, consultar dados, configurar webhooks e acionar funcionalidades da Plataforma programaticamente.",
                <>O Usuário é <B>integralmente responsável</B> por todas as operações realizadas via API.</>,
                <>A {COMPANY} <B>não se responsabiliza</B> por uso indevido da API, falhas em integrações de terceiros, perda de dados por operações via API ou consequências de credenciais comprometidas.</>,
                <>Os Webhooks são enviados para URLs configuradas pelo Usuário via HTTPS, com assinatura HMAC-SHA256, sujeitos a <B>retry automático</B> (3 tentativas) e <B>não é garantida</B> a entrega em caso de indisponibilidade do endpoint.</>,
                <>A {COMPANY} reserva-se o direito de <B>limitar, throttle ou suspender</B> o acesso à API em caso de abuso, uso excessivo ou risco à estabilidade da Plataforma.</>,
                "A documentação, os endpoints e o formato dos dados podem ser alterados a qualquer momento.",
              ]}
            />

            <H2>9. Tratamento de Dados de Conversas</H2>
            <UL
              items={[
                <>O Usuário é o <B>Controlador</B> dos dados pessoais de seus Clientes Finais.</>,
                <>A {COMPANY} atua como <B>Operador</B>, processando os dados conforme as instruções do Usuário e conforme a Política de Privacidade.</>,
                "O Usuário é responsável por informar seus Clientes Finais sobre o uso de IA e por obter consentimento adequado para o tratamento de dados.",
                "Para gerar respostas, conteúdos de conversa podem ser transmitidos aos Provedores de IA (Seção 4).",
                "Em Grupos WhatsApp, mensagens são processadas em memória para detecção de triggers; dados pessoais de participantes só são armazenados quando há interação direta com o bot.",
              ]}
            />

            <H2>10. Uso Adequado e Condutas Proibidas</H2>
            <P>É expressamente proibido utilizar a Plataforma para:</P>
            <UL
              items={[
                "Enviar spam, mensagens não solicitadas, praticar phishing ou aplicar golpes.",
                "Violar qualquer lei, os Termos do WhatsApp/Meta ou de outros serviços integrados.",
                "Transmitir conteúdo ofensivo, discriminatório, fraudulento, ilegal ou que viole direitos de terceiros.",
                "Acessar contas/dados de outros Usuários, realizar engenharia reversa ou burlar mecanismos de segurança.",
                "Sobrecarregar intencionalmente os servidores ou utilizar scripts/bots não autorizados.",
                "Comercializar, sublicenciar ou revender o serviço sem autorização expressa.",
                "Utilizar a API Pública para fins que violem estes Termos ou para acessar dados de terceiros sem autorização.",
                "Utilizar a funcionalidade de Grupos para assédio, spam em grupos alheios ou coleta não autorizada de dados de participantes.",
              ]}
            />

            <H2>11. Contas de Usuário</H2>
            <UL
              items={[
                "Você é responsável por manter a confidencialidade de suas credenciais (login, senha e chaves API) e por todas as atividades em sua conta.",
                "Deve fornecer informações verdadeiras, precisas e atualizadas.",
                "Deve notificar imediatamente qualquer uso não autorizado.",
                "A Plataforma pode suspender ou encerrar contas que violem estes Termos.",
              ]}
            />

            <H2>12. Planos, Pagamentos e Assinaturas</H2>
            <P>A Plataforma opera com planos de assinatura, conforme as necessidades do Usuário:</P>
            <UL
              items={[
                <><B>Plano Basic (teste gratuito):</B> acesso por <B>2 dias</B>, limitado a <B>20 disparos</B>, sem necessidade de cartão de crédito. Encerrado o período, o acesso às funcionalidades é bloqueado até a contratação de um plano pago.</>,
                <><B>Plano Start:</B> CRM completo, IA nativa com transcrição de áudio, automações e disparos em massa, conforme os limites indicados na página de planos.</>,
                <><B>Plano Business:</B> todos os recursos do Start com limites ampliados de instâncias, usuários, créditos de IA e disparos.</>,
                <><B>Créditos avulsos:</B> pacotes extras podem ser adquiridos a qualquer momento e <B>não expiram</B>. 1 crédito = 1 resposta de IA ou 1 disparo.</>,
                "As assinaturas são renovadas automaticamente ao final de cada período contratado (mensal ou anual).",
                "Os preços podem ser reajustados mediante aviso prévio de 30 dias.",
                <>Pagamentos são processados via PIX, boleto ou cartão pelo provedor <B>Mercado Pago</B>; não armazenamos dados de cartão.</>,
                "A inadimplência pode resultar em suspensão do serviço.",
                <>Quando os créditos de IA acabam, a IA e os disparos são <B>desligados automaticamente</B>. O sistema passa para modo manual até que novos créditos sejam adquiridos.</>,
              ]}
            />

            <H2>13. Cancelamento e Reembolso</H2>
            <UL
              items={[
                "O cancelamento pode ser solicitado a qualquer momento pelo painel ou pelo suporte.",
                "O cancelamento se efetiva ao final do período já pago, sem reembolso proporcional.",
                "Após o cancelamento, o Usuário tem 30 dias para exportar seus dados; após 90 dias, os dados são excluídos.",
                "Créditos avulsos adquiridos não são reembolsáveis.",
                <>Reembolsos podem ser avaliados em casos excepcionais, a critério da {COMPANY}.</>,
              ]}
            />

            <H2>14. Disponibilidade e SLA</H2>
            <UL
              items={[
                <>Empenhamo-nos por alta disponibilidade, mas <B>não garantimos</B> funcionamento ininterrupto ou livre de erros.</>,
                "Manutenções programadas serão comunicadas quando possível; interrupções emergenciais podem ocorrer sem aviso.",
                <>A {COMPANY} <B>não se responsabiliza</B> por indisponibilidades causadas por terceiros (WhatsApp/Meta, Provedores de IA, provedores de hospedagem, internet, energia, etc.).</>,
                "A disponibilidade da API Pública e Webhooks está sujeita às mesmas condições, sem garantia de uptime específico.",
              ]}
            />

            <H2>15. Exportação de Dados</H2>
            <UL
              items={[
                "Leads e contatos podem ser exportados em formato CSV.",
                "Histórico de conversas pode ser solicitado mediante requisição.",
                "A exportação completa pode levar até 5 dias úteis.",
              ]}
            />

            <H2>16. Propriedade Intelectual</H2>
            <P>
              O serviço, seu código, design, marcas, API e funcionalidades são de propriedade exclusiva da{" "}
              {COMPANY}, protegidos por lei. O Usuário recebe apenas uma licença de uso limitada, não
              exclusiva e revogável durante a vigência da assinatura, não adquirindo qualquer direito sobre a
              Plataforma.
            </P>

            <H2>17. Isenção de Garantias</H2>
            <P>
              A Plataforma é fornecida "como está" (as is) e "conforme disponível", sem garantias de qualquer
              natureza, expressas ou implícitas, incluindo, sem limitação, garantias de comerciabilidade,
              adequação a uma finalidade específica, resultados comerciais, continuidade da integração com o
              WhatsApp, ausência de banimentos, exatidão das respostas de IA, funcionamento de integrações via
              API ou comportamento da IA em Grupos. <B>O Usuário utiliza a Plataforma por sua conta e risco.</B>
            </P>

            <H2>18. Limitação de Responsabilidade</H2>
            <P>
              Na máxima extensão permitida pela lei, a {COMPANY}, seus sócios, administradores, funcionários e
              parceiros <B>não serão responsáveis</B> por quaisquer danos diretos, indiretos, incidentais,
              especiais, consequenciais, punitivos ou lucros cessantes, incluindo, sem limitação:
            </P>
            <UL
              items={[
                <><B>Bloqueio, banimento, suspensão ou perda do número de WhatsApp</B> do Usuário, por qualquer motivo.</>,
                <>Consequências de <B>Disparos em Massa</B> realizados pelo Usuário, incluindo reclamações, multas e sanções, independentemente do volume de envios.</>,
                <>Consequências do <B>uso de IA em Grupos WhatsApp</B>, incluindo reclamações de participantes, remoção de grupos, denúncias ou bloqueios.</>,
                <>Falhas, perdas de dados ou consequências decorrentes do <B>uso da API Pública</B> ou de integrações via Webhooks.</>,
                <><B>Qualquer violação de lei</B> cometida pelo Usuário (LGPD, CDC, telecom, propriedade intelectual, etc.).</>,
                <>Falhas, indisponibilidades, alterações ou descontinuação dos <B>Provedores de IA</B> (OpenAI, Gemini), do <B>WhatsApp/Meta</B> ou de quaisquer terceiros.</>,
                "Respostas inadequadas, imprecisas ou geradas por IA com base em configurações do Usuário.",
                "Perda de dados, conversas, contatos ou oportunidades de negócio.",
                "Decisões tomadas pelo Usuário com base em informações da Plataforma.",
                "Comprometimento de chaves API por falha de segurança do Usuário.",
              ]}
            />
            <P>
              Caso, apesar do acima, alguma responsabilidade venha a ser reconhecida, ela estará{" "}
              <B>limitada ao valor efetivamente pago pelo Usuário à {COMPANY} nos 3 (três) meses anteriores</B>{" "}
              ao evento que deu origem à reclamação.
            </P>

            <H2>19. Indenização</H2>
            <P>
              O Usuário concorda em <B>defender, indenizar e isentar</B> a {COMPANY} e seus representantes de
              quaisquer reclamações, perdas, danos, multas, custos e despesas (incluindo honorários
              advocatícios) decorrentes de: (i) uso indevido da Plataforma; (ii) Disparos em Massa ou conteúdo
              enviado pelo Usuário; (iii) uso de IA em Grupos WhatsApp; (iv) operações realizadas via API
              Pública; (v) violação destes Termos, dos Termos do WhatsApp/Meta ou de qualquer lei; (vi)
              violação de direitos de terceiros, incluindo de seus Clientes Finais e participantes de grupos.
            </P>

            <H2>20. Suspensão e Encerramento</H2>
            <P>
              A {COMPANY} pode, a seu critério e sem aviso prévio, suspender ou encerrar o acesso do Usuário
              em caso de violação destes Termos, indícios de spam/abuso (inclusive via API ou em Grupos),
              risco à Plataforma ou a terceiros, ou determinação legal. O encerramento não afasta as
              obrigações já assumidas pelo Usuário.
            </P>

            <H2>21. Alterações nos Termos</H2>
            <P>
              Podemos modificar estes Termos a qualquer momento. Alterações materiais serão comunicadas com
              antecedência mínima de 30 dias. O uso continuado após a vigência das alterações constitui
              aceitação dos novos Termos.
            </P>

            <H2>22. Lei Aplicável e Foro</H2>
            <P>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
              comarca de São Paulo/SP para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por
              mais privilegiado que seja.
            </P>

            <H2>23. Contato</H2>
            <P>Dúvidas sobre estes Termos:</P>
            <UL
              items={[
                <><B>Empresa:</B> {COMPANY}</>,
                <><B>CNPJ:</B> {CNPJ}</>,
                <>
                  <B>E-mail:</B>{" "}
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                    {EMAIL}
                  </a>
                </>,
              ]}
            />
          </article>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default TermsOfService;
