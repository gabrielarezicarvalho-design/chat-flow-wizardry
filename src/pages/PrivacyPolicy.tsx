import { useEffect, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import LandingNav from "@/components/layout/LandingNav";
import LandingFooter from "@/components/layout/LandingFooter";

const COMPANY = "Next Pro";
const CNPJ = "65.146.817/0001-18";
const EMAIL = "contato@nextpro.com.br";
const UPDATED = "Julho de 2026";

const H2 = ({ children }: { children: ReactNode }) => (
  <h2
    className="mt-10 first:mt-0 text-xl md:text-2xl font-bold text-slate-900"
    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
  >
    {children}
  </h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-6 text-base font-semibold text-slate-900">{children}</h3>
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

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = `Política de Privacidade | ${COMPANY}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `Política de Privacidade da ${COMPANY}: como coletamos, usamos, armazenamos e protegemos seus dados pessoais conforme a LGPD.`,
      );
    }
  }, []);

  const subprocessors = [
    ["Next Connect (Tecnologia Própria)", "Conexão e troca de mensagens com o WhatsApp (individual e grupos)", "Mensagens, números, mídias, metadados de grupos", "Servidores próprios"],
    ["OpenAI", "Geração de respostas por IA", "Conteúdo enviado à IA", "EUA"],
    ["Google (Gemini)", "Geração de respostas e recursos de IA", "Conteúdo enviado à IA", "EUA"],
    ["Supabase", "Hospedagem, banco de dados, autenticação, Edge Functions", "Cadastro, conversas, configurações, logs de API", "EUA"],
    ["Mercado Pago", "Processamento de pagamentos", "Dados de cobrança", "Brasil"],
    ["Resend", "Envio de e-mails transacionais", "Nome, e-mail", "EUA"],
    ["Google Analytics / Meta Pixel", "Métricas e marketing", "Dados de navegação", "EUA"],
  ];

  return (
    <div className="light min-h-screen bg-[#fafaf8] text-slate-900 flex flex-col">
      <LandingNav />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pt-16 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacidade · LGPD
          </div>
          <h1
            className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Política de <span className="text-primary">Privacidade</span>
          </h1>
          <p className="mt-4 text-slate-500 text-[15px]">
            Última atualização: {UPDATED} · {COMPANY} · CNPJ {CNPJ}
          </p>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-20">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 md:p-12 shadow-sm">
            <H2>1. Controlador de Dados</H2>
            <P>
              Esta Política descreve como a {COMPANY} (CNPJ {CNPJ}), na qualidade de{" "}
              <B>Controlador de Dados</B>, coleta, utiliza, armazena e protege informações pessoais em
              conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </P>
            <P>
              <B>Encarregado (DPO):</B> para questões de privacidade, contate{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                {EMAIL}
              </a>
              .
            </P>

            <H2>2. Dados Pessoais Coletados</H2>
            <H3>2.1. Fornecidos diretamente</H3>
            <UL
              items={[
                "Dados cadastrais: nome, e-mail, telefone, nome da empresa.",
                "Dados de pagamento: processados pelo Mercado Pago; não armazenamos dados de cartão.",
                "Configurações dos Agentes de IA: prompts, base de conhecimento, personalidade, avatares, regras de roteamento.",
                "Chaves de API geradas pelo Usuário (armazenadas com hash criptográfico).",
                "URLs de Webhooks configuradas pelo Usuário.",
              ]}
            />
            <H3>2.2. Coletados automaticamente</H3>
            <UL
              items={[
                "Dados de uso: páginas acessadas, funcionalidades, tempo de sessão.",
                "Dados técnicos: endereço IP, navegador, sistema operacional.",
                "Logs de API: endpoint acessado, método HTTP, código de resposta, tempo de resposta, IP de origem.",
              ]}
            />

            <H2>3. Bases Legais</H2>
            <UL
              items={[
                <>
                  <B>Execução de contrato:</B> operar a plataforma, processar assinaturas e entregar os serviços contratados.
                </>,
                <>
                  <B>Cumprimento de obrigação legal:</B> guarda de registros, obrigações fiscais e regulatórias.
                </>,
                <>
                  <B>Legítimo interesse:</B> segurança, prevenção a fraudes, melhoria de produto e suporte.
                </>,
                <>
                  <B>Consentimento:</B> comunicações de marketing e cookies não essenciais.
                </>,
              ]}
            />

            <H2>4. Uso de Inteligência Artificial</H2>
            <P>
              Para gerar respostas automáticas — tanto em conversas individuais quanto em Grupos WhatsApp
              —, o conteúdo das mensagens é transmitido a{" "}
              <B>Provedores de IA de terceiros — OpenAI e Google (Gemini)</B>, cujos servidores estão
              localizados no exterior (principalmente nos EUA). Sobre este tratamento:
            </P>
            <UL
              items={[
                <>
                  O envio do conteúdo a esses provedores é <B>necessário para o funcionamento</B> da IA e
                  constitui transferência internacional de dados (veja Seção 11).
                </>,
                "Os provedores tratam os dados conforme suas próprias políticas; não temos controle sobre seus sistemas.",
                <>
                  <B>Decisões automatizadas:</B> o sistema pode classificar leads, agendar e rotear conversas;
                  o titular pode solicitar revisão humana (Art. 20 LGPD).
                </>,
                <>
                  <B>Treinamento:</B> dados podem ser usados de forma anonimizada para melhoria dos modelos; é
                  possível solicitar opt-out.
                </>,
                "Recomendamos não inserir dados sensíveis desnecessários em prompts e mensagens.",
              ]}
            />

            <H2>5. Conexão com o WhatsApp</H2>
            <P>
              A integração com o WhatsApp é feita por meio da{" "}
              <B>API própria da {COMPANY}, baseada no WhatsApp Web</B>. As mensagens, números e mídias
              trafegam por essa camada para viabilizar o envio e o recebimento. O Usuário é o Controlador
              dos dados de seus Clientes Finais e responsável por informá-los sobre esse tratamento.
              Detalhes de responsabilidade constam nos Termos de Uso.
            </P>

            <H2>6. Dados de Terceiros (Clientes Finais e Participantes de Grupos)</H2>
            <UL
              items={[
                <>
                  <B>Usuário como Controlador:</B> o Usuário é o Controlador dos dados pessoais de seus
                  Clientes Finais e dos participantes de grupos que interagem com o bot, devendo obter
                  consentimento adequado.
                </>,
                <>
                  <B>{COMPANY} como Operador:</B> processa os dados conforme instruções do Usuário.
                </>,
                <>
                  <B>Transparência:</B> o Usuário deve informar seus Clientes Finais e, quando aplicável, os
                  participantes de seus grupos sobre o uso de IA e o tratamento de dados.
                </>,
                <>
                  <B>Isenção:</B> a {COMPANY} <B>não se responsabiliza</B> pela coleta, uso ou tratamento de
                  dados pessoais realizado pelo Usuário por meio da Plataforma, incluindo dados obtidos via
                  Disparos em Massa, Grupos, API Pública e Webhooks.
                </>,
                <>
                  Dados de contatos utilizados em <B>Disparos em Massa</B> — o Usuário é o único responsável
                  pela licitude da base de contatos, pelo consentimento dos destinatários e pelo conteúdo
                  enviado.
                </>,
                <>
                  Dados de participantes de <B>Grupos WhatsApp</B> — o Usuário é responsável por informar os
                  participantes sobre o uso de IA e obter consentimento quando necessário.
                </>,
                <>
                  Dados transmitidos ou recebidos via <B>API Pública e Webhooks</B> — o Usuário é responsável
                  pela segurança de seus endpoints e pelo tratamento adequado dos dados recebidos.
                </>,
                <>
                  Dados de <B>Clientes Finais</B> — o Usuário, como Controlador, é responsável por informar
                  sobre o tratamento, obter consentimento e atender solicitações dos titulares.
                </>,
              ]}
            />
            <P>
              O Usuário concorda em <B>indenizar e isentar</B> a {COMPANY} de quaisquer reclamações, perdas,
              multas ou sanções decorrentes do tratamento inadequado de dados pessoais de terceiros por meio
              da Plataforma.
            </P>

            <H2>7. Dados de API Pública e Webhooks</H2>
            <UL
              items={[
                "Registramos logs de uso da API (endpoint, método, IP, timestamp, código de resposta) para fins de segurança, auditoria e suporte.",
                <>
                  As chaves API (secret) são armazenadas com hash criptográfico unidirecional e{" "}
                  <B>não podem ser recuperadas</B> após a criação.
                </>,
                <>
                  Os dados transmitidos via Webhooks são enviados para URLs configuradas pelo Usuário; a{" "}
                  {COMPANY} <B>não se responsabiliza</B> pela segurança do endpoint do Usuário.
                </>,
                "O Usuário é responsável por garantir que integrações via API cumpram a LGPD e não exponham dados pessoais indevidamente.",
              ]}
            />

            <H2>8. Finalidades do Tratamento</H2>
            <UL
              items={[
                "Fornecer, operar e manter os serviços; processar pagamentos e assinaturas.",
                "Enviar notificações transacionais; oferecer suporte.",
                "Melhorar a experiência e desenvolver novos recursos.",
                "Treinar e aprimorar modelos de IA (anonimizado); prevenir fraudes.",
                "Monitorar uso de API para segurança e rate limiting.",
                "Cumprir obrigações legais; enviar marketing (mediante consentimento).",
              ]}
            />

            <H2>9. Suboperadores e Provedores Terceiros</H2>
            <P>
              Para operar a Plataforma, compartilhamos dados, na medida do necessário, com os seguintes
              prestadores (suboperadores), sob obrigações de confidencialidade:
            </P>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[14px] text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-900">
                    <th className="py-3 pr-4 font-semibold">Provedor</th>
                    <th className="py-3 pr-4 font-semibold">Finalidade</th>
                    <th className="py-3 pr-4 font-semibold">Dados</th>
                    <th className="py-3 font-semibold">Local</th>
                  </tr>
                </thead>
                <tbody>
                  {subprocessors.map((row) => (
                    <tr key={row[0]} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="py-3 pr-4">{row[0]}</td>
                      <td className="py-3 pr-4">{row[1]}</td>
                      <td className="py-3 pr-4">{row[2]}</td>
                      <td className="py-3">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              <B>Não vendemos dados pessoais.</B> Esta lista pode ser atualizada conforme a evolução da
              Plataforma.
            </P>

            <H2>10. Compartilhamento de Dados</H2>
            <P>
              Compartilhamos dados apenas: com os suboperadores acima; para cumprir obrigações legais, ordem
              judicial ou autoridade competente; para proteger direitos, propriedade ou segurança da{" "}
              {COMPANY}, usuários ou terceiros; e com endpoints de Webhook configurados pelo Usuário (sob
              responsabilidade do Usuário).
            </P>

            <H2>11. Transferência Internacional de Dados</H2>
            <P>
              Parte dos suboperadores (OpenAI, Google, Supabase, Resend, ferramentas de métrica) está fora do
              Brasil. Nesses casos, a transferência ocorre para países com nível adequado de proteção ou
              mediante garantias apropriadas (como cláusulas contratuais padrão), conforme os Arts. 33 a 36
              da LGPD. O uso da IA implica, necessariamente, transferência internacional do conteúdo das
              mensagens, tanto de conversas individuais quanto de interações em Grupos.
            </P>

            <H2>12. Períodos de Retenção</H2>
            <UL
              items={[
                <>
                  <B>Cadastrais:</B> durante a conta e por 5 anos após (obrigações fiscais).
                </>,
                <>
                  <B>Conversas individuais:</B> 12 meses após o encerramento da conta.
                </>,
                <>
                  <B>Mensagens de Grupos:</B> não armazenadas (processadas em tempo real apenas).
                </>,
                <>
                  <B>Leads e contatos:</B> durante a conta, exportáveis em até 30 dias após o cancelamento.
                </>,
                <>
                  <B>Logs de acesso e API:</B> 6 meses (Marco Civil da Internet).
                </>,
                <>
                  <B>Dados de pagamento:</B> 5 anos (legislação fiscal).
                </>,
              ]}
            />

            <H2>13. Segurança da Informação</H2>
            <UL
              items={[
                "Criptografia em trânsito (TLS 1.2+) e em repouso.",
                "Controle de acesso por função, autenticação e isolamento por empresa (RLS).",
                "Monitoramento, registro de auditoria e backups periódicos.",
                "Chaves de API armazenadas com hash unidirecional.",
              ]}
            />
            <P>
              Nenhum sistema é totalmente imune a incidentes. Em caso de incidente relevante, comunicaremos
              os titulares e a ANPD conforme o Art. 48 da LGPD.
            </P>

            <H2>14. Direitos do Titular</H2>
            <P>
              Nos termos do Art. 18 da LGPD, você pode solicitar: confirmação e acesso aos dados; correção de
              dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação; portabilidade;
              informação sobre compartilhamentos; e revogação do consentimento. As solicitações são atendidas
              em até 15 dias, pelo e-mail{" "}
              <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                {EMAIL}
              </a>
              .
            </P>

            <H2>15. Cookies e Tecnologias Semelhantes</H2>
            <P>
              Utilizamos cookies essenciais (sessão, segurança e preferências) e, mediante consentimento,
              cookies analíticos e de marketing. Você pode gerenciar as preferências no seu navegador ou na
              nossa Política de Cookies.
            </P>

            <H2>16. Dados de Crianças e Adolescentes</H2>
            <P>
              A Plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de menores.
              Caso identifiquemos esse tipo de coleta, os dados serão excluídos.
            </P>

            <H2>17. Alterações nesta Política</H2>
            <P>
              Podemos atualizar esta Política periodicamente. Alterações significativas serão comunicadas com
              antecedência mínima de 30 dias. O uso continuado constitui aceitação.
            </P>

            <H2>18. Contato e Reclamações</H2>
            <UL
              items={[
                <>
                  <B>Empresa:</B> {COMPANY} · <B>CNPJ:</B> {CNPJ}
                </>,
                <>
                  <B>E-mail / DPO:</B>{" "}
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                    {EMAIL}
                  </a>
                </>,
              ]}
            />
            <P>
              Caso não esteja satisfeito, você pode reclamar à Autoridade Nacional de Proteção de Dados
              (ANPD).
            </P>
          </article>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default PrivacyPolicy;
