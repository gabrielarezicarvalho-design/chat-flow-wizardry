import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessagesSquare,
  X,
  Home,
  MessageCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Bot,
  Settings,
  HelpCircle,
  Headphones,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputProvider,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import type { ChatStatus } from "ai";

type Tab = "home" | "chat" | "articles";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const FAQ = [
  {
    topic: "Fluxo com IA",
    emoji: "🤖",
    q: "Como funciona o fluxo com IA?",
    a: "Na Next Pro você monta fluxos automáticos que respondem, qualificam e encaminham leads no WhatsApp sem código. É só escolher gatilhos, mensagens e ações que a IA executa para você.",
  },
  {
    topic: "Cadastros",
    emoji: "📓",
    q: "Quero deletar um contato, como faço?",
    a: "Vá em Contatos, busque o contato, abra o perfil e clique nos três pontos no canto superior direito para excluir. A ação é irreversível.",
  },
  {
    topic: "Agente IA",
    emoji: "",
    q: "Minha IA está com as informações desatualizadas.",
    a: "Atualize as instruções e a base de conhecimento do seu agente em Configurações > Agentes de IA. Salve e teste antes de ativar no fluxo.",
  },
  {
    topic: "Prospecção",
    emoji: "🔎",
    q: "Como funciona a busca de clientes?",
    a: "A Next Pro captura leads de Google Maps, Instagram, TikTok e pesquisa de anúncios, organizando tudo em listas que você pode importar para o CRM.",
  },
  {
    topic: "Pagamentos",
    emoji: "💳",
    q: "Posso fazer cobranças automáticas?",
    a: "Sim. Configure cobranças recorrentes e o sistema envia lembretes no WhatsApp com link de pagamento, de forma automática.",
  },
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
      className="w-full border border-slate-200 bg-white text-slate-800"
    >
      <PromptInputTextarea
        placeholder="Digite sua mensagem..."
        className="min-h-10 max-h-24 py-2 text-sm text-slate-800 placeholder:text-slate-400"

        disabled={status === "submitted"}
        autoFocus
      />
      <PromptInputFooter className="justify-end border-none pt-1">
        <PromptInputSubmit
          status={status}
          disabled={!textInput.value.trim() || status === "submitted"}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}

