import { useEffect } from "react";
import {
  Cookie,
  HelpCircle,
  SlidersHorizontal,
  Users,
  Settings2,
  CheckCircle2,
  RefreshCw,
  Mail,
} from "lucide-react";
import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

const companyName = "CRM NEXT PRO";

const sections: LegalSection[] = [
  {
    icon: HelpCircle,
    title: "O que são Cookies",
    body: `Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você acessa um site. Eles ajudam o site a funcionar de forma mais eficiente e fornecem informações aos proprietários da plataforma.`,
  },
  {
    icon: SlidersHorizontal,
    title: "Como Utilizamos os Cookies",
    body: `O ${companyName} utiliza cookies para melhorar a experiência do usuário, personalizar conteúdo, analisar tráfego e garantir a segurança da plataforma. Os cookies se dividem em:`,
    bullets: [
      "Cookies essenciais: necessários para autenticação e segurança.",
      "Cookies de preferências: lembram escolhas como idioma e configurações.",
      "Cookies de desempenho: ajudam a entender como os visitantes usam a plataforma.",
      "Cookies de marketing: utilizados para comunicações mais relevantes.",
    ],
  },
  {
    icon: Users,
    title: "Cookies de Terceiros",
    body: `Podemos utilizar serviços de terceiros que também armazenam cookies no seu dispositivo, como provedores de análise, pagamento e integrações com redes sociais. Esses cookies estão sujeitos às políticas de privacidade dos respectivos provedores.`,
  },
  {
    icon: Settings2,
    title: "Gerenciamento de Cookies",
    body: `Você pode gerenciar ou desativar cookies através das configurações do seu navegador. A desativação de cookies essenciais pode afetar o funcionamento da plataforma.`,
  },
  {
    icon: CheckCircle2,
    title: "Consentimento",
    body: `Ao continuar navegando na plataforma ${companyName}, você concorda com o uso de cookies conforme descrito nesta política. Para cookies de marketing e desempenho solicitamos seu consentimento explícito.`,
  },
  {
    icon: RefreshCw,
    title: "Alterações nesta Política",
    body: `Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças nas práticas de uso ou em requisitos legais. Recomendamos revisar esta página regularmente.`,
  },
  {
    icon: Mail,
    title: "Contato",
    body: `Se tiver dúvidas sobre o uso de cookies em nossa plataforma, entre em contato conosco através dos canais de suporte disponíveis no site.`,
  },
];

const Cookies = () => {
  useEffect(() => {
    document.title = `Política de Cookies - ${companyName}`;
  }, []);

  return (
    <LegalPageLayout
      badgeIcon={Cookie}
      badgeLabel="Cookies"
      title="Política de Cookies"
      subtitle={`Como usamos cookies para melhorar a sua experiência no ${companyName}.`}
      sections={sections}
    />
  );
};

export default Cookies;
