import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "nextpro_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:gap-10">
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/80">
          Ao clicar em “Aceitar todos os cookies”, concorda com o armazenamento de cookies no seu
          dispositivo para melhorar a navegação no site, analisar a utilização do site e ajudar nas
          nossas iniciativas de marketing. Consulte nossa{" "}
          <Link
            to="/politica-de-privacidade"
            className="font-semibold text-[#004DFF] hover:underline"
          >
            Política de Privacidade
          </Link>
          .
        </p>

        <div className="flex shrink-0 items-center gap-6">
          <button
            type="button"
            onClick={() => decide("rejected")}
            className="text-sm font-semibold text-foreground hover:opacity-70"
          >
            Rejeitar Todos
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="rounded-lg bg-[#004DFF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#003ACC]"
          >
            Aceitar todos os cookies
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
