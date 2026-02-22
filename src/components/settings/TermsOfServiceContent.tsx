import { FileText } from "lucide-react";

const TermsOfServiceContent = () => (
  <div className="space-y-6 text-sm">
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">1. Aceitação dos Termos</h3>
      <p className="text-muted-foreground leading-relaxed">
        Ao acessar e utilizar a plataforma, você concorda com estes Termos de Serviço. Se não concordar com qualquer parte destes termos, você não deverá utilizar nossos serviços.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">2. Descrição do Serviço</h3>
      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
        <li>Gerenciamento de conversas e atendimento via WhatsApp.</li>
        <li>Automação de fluxos de comunicação.</li>
        <li>Envio de mensagens em massa.</li>
        <li>Gestão de contatos e leads.</li>
        <li>Integração com agentes de IA.</li>
        <li>Relatórios e análises de desempenho.</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">3. Cadastro e Conta</h3>
      <p className="text-muted-foreground leading-relaxed">
        Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">4. Uso Aceitável</h3>
      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
        <li>Não enviar spam ou mensagens não solicitadas.</li>
        <li>Respeitar as políticas de uso do WhatsApp Business API e da Meta.</li>
        <li>Não utilizar o serviço para atividades ilegais ou fraudulentas.</li>
        <li>Não compartilhar suas credenciais de acesso com terceiros.</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">5. Planos e Pagamento</h3>
      <p className="text-muted-foreground leading-relaxed">
        Os serviços são oferecidos em diferentes planos com funcionalidades e limites variados. O não pagamento poderá resultar na suspensão ou cancelamento do serviço.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">6. Propriedade Intelectual</h3>
      <p className="text-muted-foreground leading-relaxed">
        Todo o conteúdo, design, código e funcionalidades da plataforma são de propriedade exclusiva. É proibida a reprodução, distribuição ou modificação sem autorização prévia.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">7. Limitação de Responsabilidade</h3>
      <p className="text-muted-foreground leading-relaxed">
        Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso dos serviços.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">8. Disponibilidade do Serviço</h3>
      <p className="text-muted-foreground leading-relaxed">
        Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">9. Rescisão</h3>
      <p className="text-muted-foreground leading-relaxed">
        Qualquer parte pode encerrar o uso do serviço a qualquer momento. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">10. Legislação Aplicável</h3>
      <p className="text-muted-foreground leading-relaxed">
        Estes termos são regidos pelas leis da República Federativa do Brasil.
      </p>
    </section>
  </div>
);

export default TermsOfServiceContent;
