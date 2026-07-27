import { useEffect } from "react";
import { Cookie } from "lucide-react";
import LegalPageLayout from "@/components/layout/LegalPageLayout";

const Cookies = () => {
  const companyName = "CRM NEXT PRO";

  useEffect(() => {
    document.title = `Política de Cookies - ${companyName}`;
  }, [companyName]);

  return (
    <LegalPageLayout
      icon={Cookie}
      title="Política de Cookies"
      subtitle={companyName}
    >
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. O que são Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você acessa um site. Eles são amplamente utilizados para fazer com que os sites funcionem de forma mais eficiente, além de fornecer informações aos proprietários da plataforma.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Como Utilizamos os Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          O {companyName} utiliza cookies para melhorar a experiência do usuário, personalizar conteúdo, analisar tráfego e garantir a segurança da plataforma. Os cookies que utilizamos se dividem nas seguintes categorias:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
          <li><strong>Cookies essenciais:</strong> necessários para o funcionamento básico da plataforma, como autenticação e segurança.</li>
          <li><strong>Cookies de preferências:</strong> permitem lembrar escolhas do usuário, como idioma e configurações de interface.</li>
          <li><strong>Cookies de desempenho:</strong> ajudam a entender como os visitantes interagem com a plataforma, coletando dados de forma anônima.</li>
          <li><strong>Cookies de marketing:</strong> utilizados para apresentar anúncios e comunicações mais relevantes aos usuários.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Cookies de Terceiros</h2>
        <p className="text-muted-foreground leading-relaxed">
          Podemos utilizar serviços de terceiros que também armazenam cookies no seu dispositivo, como provedores de análise, pagamento e integrações com redes sociais. Esses cookies estão sujeitos às políticas de privacidade dos respectivos provedores.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Gerenciamento de Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Você pode gerenciar ou desativar cookies através das configurações do seu navegador. A maioria dos navegadores permite que você visualize, exclua ou bloqueie cookies de sites específicos. Tenha em mente que a desativação de cookies essenciais pode afetar o funcionamento da plataforma.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Consentimento</h2>
        <p className="text-muted-foreground leading-relaxed">
          Ao continuar navegando na plataforma {companyName}, você concorda com o uso de cookies conforme descrito nesta política. Para cookies de marketing e desempenho, solicitamos seu consentimento explícito no momento do primeiro acesso.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Alterações nesta Política</h2>
        <p className="text-muted-foreground leading-relaxed">
          Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças nas práticas de uso de cookies ou em requisitos legais. Recomendamos que você revise esta página regularmente.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Contato</h2>
        <p className="text-muted-foreground leading-relaxed">
          Se tiver dúvidas sobre o uso de cookies em nossa plataforma, entre em contato conosco através dos canais de suporte disponíveis no site.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default Cookies;
