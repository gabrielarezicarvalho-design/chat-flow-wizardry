import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  const [companyName, setCompanyName] = useState("CRM NEXT PRO");

  useEffect(() => {
    document.title = `Política de Privacidade - ${companyName}`;
  }, [companyName]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Informações Gerais</h2>
          <p className="text-muted-foreground leading-relaxed">
            Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais ao utilizar nossos serviços. Estamos comprometidos em proteger a privacidade dos nossos usuários e em cumprir com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Dados Coletados</h2>
          <p className="text-muted-foreground leading-relaxed">Coletamos os seguintes tipos de dados:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li><strong>Dados de identificação:</strong> nome, e-mail, telefone e informações de perfil.</li>
            <li><strong>Dados de uso:</strong> registros de acesso, interações com o sistema e preferências.</li>
            <li><strong>Dados de comunicação:</strong> mensagens enviadas e recebidas através da plataforma, incluindo integrações com WhatsApp.</li>
            <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e informações de dispositivo.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Finalidade do Tratamento</h2>
          <p className="text-muted-foreground leading-relaxed">Seus dados são utilizados para:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Fornecer e melhorar nossos serviços de automação e atendimento.</li>
            <li>Gerenciar sua conta e autenticação.</li>
            <li>Enviar comunicações relevantes sobre o serviço.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
            <li>Análise e melhoria contínua da plataforma.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Compartilhamento de Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Não vendemos seus dados pessoais. Podemos compartilhá-los apenas com:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Provedores de serviços essenciais (hospedagem, processamento de dados).</li>
            <li>Integrações autorizadas por você (WhatsApp Business API, Meta).</li>
            <li>Autoridades competentes quando exigido por lei.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Segurança dos Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo criptografia, controle de acesso e monitoramento contínuo de segurança.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Seus Direitos</h2>
          <p className="text-muted-foreground leading-relaxed">De acordo com a LGPD, você tem direito a:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Acessar seus dados pessoais.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusão de seus dados.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
            <li>Solicitar a portabilidade dos dados.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7. Retenção de Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Seus dados serão mantidos enquanto sua conta estiver ativa ou conforme necessário para cumprir obrigações legais. Após o encerramento da conta, os dados serão excluídos dentro de 30 dias, exceto quando a retenção for exigida por lei.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">8. Alterações nesta Política</h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.
          </p>
        </section>

        <footer className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
