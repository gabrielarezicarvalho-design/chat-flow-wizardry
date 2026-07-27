import { useEffect } from "react";
import {
  Shield,
  Database,
  SlidersHorizontal,
  Lock,
  Share2,
  Cookie as CookieIcon,
  Users,
  RefreshCw,
  FileClock,
} from "lucide-react";
import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

const companyName = "CRM NEXT PRO";

const sections: LegalSection[] = [
  {
    icon: Database,
    title: "Coleta de Dados",
    body: `Coletamos apenas as informações necessárias para a prestação dos nossos serviços, incluindo: nome, endereço de e-mail, número de WhatsApp e dados de identificação. Essas informações são fornecidas voluntariamente pelo usuário no momento do cadastro ou compra.`,
  },
  {
    icon: SlidersHorizontal,
    title: "Uso dos Dados",
    body: "Os dados coletados são utilizados exclusivamente para:",
    bullets: [
      "Processar e entregar os planos e serviços adquiridos.",
      "Comunicação sobre pedidos, cobranças e suporte ao cliente.",
      "Envio de atualizações e novidades sobre nossos serviços.",
      "Cumprimento de obrigações legais e regulatórias (LGPD).",
    ],
  },
  {
    icon: Lock,
    title: "Proteção dos Dados",
    body: `Adotamos medidas de segurança técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição, incluindo criptografia em trânsito e em repouso.`,
  },
  {
    icon: Share2,
    title: "Compartilhamento de Dados",
    body: `Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, exceto quando necessário para processar pagamentos (Mercado Pago), operar integrações autorizadas por você (WhatsApp Business API, Meta) ou quando exigido por lei.`,
  },
  {
    icon: CookieIcon,
    title: "Cookies",
    body: `Utilizamos cookies essenciais para o funcionamento da plataforma, como manutenção da sessão de login e preferências. Não utilizamos cookies de rastreamento de terceiros sem o seu consentimento.`,
  },
  {
    icon: Users,
    title: "Direitos do Usuário",
    body: `Você tem o direito de solicitar acesso, correção, portabilidade ou exclusão dos seus dados pessoais a qualquer momento, entrando em contato com nosso suporte. Também pode revogar o consentimento quando desejar.`,
  },
  {
    icon: FileClock,
    title: "Retenção de Dados",
    body: `Seus dados serão mantidos enquanto sua conta estiver ativa ou conforme necessário para cumprir obrigações legais. Após o encerramento, os dados são excluídos em até 30 dias, exceto quando a retenção for exigida por lei.`,
  },
  {
    icon: RefreshCw,
    title: "Alterações nesta Política",
    body: `Esta política pode ser atualizada periodicamente. Recomendamos a revisão regular desta página para estar ciente de quaisquer alterações. Mudanças significativas serão comunicadas na plataforma.`,
  },
];

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = `Política de Privacidade - ${companyName}`;
  }, []);

  return (
    <LegalPageLayout
      badgeIcon={Shield}
      badgeLabel="Privacidade"
      title="Política de Privacidade"
      subtitle={`Como coletamos, utilizamos e protegemos seus dados no ${companyName}.`}
      sections={sections}
    />
  );
};

export default PrivacyPolicy;
