import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessagesSquare, X, Home, Search, HelpCircle, Headphones, Megaphone, MessageSquare, Bot, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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

const STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Abertos" },
  { id: "closed", label: "Resolvidos" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

function generateTicketId() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const letters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `#PRO${date}${letters}${digits}`;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [chatView, setChatView] = useState<"list" | "thread">("list");
  const [ticketId] = useState(generateTicketId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [isLoading, setIsLoading] = useState(false);

  const threads = [
    {
      id: ticketId,
      name: "Suporte Next Pro",
      phone: "+55 11 91234-5678",
      status: "open" as StatusFilter,
      statusLabel: "Abertos",
    },
  ];

  const query = search.trim().toLowerCase();
  const filteredThreads = threads.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesQuery =
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      t.statusLabel.toLowerCase().includes(query) ||
      t.phone.replace(/\D/g, "").includes(query.replace(/\D/g, "")) ||
      t.phone.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

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
      setChatView("thread");
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
            className="fixed bottom-24 right-4 z-[120] flex w-[92vw] max-w-[392px] flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-[0_28px_70px_-20px_rgba(15,23,42,0.35)] md:right-6"
            style={{ height: "clamp(540px, 74vh, 680px)" }}
          >
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#004DFF] via-[#1a5cff] to-[#0038C7] px-6 pb-10 pt-6">
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-15"
                aria-hidden="true"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M-20 24C10 54 80 4 150 44S280 24 350 64" stroke="white" strokeWidth="2" />
                <path d="M-20 64C30 94 100 44 170 84S300 64 370 104" stroke="white" strokeWidth="2" />
                <path d="M-20 104C30 134 100 84 170 124S300 104 370 144" stroke="white" strokeWidth="2" />
              </svg>

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 p-1 backdrop-blur-md">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-white">
                      <HeaderLogo />
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
                  </div>
                  <div>
                    <p className="font-space-grotesk text-lg font-bold tracking-tight text-white">NEXT PRO</p>
                    <p className="text-sm font-medium text-blue-100">online agora</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar"
                  className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative z-20 -mt-6 flex-1 overflow-y-auto rounded-t-[28px] bg-white">

              {activeTab === "home" && (
                <div className="flex flex-col gap-7 p-6">
                  <div className="space-y-1">
                    <p className="font-space-grotesk text-2xl font-bold tracking-tight text-[#0F172A]">Olá! 👋</p>
                    <p className="text-base leading-relaxed text-slate-500">Como posso te ajudar hoje?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {[
                      { label: "Buscar", icon: Search, onClick: () => openChatWithQuestion("Como funciona a busca de clientes?") },
                      { label: "Dúvidas", icon: HelpCircle, onClick: () => setActiveTab("help") },
                      { label: "Suporte", icon: Headphones, onClick: () => window.open("https://wa.me/message/BYSDMLHYTA6EA1", "_blank", "noopener,noreferrer") },
                      { label: "Notícias", icon: Megaphone, onClick: () => setActiveTab("news") },
                    ].map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={action.onClick}
                          className="group flex flex-col items-start rounded-3xl border border-slate-100 bg-[#F4F6FB] p-4 text-left transition-all hover:border-[#004DFF]/25 hover:bg-[#004DFF]/[0.06]"
                        >
                          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#004DFF]/10 text-[#004DFF] transition-transform group-hover:scale-110">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-sm font-semibold text-[#0F172A]">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-space-grotesk text-sm font-bold text-[#0F172A]">Dúvidas frequentes</h4>
                      <button
                        onClick={() => setActiveTab("help")}
                        className="text-xs font-semibold text-[#004DFF] hover:underline"
                      >
                        Ver tudo
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {FAQ.slice(0, 3).map((item) => (
                        <button
                          key={item.q}
                          onClick={() => openChatWithQuestion(item.q)}
                          className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left transition-shadow hover:shadow-md"
                        >
                          <p className="text-sm font-medium text-slate-600">{item.q}</p>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#004DFF]" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setActiveTab("chat");
                      setChatView("thread");
                    }}
                    className="w-full rounded-full bg-[#004DFF] py-5 text-sm font-semibold text-white hover:bg-[#0038C7]"
                  >
                    Iniciar conversa
                  </Button>
                </div>
              )}


              {activeTab === "chat" && chatView === "list" && (
                <div className="flex h-full flex-col bg-white">
                  <div className="border-b border-slate-100 px-4 py-3.5">
                    <p className="text-center text-base font-semibold text-slate-900">Mensagens</p>
                  </div>

                  <div className="space-y-2 border-b border-slate-100 px-3 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, status ou número"
                        aria-label="Buscar conversas"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setStatusFilter(f.id)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                            statusFilter === f.id
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {filteredThreads.length === 0 && (
                      <p className="px-1 py-6 text-center text-xs font-medium text-slate-400">
                        Nenhuma conversa encontrada.
                      </p>
                    )}
                    {filteredThreads.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setChatView("thread")}
                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-900">{t.id}</p>
                            <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                              {t.statusLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                            {t.name} · {t.phone}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {activeTab === "chat" && chatView === "thread" && (
                <div className="flex h-full flex-col overflow-hidden bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                    <button
                      onClick={() => setChatView("list")}
                      aria-label="Voltar"
                      className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold text-slate-900">{ticketId}</p>
                  </div>
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