function BrandAvatar() {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#004DFF] text-white">
        <Bot className="h-6 w-6" />
      </div>
    );
  }
  return (
    <img
      src={logoAurora.url}
      alt="Next Pro"
      className="h-12 w-12 shrink-0 rounded-full object-cover"
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
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [faqOffset, setFaqOffset] = useState(0);

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
            className="fixed bottom-24 right-4 z-[120] flex w-[92vw] max-w-[360px] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl shadow-black/20 md:right-6"
            style={{ height: "clamp(420px, 58vh, 520px)" }}
          >
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 pt-4">
              <button
                onClick={() => setActiveTab("home")}
                aria-label="Início"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                  activeTab === "home"
                    ? "bg-[#004DFF] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Home className="h-[18px] w-[18px]" />
              </button>

              <div className="flex flex-1 items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    activeTab === "chat"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  Conversação
                </button>
                <button
                  onClick={() => setActiveTab("articles")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    activeTab === "articles"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Artigos
                </button>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {activeTab === "home" && (
                <div className="h-full overflow-y-auto scrollbar-hide px-5 pt-5">
                  <div className="flex items-center gap-2.5">
                    <BrandAvatar />
                    <div>
                      <p className="text-base font-semibold text-slate-900">Next Pro</p>
                      <p className="text-xs text-slate-500">Como podemos ajudar?</p>
                    </div>
                  </div>

                  <div className="my-3 h-px w-full bg-slate-200" />

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Search, label: "Buscar", action: () => setActiveTab("articles") },
                      { icon: HelpCircle, label: "Dúvidas", action: () => setActiveTab("articles") },
                      {
                        icon: Headphones,
                        label: "Suporte",
                        action: () => {
                          setActiveTab("chat");
                          setChatView("thread");
                        },
                      },
                      { icon: Megaphone, label: "Notícias", action: () => setActiveTab("articles") },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-left transition-colors hover:bg-slate-100"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-600" />
                        <span className="text-sm font-semibold text-slate-900">{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mb-2 mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Dúvidas frequentes?</p>
                    <button
                      onClick={() => setFaqOffset((v) => v + 1)}
                      aria-label="Atualizar perguntas"
                      className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 pb-4">
                    {Array.from({ length: 3 }, (_, i) => FAQ[(faqOffset + i) % FAQ.length]).map(
                      (item) => (
                        <button
                          key={item.q}
                          onClick={() => openChatWithQuestion(item.q)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-left transition-colors hover:bg-slate-100"
                        >
                          <span className="block text-sm font-bold leading-tight text-slate-900">
                            {item.topic}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">
                            {item.q} {item.emoji}
                          </span>
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      setChatView("thread");
                    }}
                    className="mx-auto mb-5 block rounded-full bg-[#004DFF] px-6 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Iniciar
                  </button>
                </div>
              )}

              {activeTab === "chat" && chatView === "list" && (
                <div className="flex h-full flex-col">
                  <div className="space-y-2 px-4 py-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, status ou número"
                        aria-label="Buscar conversas"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#004DFF] focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setStatusFilter(f.id)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                            statusFilter === f.id
                              ? "bg-[#004DFF] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide px-4 pb-4">
                    {filteredThreads.length === 0 && (
                      <p className="px-1 py-6 text-center text-xs font-medium text-slate-500">
                        Nenhuma conversa encontrada.
                      </p>
                    )}
                    {filteredThreads.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setChatView("thread")}
                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#004DFF]">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-900">{t.id}</p>
                            <span className="shrink-0 rounded-full bg-[#004DFF] px-2 py-0.5 text-[10px] font-semibold text-white">
                              {t.statusLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
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
                <div className="flex h-full flex-col overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
                    <button
                      onClick={() => setChatView("list")}
                      aria-label="Voltar"
                      className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold text-slate-900">{ticketId}</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <Conversation className="h-full">
                      <ConversationContent className="gap-3 p-3 scrollbar-hide">
                        {messages.map((m, i) => (
                          <Message key={i} from={m.role} className="max-w-full">
                            <MessageContent
                              className={
                                m.role === "user"
                                  ? "max-w-[85%] rounded-2xl px-3 py-2 group-[.is-user]:bg-[#004DFF] group-[.is-user]:px-3 group-[.is-user]:py-2 group-[.is-user]:text-white"
                                  : "max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 !text-slate-800"
                              }
                            >
                              {m.role === "assistant" ? (
                                <MessageResponse className="text-sm leading-relaxed text-slate-800 [&_*]:text-slate-800">
                                  {m.content}
                                </MessageResponse>
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white">
                                  {m.content}
                                </p>
                              )}
                            </MessageContent>
                          </Message>
                        ))}
                        {isLoading && (
                          <Message from="assistant" className="max-w-full">
                            <MessageContent className="max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2">
                              <Shimmer as="span" className="text-sm text-slate-500">
                                Pensando...
                              </Shimmer>
                            </MessageContent>
                          </Message>
                        )}
                      </ConversationContent>
                    </Conversation>
                  </div>

                  <div className="border-t border-slate-200 p-3">
                    <PromptInputProvider initialInput="">
                      <ChatComposer onSend={handleSend} status={chatStatus} />
                    </PromptInputProvider>
                  </div>
                </div>
              )}

              {activeTab === "articles" && (
                <div className="flex h-full flex-col gap-1.5 overflow-y-auto scrollbar-hide px-5 pt-5">
                  <p className="mb-1 text-sm font-semibold text-slate-900">Artigos de ajuda</p>
                  {FAQ.map((item) => {
                    const isOpenArticle = openArticle === item.q;
                    return (
                      <div
                        key={item.q}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5"
                      >
                        <button
                          onClick={() => setOpenArticle(isOpenArticle ? null : item.q)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-[#004DFF]" />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-slate-900">
                              {item.topic}
                            </span>
                            <span className="block text-xs text-slate-500">{item.q}</span>
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                              isOpenArticle ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        {isOpenArticle && (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="text-xs leading-relaxed text-slate-600">{item.a}</p>
                            <button
                              onClick={() => openChatWithQuestion(item.q)}
                              className="mt-3 text-xs font-semibold text-[#004DFF] hover:underline"
                            >
                              Falar com a Aurora sobre isso
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
              <span>Funcionamos com</span>
              <Settings className="h-3.5 w-3.5" />
              <span className="font-medium text-slate-700">gpt 5</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;
