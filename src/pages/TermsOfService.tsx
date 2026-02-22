import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

const TermsOfService = () => {
  const [companyName] = useState("MarketFlow");

  useEffect(() => {
    document.title = `Termos de Serviço - ${companyName}`;
  }, [companyName]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Termos de Serviço</h1>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao acessar e utilizar a plataforma {companyName}, você concorda com estes Termos de Serviço. Se não concordar com qualquer parte destes termos, você não deverá utilizar nossos serviços.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            O {companyName} é uma plataforma de automação inteligente para comunicação e atendimento, oferecendo funcionalidades como:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Gerenciamento de conversas e atendimento via WhatsApp.</li>
            <li>Automação de fluxos de comunicação.</li>
            <li>Envio de mensagens em massa.</li>
            <li>Gestão de contatos e leads.</li>
            <li>Integração com agentes de IA.</li>
            <li>Relatórios e análises de desempenho.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Cadastro e Conta</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Uso Aceitável</h2>
          <p className="text-muted-foreground leading-relaxed">Ao utilizar nossos serviços, você se compromete a:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Não enviar spam ou mensagens não solicitadas.</li>
            <li>Respeitar as políticas de uso do WhatsApp Business API e da Meta.</li>
            <li>Não utilizar o serviço para atividades ilegais ou fraudulentas.</li>
            <li>Não compartilhar suas credenciais de acesso com terceiros.</li>
            <li>Manter dados de contatos atualizados e com consentimento adequado.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Planos e Pagamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os serviços são oferecidos em diferentes planos com funcionalidades e limites variados. Os valores e condições de pagamento estão disponíveis na plataforma. O não pagamento poderá resultar na suspensão ou cancelamento do serviço.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Propriedade Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todo o conteúdo, design, código e funcionalidades da plataforma são de propriedade exclusiva do {companyName}. É proibida a reprodução, distribuição ou modificação sem autorização prévia por escrito.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground leading-relaxed">
            O {companyName} não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso dos serviços. Nossa responsabilidade está limitada ao valor pago pelo usuário nos últimos 12 meses.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">8. Disponibilidade do Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência. Não nos responsabilizamos por interrupções causadas por terceiros ou eventos de força maior.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">9. Rescisão</h2>
          <p className="text-muted-foreground leading-relaxed">
            Qualquer parte pode encerrar o uso do serviço a qualquer momento. O {companyName} reserva-se o direito de suspender ou encerrar contas que violem estes termos, sem aviso prévio em casos graves.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">10. Alterações nos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos modificar estes Termos de Serviço a qualquer momento. Alterações significativas serão notificadas com pelo menos 30 dias de antecedência. O uso continuado após as alterações constitui aceitação dos novos termos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">11. Legislação Aplicável</h2>
          <p className="text-muted-foreground leading-relaxed">
            Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca da sede do {companyName}.
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

export default TermsOfService;
