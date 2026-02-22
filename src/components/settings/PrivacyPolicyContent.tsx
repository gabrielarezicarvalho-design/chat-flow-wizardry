import { Shield } from "lucide-react";

const PrivacyPolicyContent = () => (
  <div className="space-y-6 text-sm">
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">1. Informações Gerais</h3>
      <p className="text-muted-foreground leading-relaxed">
        Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais ao utilizar nossos serviços. Estamos comprometidos em proteger a privacidade dos nossos usuários e em cumprir com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">2. Dados Coletados</h3>
      <p className="text-muted-foreground">Coletamos os seguintes tipos de dados:</p>
      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
        <li><strong>Dados de identificação:</strong> nome, e-mail, telefone e informações de perfil.</li>
        <li><strong>Dados de uso:</strong> registros de acesso, interações com o sistema e preferências.</li>
        <li><strong>Dados de comunicação:</strong> mensagens enviadas e recebidas através da plataforma.</li>
        <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional.</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">3. Finalidade do Tratamento</h3>
      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
        <li>Fornecer e melhorar nossos serviços de automação e atendimento.</li>
        <li>Gerenciar sua conta e autenticação.</li>
        <li>Enviar comunicações relevantes sobre o serviço.</li>
        <li>Cumprir obrigações legais e regulatórias.</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">4. Compartilhamento de Dados</h3>
      <p className="text-muted-foreground">Não vendemos seus dados pessoais. Podemos compartilhá-los apenas com:</p>
      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
        <li>Provedores de serviços essenciais (hospedagem, processamento).</li>
        <li>Integrações autorizadas por você (WhatsApp Business API, Meta).</li>
        <li>Autoridades competentes quando exigido por lei.</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">5. Segurança dos Dados</h3>
      <p className="text-muted-foreground leading-relaxed">
        Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo criptografia, controle de acesso e monitoramento contínuo de segurança.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">6. Seus Direitos</h3>
      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
        <li>Acessar seus dados pessoais.</li>
        <li>Corrigir dados incompletos ou desatualizados.</li>
        <li>Solicitar a exclusão de seus dados.</li>
        <li>Revogar o consentimento a qualquer momento.</li>
        <li>Solicitar a portabilidade dos dados.</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">7. Retenção de Dados</h3>
      <p className="text-muted-foreground leading-relaxed">
        Seus dados serão mantidos enquanto sua conta estiver ativa. Após o encerramento, os dados serão excluídos dentro de 30 dias, exceto quando a retenção for exigida por lei.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">8. Alterações nesta Política</h3>
      <p className="text-muted-foreground leading-relaxed">
        Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.
      </p>
    </section>
  </div>
);

export default PrivacyPolicyContent;
