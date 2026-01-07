import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Share2, 
  Twitter, 
  Linkedin, 
  Copy, 
  Check, 
  PartyPopper,
  Users,
  Rocket,
  Gift,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

const BetaThankYou = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  
  const email = location.state?.email || "";
  const shareUrl = "https://ia.marketflowchat.com.br/testar-beta";
  const shareText = "Acabei de me inscrever no beta do MarketFlow Chat! 🚀 Automatize seu WhatsApp com IA. Inscreva-se também:";

  useEffect(() => {
    // Simular posição na fila baseada em timestamp
    const position = Math.floor(Math.random() * 50) + 150;
    
    // Animação de contagem
    let current = 0;
    const increment = Math.ceil(position / 30);
    const timer = setInterval(() => {
      current += increment;
      if (current >= position) {
        setQueuePosition(position);
        clearInterval(timer);
      } else {
        setQueuePosition(current);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const shareLinkedin = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
      "_blank"
    );
  };

  return (
    <>
      <Helmet>
        <title>Inscrição Confirmada | MarketFlow Chat Beta</title>
        <meta name="description" content="Sua inscrição no beta do MarketFlow Chat foi confirmada!" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444"][i % 5],
                left: `${Math.random() * 100}%`,
                top: "-20px",
              }}
              animate={{
                y: ["0vh", "100vh"],
                x: [0, Math.random() * 100 - 50],
                rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                opacity: [1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                repeatDelay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-2xl w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 mb-6 shadow-2xl shadow-emerald-500/30">
              <PartyPopper className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50 p-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                🎉 Você está na lista!
              </h1>
              
              <p className="text-slate-300 text-lg mb-8">
                Sua inscrição foi confirmada com sucesso. Em breve você receberá um email com as instruções de acesso.
              </p>

              {/* Queue Position */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 p-6 inline-block">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-300 text-sm">Sua posição na fila</span>
                  </div>
                  <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    #{queuePosition}
                  </div>
                </Card>
              </motion.div>

              {/* Benefits */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Acesso Antecipado</p>
                    <p className="text-slate-400 text-sm">Antes do lançamento público</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">50% de Desconto</p>
                    <p className="text-slate-400 text-sm">Exclusivo para beta testers</p>
                  </div>
                </motion.div>
              </div>

              {/* Share Section */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="border-t border-slate-700/50 pt-8"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Share2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-white font-semibold">Compartilhe e avance na fila!</h3>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                  Cada amigo que se inscrever pelo seu link te faz subir 5 posições
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={shareWhatsApp}
                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </Button>

                  <Button
                    onClick={shareTwitter}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <Twitter className="w-5 h-5" />
                    Twitter
                  </Button>

                  <Button
                    onClick={shareLinkedin}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <Linkedin className="w-5 h-5" />
                    LinkedIn
                  </Button>

                  <Button
                    onClick={copyLink}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    {copied ? "Copiado!" : "Copiar Link"}
                  </Button>
                </div>
              </motion.div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center mt-6"
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/testar-beta")}
              className="text-slate-400 hover:text-white gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a página inicial
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BetaThankYou;
