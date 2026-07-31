import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessagesSquare, X, Home, Search, HelpCircle, Headphones, Megaphone, MessageSquare, Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, PromptInputProvider, usePromptInputController } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import type { ChatStatus } from "ai";

type Tab = "home" | "chat" | "help" | "news";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const FAQ = [
  {
    q: "Como funciona o fluxo com IA?",
    a: "Na Next Pro você monta fluxos automáticos que respondem, qualificam e encaminham leads no WhatsApp sem código. É só escolher gatilhos, mensagens e ações que a IA executa para você.",
  },
  {
    q: "Quero deletar um contato, como faço?",
    a: "Vá em Contatos, busque o contato, abra o perfil e clique nos três pontos no canto superior direito para excluir. A ação é irreversível.",
  },
  {
    q: "Minha IA está com as informações desatualizadas.",
    a: "Atualize as instruções e a base de conhecimento do seu agente em Configurações > Agentes de IA. Salve e teste antes de ativar no fluxo.",
  },
  {
    q: "Como funciona a busca de clientes?",
    a: "A Next Pro captura leads de Google Maps, Instagram, TikTok e pesquisa de anúncios, organizando tudo em listas que você pode importar para o CRM.",
  },
  {
    q: "Posso fazer cobranças automáticas?",
    a: "Sim. Configure cobranças recorrentes e o sistema envia lembretes no WhatsApp com link de pagamento, de forma automática.",
  },
];

const NEWS = [
  { title: "Novo fluxo de recuperação financeira", date: "30 jul 2026", excerpt: "Automatize lembretes de pagamento e reduza inadimplência com poucos cliques." },
  { title: "IA agora responde por áudio", date: "15 jul 2026", excerpt: "Seus clientes podem enviar áudio e a Aurora responde com a voz clonada da sua empresa." },
  { title: "Integração com Evolution API", date: "05 jul 2026", excerpt: "Conecte seu WhatsApp com mais estabilidade e recursos avançados de instância." },
];

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content: "Olá! 👋 Sou a Aurora, assistente da Next Pro. Como posso te ajudar hoje?",
};

const FUNCTION_TIMEOUT = 12000;

