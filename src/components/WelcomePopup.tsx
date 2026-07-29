import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Rocket, MessageSquare, Zap, Star, PartyPopper, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const WelcomePopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only show popup when user is logged in
    if (!user) return;

    // Check if user has permanently disabled the popup
    const permanentDisableKey = `nextpro_welcome_disabled_${user.id}`;
    const isPermanentlyDisabled = localStorage.getItem(permanentDisableKey) === "true";
    
    if (isPermanentlyDisabled) return;

    // Check if user has seen welcome popup in this session
    const sessionKey = `nextpro_welcome_${user.id}`;
    const hasSeenInSession = sessionStorage.getItem(sessionKey);
    
    if (!hasSeenInSession) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      sessionStorage.setItem(`nextpro_welcome_${user.id}`, "true");
    }
    setIsOpen(false);
  };

  const handleDisableForever = () => {
    if (user) {
      localStorage.setItem(`nextpro_welcome_disabled_${user.id}`, "true");
      toast.success("Popup desativado permanentemente");
    }
    setIsOpen(false);
  };

  const features = [
    { icon: MessageSquare, text: "Atendimento automatizado via WhatsApp" },
    { icon: Sparkles, text: "Agentes de IA inteligentes" },
    { icon: Zap, text: "Automações e fluxos personalizados" },
    { icon: Rocket, text: "Campanhas em massa eficientes" },
  ];

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-none">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-gradient-to-br from-primary via-primary-dark to-primary rounded-3xl overflow-hidden"
            >
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white/20 rounded-full"
                    initial={{
                      x: Math.random() * 400,
                      y: Math.random() * 500,
                      scale: Math.random() * 0.5 + 0.5,
                    }}
                    animate={{
                      y: [null, Math.random() * -200 - 100],
                      opacity: [0.7, 0],
                    }}
                    transition={{
                      duration: Math.random() * 3 + 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 text-center text-white">
                {/* Icon with animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6"
                >
                  <PartyPopper className="w-10 h-10" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold mb-2"
                >
                  Bem-vindo ao Next Pro! 🎉
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-2 mb-4"
                >
                  <span className="px-3 py-1 bg-yellow-500/30 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Versão Beta
                  </span>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/80 mb-8"
                >
                  Você está entre os primeiros a experimentar nossa plataforma
                  de automação de atendimento com IA!
                </motion.p>

                {/* Features */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-2 gap-3 mb-8"
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.text}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-center gap-2 bg-white/10 rounded-xl p-3 text-left"
                    >
                      <feature.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{feature.text}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={handleClose}
                    className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-xl text-lg"
                  >
                    Começar a explorar 🚀
                  </Button>
                  
                  <Button
                    onClick={handleDisableForever}
                    variant="ghost"
                    className="w-full text-white/70 hover:text-white hover:bg-white/10 gap-2"
                  >
                    <EyeOff className="w-4 h-4" />
                    Desativar para sempre
                  </Button>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                  className="text-white/60 text-xs mt-4"
                >
                  Agradecemos seu apoio como beta tester!
                </motion.p>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
