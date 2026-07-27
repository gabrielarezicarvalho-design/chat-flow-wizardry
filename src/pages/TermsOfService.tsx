import { useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Layers,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Copyright,
  AlertTriangle,
  Activity,
  LogOut,
  RefreshCw,
  Scale,
} from "lucide-react";
import LegalPageLayout, { LegalSection } from "@/components/layout/LegalPageLayout";

const companyName = "CRM NEXT PRO";

const sections: LegalSection[] = [
  {
    icon: CheckCircle2,
    title: "Aceitação dos Termos",
    body: `Ao acessar e utilizar a plataforma ${companyName}, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, você não deverá utilizar nossos serviços.`,
  },
  {
    icon: Layers,
    title: "Descrição do Serviço",
    body: `O ${companyName} é uma plataforma de automação inteligente para comunicação e atendimento, oferecendo:`,
    bullets: [
      "Gerenciamento de conversas e atendimento via WhatsApp.",
      "Automação de fluxos de comunicação.",
      "Envio de mensagens em massa e campanhas.",
      "Gestão de contatos, leads e departamentos.",
      "Integração com agentes de IA e prospecção.",
      "Relatórios e análises de desempenho.",
    ],
  },
  {
    icon: UserPlus,
    title: "Cadastro e Conta",
    body: `Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta.`,
  },
  {
    icon: ShieldCheck,
    title: "Uso Aceitável",
    body: "Ao utilizar nossos serviços, você se compromete a:",
    bullets: [
      "Não enviar spam ou mensagens não solicitadas.",
      "Respeitar as políticas do WhatsApp Business API e da Meta.",
      "Não utilizar o serviço para atividades ilegais ou fraudulentas.",
      "Não compartilhar suas credenciais de acesso com terceiros.",
      "Manter dados de contatos atualizados e com consentimento adequado.",
    ],
  },
  {
    icon: CreditCard,
    title: "Planos e Pagamento",
    body: `Os serviços são oferecidos em diferentes planos com funcionalidades e limites variados. Os valores e condições de pagamento estão disponíveis na plataforma. O não pagamento poderá resultar na suspensão ou cancelamento do serviço.`,
  },
  {
    icon: Copyright,
    title: "Propriedade Intelectual",
    body: `Todo o conteúdo, design, código e funcionalidades da plataforma são de propriedade exclusiva do ${companyName}. É proibida a reprodução, distribuição ou modificação sem autorização prévia por escrito.`,
  },
  {
    icon: AlertTriangle,
    title: "Limitação de Responsabilidade",
    body: `O ${companyName} não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso dos serviços. Nossa responsabilidade está limitada ao valor pago pelo usuário nos últimos 12 meses.`,
  },
  {
    icon: Activity,
    title: "Disponibilidade do Serviço",
    body: `Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência.`,
  },
  {
    icon: LogOut,
    title: "Rescisão",
    body: `Qualquer parte pode encerrar o uso do serviço a qualquer momento. O ${companyName} reserva-se o direito de suspender ou encerrar contas que violem estes termos.`,
  },
  {
    icon: RefreshCw,
    title: "Alterações nos Termos",
    body: `Podemos modificar estes Termos de Uso a qualquer momento. Alterações significativas serão notificadas com pelo menos 30 dias de antecedência. O uso continuado após as alterações constitui aceitação dos novos termos.`,
  },
  {
    icon: Scale,
    title: "Legislação Aplicável",
    body: `Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca da sede do ${companyName}.`,
  },
];

const TermsOfService = () => {
  useEffect(() => {
    document.title = `Termos de Uso - ${companyName}`;
  }, []);

  return (
    <LegalPageLayout
      badgeIcon={FileText}
      badgeLabel="Termos"
      title="Termos de Uso"
      subtitle={`Regras e condições para utilizar a plataforma ${companyName}.`}
      sections={sections}
    />
  );
};

export default TermsOfService;