function ChatComposer({
  onSend,
  status,
}: {
  onSend: (text: string) => void;
  status: ChatStatus;
}) {
  const { textInput } = usePromptInputController();
  return (
    <PromptInput
      onSubmit={({ text }) => {
        onSend(text);
      }}
      className="w-full"
    >
      <PromptInputTextarea
        placeholder="Digite sua mensagem..."
        className="min-h-10 max-h-24 py-2 text-sm"
        disabled={status === "submitted"}
        autoFocus
      />
      <PromptInputFooter className="justify-end pt-1">
        <PromptInputSubmit
          status={status}
          disabled={!textInput.value.trim() || status === "submitted"}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}

function HeaderLogo() {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#004DFF] text-white">
        <Bot className="h-5 w-5" />
      </div>
    );
  }
  return (
    <img
      src={logoAurora.url}
      alt="NEXT PRO"
      className="h-9 w-9 shrink-0 rounded-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || isLoading) return;
      setMessages((prev) => [...prev, { role: "user", content: clean }]);
      setIsLoading(true);

      const local = FAQ.find((item) => {
        const questionNorm = item.q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const textNorm = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return questionNorm.includes(textNorm) || textNorm.includes(questionNorm);
      });

      if (local) {
        await new Promise((r) => window.setTimeout(r, 800));
        setMessages((prev) => [...prev, { role: "assistant", content: local.a }]);
        setIsLoading(false);
        return;
      }

      let reply: string | null = null;
      try {
        const history = messagesRef.current.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const invokePromise = supabase.functions.invoke("landing-aurora-chat", {
          body: { message: clean, history },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("Tempo esgotado")), FUNCTION_TIMEOUT)
        );
        const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
        reply = (data as any)?.text || (data as any)?.reply;
        if (error) throw error;
      } catch {
        reply = null;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            reply && reply.trim()
              ? reply
              : "Consigo te ajudar com isso! 😊 Me conta um pouco mais sobre o que você precisa.",
        },
      ]);
      setIsLoading(false);
    },
    [isLoading]
  );

  const openChatWithQuestion = useCallback(
    (question: string) => {
      setActiveTab("chat");
      window.setTimeout(() => handleSend(question), 50);
    },
    [handleSend]
  );

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Início", icon: Home },
    { id: "chat", label: "Mensagens", icon: MessageSquare },
    { id: "help", label: "Ajuda", icon: HelpCircle },
    { id: "news", label: "Notícias", icon: Megaphone },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const chatStatus: ChatStatus = isLoading ? "submitted" : "ready";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        aria-label={isOpen ? "Fechar chat" : "Abrir chat"}
        className="fixed bottom-6 right-6 z-[110] group inline-flex outline-none"
      >
        <span className="absolute -inset-2 rounded-full bg-[#004DFF]/25" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#004DFF] text-white shadow-xl shadow-[#004DFF]/30 transition-transform duration-200 hover:scale-110">
          <MessagesSquare className="h-6 w-6" />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 z-[120] flex w-[92vw] max-w-[380px] flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-2xl shadow-slate-900/10 md:right-6"
            style={{ height: "clamp(520px, 70vh, 640px)" }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2.5">
                <HeaderLogo />
                <div>
                  <p className="font-semibold text-slate-900">NEXT PRO</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#004DFF]" />
                    online agora
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              {activeTab === "home" && (
                <div className="flex flex-col gap-5 p-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Olá! 👋</p>
                    <p className="text-lg font-semibold text-slate-900">Como posso te ajudar?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openChatWithQuestion("Como funciona a busca de clientes?")}
                      className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <Search className="h-4 w-4 text-slate-500" />
                      Buscar
                    </button>
                    <button
                      onClick={() => setActiveTab("help")}
                      className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <HelpCircle className="h-4 w-4 text-slate-500" />
                      Dúvidas
                    </button>
                    <button
                      onClick={() => window.open("https://wa.me/message/BYSDMLHYTA6EA1", "_blank", "noopener,noreferrer")}
                      className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <Headphones className="h-4 w-4 text-slate-500" />
                      Suporte
                    </button>
                    <button
                      onClick={() => setActiveTab("news")}
                      className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <Megaphone className="h-4 w-4 text-slate-500" />
                      Notícias
                    </button>
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-slate-500">Dúvidas frequentes?</p>
                    <div className="flex flex-col gap-2">
                      {FAQ.slice(0, 3).map((item) => (
                        <button
                          key={item.q}
                          onClick={() => openChatWithQuestion(item.q)}
                          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition-all hover:border-[#004DFF]/20 hover:shadow-md"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{item.q}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.a}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => setActiveTab("chat")}
                    className="w-full rounded-full bg-slate-900 py-5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Iniciar
                  </Button>
                </div>
              )}

              {activeTab === "chat" && (
                <div className="flex h-full flex-col overflow-hidden bg-white">
                  <div className="min-h-0 flex-1">
                    <Conversation className="h-full">
                      <ConversationContent className="gap-3 p-3">
                        {messages.map((m, i) => (
                          <Message key={i} from={m.role}>
                            <MessageContent>
                              {m.role === "assistant" ? (
                                <MessageResponse className="text-sm leading-relaxed">{m.content}</MessageResponse>
                              ) : (
                                <p className="text-sm leading-relaxed">{m.content}</p>
                              )}
                            </MessageContent>
                          </Message>
                        ))}
                        {isLoading && (
                          <Message from="assistant">
                            <MessageContent className="max-w-[80%]">
                              <Shimmer as="span" className="text-sm">
                                Pensando...
                              </Shimmer>
                            </MessageContent>
                          </Message>
                        )}
                      </ConversationContent>
                    </Conversation>
                  </div>
                  <div className="border-t border-slate-100 bg-white p-3">
                    <PromptInputProvider initialInput="">
                      <ChatComposer onSend={handleSend} status={chatStatus} />
                    </PromptInputProvider>
                  </div>
                </div>
              )}

              {activeTab === "help" && (
                <div className="flex flex-col gap-4 p-4">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Central de ajuda</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Escolha um tópico ou fale com nosso time pelo WhatsApp.
                    </p>
                  </div>
                  {FAQ.map((item) => (
                    <button
                      key={item.q}
                      onClick={() => openChatWithQuestion(item.q)}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition-all hover:border-[#004DFF]/20 hover:shadow-md"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.q}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.a}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ))}
                  <Button
                    onClick={() => window.open("https://wa.me/message/BYSDMLHYTA6EA1", "_blank", "noopener,noreferrer")}
                    className="w-full rounded-full bg-[#004DFF] py-5 text-sm font-semibold text-white hover:bg-[#0038C7]"
                  >
                    Falar com suporte
                  </Button>
                </div>
              )}

              {activeTab === "news" && (
                <div className="flex flex-col gap-4 p-4">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Notícias</p>
                    <p className="mt-1 text-xs text-slate-500">Novidades da Next Pro para o seu negócio.</p>
                  </div>
                  {NEWS.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <p className="text-xs font-medium text-[#004DFF]">{item.date}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-around border-t border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      isActive
                        ? "text-[#004DFF]"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                    aria-label={tab.label}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;
