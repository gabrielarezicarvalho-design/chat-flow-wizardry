import { useState, useRef, useEffect, useMemo } from "react";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Phone,
  MoreVertical,
  ArrowLeft,
  CheckCheck,
  Check,
  Clock,
  User,
  Image as ImageIcon,
  XCircle,
  Bot,
  Headphones,
  GitBranch,
  ArrowRightLeft,
  Users,

} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CloseConversationDialog } from "@/components/conversations/CloseConversationDialog";
import { TransferDialog } from "@/components/conversations/TransferDialog";
import { MessageContent } from "@/components/conversations/MessageContent";
import { EditContactDialog } from "@/components/conversations/EditContactDialog";

const Conversations = () => {
  const { conversations, isLoading, deleteConversation, updateConversation } = useConversations();
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"agent" | "ai" | "ura" | "queue">("ura");
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [headerTransferDialogOpen, setHeaderTransferDialogOpen] = useState(false);
  const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load profiles to map assigned_to → name
  const { data: profilesMap } = useQuery({
    queryKey: ['profiles-map', companyId],
    queryFn: async () => {
      let query = supabase.from('profiles').select('id, full_name');
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data } = await query;
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.full_name || 'Sem nome'; });
      return map;
    },
    staleTime: 60000,
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const { messages, isLoading: messagesLoading } = useMessages(selectedConversationId || undefined);
  
  const isURA = (selectedConversation as any)?.attendance_type === "ura" || 
    (!(selectedConversation as any)?.attendance_type);

  const filteredConversations = conversations.filter(
    (conv) => {
      const matchesSearch = conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contact_phone?.includes(searchTerm);
      const matchesTab = (conv as any).attendance_type === activeTab || 
        (!((conv as any).attendance_type) && activeTab === "ura");
      const matchesMine = !showOnlyMine || activeTab !== "agent" || conv.assigned_to === user?.id;
      return matchesSearch && matchesTab && matchesMine;
    }
  );

  const getTabCount = (tab: string) => {
    return conversations.filter(c => {
      const type = (c as any).attendance_type;
      return type === tab || (!type && tab === "ura");
    }).length;
  };

  const markAsRead = (id: string) => {
    supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", id)
      .then(() => {
        updateConversation.mutate({ id, updates: { unread_count: 0 } });
      });
  };

  const isNearBottom = () => {
    const el = messagesEndRef.current?.parentElement?.parentElement as HTMLElement | null;
    // Fallback: find scrollable viewport ancestor
    const viewport =
      (messagesEndRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null) ||
      el;
    if (!viewport) return true;
    return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
  };

  // Auto-scroll to bottom on new messages + auto-mark-as-read if near bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (
      selectedConversationId &&
      selectedConversation &&
      (selectedConversation.unread_count ?? 0) > 0 &&
      isNearBottom()
    ) {
      markAsRead(selectedConversationId);
    }
  }, [messages, selectedConversationId, selectedConversation?.unread_count]);

  // Focus input and reset unread count when conversation selected
  useEffect(() => {
    if (selectedConversationId) {
      setTimeout(() => inputRef.current?.focus(), 100);
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Mark as read when user scrolls to bottom
  useEffect(() => {
    const viewport = document.querySelector(
      '[data-conversation-viewport] [data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    if (!viewport || !selectedConversationId) return;
    const handler = () => {
      if (
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120 &&
        (selectedConversation?.unread_count ?? 0) > 0
      ) {
        markAsRead(selectedConversationId);
      }
    };
    viewport.addEventListener("scroll", handler, { passive: true });
    return () => viewport.removeEventListener("scroll", handler);
  }, [selectedConversationId, selectedConversation?.unread_count]);


  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "HH:mm");
  };

  const formatConversationDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM/yyyy");
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || sending) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Save message to DB
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        content: text,
        sender_type: "agent",
        sender_id: user.id,
        message_type: "text",
        status: "sent",
      });

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from("conversations")
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConversationId);

      // Send via WhatsApp using the conversation's connection
      const connId = (selectedConversation as any)?.connection_id;
      if (selectedConversation?.contact_phone && connId) {
        const { data: sendData, error: sendError } = await supabase.functions.invoke("wa-send-text", {
          body: {
            connectionId: connId,
            phone: selectedConversation.contact_phone,
            text: text,
          },
        });

        if (sendError || (sendData && sendData.success === false)) {
          console.error("Erro ao enviar via WhatsApp:", sendError || sendData);
          toast.warning("Mensagem salva, mas falha ao enviar via WhatsApp");
        }
      }
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem");
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const doTransfer = async (aiAgentId?: string, departmentId?: string, humanAgentId?: string) => {
    if (!selectedConversationId || transferring) return;
    setTransferring(true);
    try {
      const updates: any = {};
      let nextTab: "agent" | "ai" | "ura" | "queue" = activeTab;

      if (humanAgentId) {
        updates.attendance_type = "agent";
        updates.assigned_to = humanAgentId;
        updates.department_id = null;
        nextTab = "agent";
      } else if (aiAgentId) {
        updates.attendance_type = "ai";
        updates.assigned_to = aiAgentId;
        updates.department_id = null;
        nextTab = "ai";
      } else if (departmentId) {
        updates.attendance_type = "queue";
        updates.assigned_to = null;
        updates.department_id = departmentId;
        nextTab = "queue";
      } else {
        toast.error("Selecione um destino para a transferência");
        return;
      }

      await updateConversation.mutateAsync({
        id: selectedConversationId,
        updates,
      });
      toast.success("Conversa transferida com sucesso!");
      setActiveTab(nextTab);
    } catch {
      toast.error("Erro ao transferir conversa");
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferFromURA = doTransfer;
  const handleHeaderTransfer = doTransfer;


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageStatusIcon = (status: string | null) => {
    switch (status) {
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />;
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60" />;
      case "sent":
        return <Check className="w-3.5 h-3.5 text-muted-foreground/60" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground/40" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background rounded-lg border border-border">
      {/* ==================== LEFT PANEL - Conversations List ==================== */}
      <div
        className={cn(
          "w-full md:w-[380px] md:min-w-[320px] md:max-w-[420px] flex flex-col border-r border-border bg-card",
          selectedConversationId && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredConversations.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setActiveTab("agent"); setSelectedConversationId(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
              activeTab === "agent"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Atendente</span>
            {getTabCount("agent") > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                {getTabCount("agent")}
              </Badge>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("ai"); setSelectedConversationId(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>IA</span>
            {getTabCount("ai") > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                {getTabCount("ai")}
              </Badge>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("ura"); setSelectedConversationId(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
              activeTab === "ura"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>URA</span>
            {getTabCount("ura") > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                {getTabCount("ura")}
              </Badge>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("queue"); setSelectedConversationId(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
              activeTab === "queue"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Fila</span>
            {getTabCount("queue") > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                {getTabCount("queue")}
              </Badge>
            )}
          </button>

        </div>

        {/* Filter: Meus / Todos (only on agent tab) */}
        {activeTab === "agent" && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
            <Button
              variant={showOnlyMine ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setShowOnlyMine(true)}
            >
              Meus
            </Button>
            <Button
              variant={!showOnlyMine ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setShowOnlyMine(false)}
            >
              Todos
            </Button>
          </div>
        )}

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              {activeTab === "agent" && <Headphones className="w-10 h-10 text-muted-foreground/40 mb-3" />}
              {activeTab === "ai" && <Bot className="w-10 h-10 text-muted-foreground/40 mb-3" />}
              {activeTab === "ura" && <GitBranch className="w-10 h-10 text-muted-foreground/40 mb-3" />}
              <p className="text-sm text-muted-foreground">
                {activeTab === "agent" && "Nenhum atendimento humano"}
                {activeTab === "ai" && "Nenhum atendimento com IA"}
                {activeTab === "ura" && "Nenhum cliente na URA"}
              </p>
            </div>
          ) : (
            <div>
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50",
                    selectedConversationId === conv.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(conv.contact_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {conv.contact_name || conv.contact_phone || "Desconhecido"}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatConversationDate(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message || "Nenhuma mensagem"}
                        </p>
                      </div>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <Badge className="rounded-full h-5 min-w-5 px-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white shrink-0">
                          {conv.unread_count}
                        </Badge>
                      ) : null}
                    </div>
                    {conv.assigned_to && profilesMap?.[conv.assigned_to] && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-primary/60" />
                        <span className="text-[10px] text-primary/80 truncate">
                          {profilesMap[conv.assigned_to]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ==================== RIGHT PANEL - Chat ==================== */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-background",
          !selectedConversationId && "hidden md:flex"
        )}
      >
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setSelectedConversationId(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(selectedConversation.contact_name)}
                </AvatarFallback>
              </Avatar>

              <div 
                className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setEditContactDialogOpen(true)}
                title="Clique para editar dados do contato"
              >
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {selectedConversation.contact_name || selectedConversation.contact_phone}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.contact_phone}
                  </p>
                  {selectedConversation.assigned_to && profilesMap?.[selectedConversation.assigned_to] && (
                    <span className="text-[10px] text-primary/80 flex items-center gap-0.5">
                      <User className="w-3 h-3" />
                      {profilesMap[selectedConversation.assigned_to]}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Badge
                  variant={selectedConversation.status === "open" ? "default" : "secondary"}
                  className="text-[10px] h-5"
                >
                  {selectedConversation.status === "open" ? "Aberto" : "Fechado"}
                </Badge>
                {selectedConversation.status === "open" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => setHeaderTransferDialogOpen(true)}
                      title="Transferir conversa"
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-1" />
                      <span className="text-xs hidden sm:inline">Transferir</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCloseDialogOpen(true)}
                      title="Encerrar conversa"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs hidden sm:inline">Encerrar</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 px-4 py-3" data-conversation-viewport>
              <div className="max-w-3xl mx-auto space-y-1">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Envie a primeira mensagem
                    </p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isAgent = msg.sender_type === "agent";
                    const isSystem = msg.sender_type === "system" || msg.sender_type === "bot";
                    const isContact = msg.sender_type === "contact";

                    // System/bot messages: centered info style
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center mb-2">
                          <div className="max-w-[85%] px-4 py-2 rounded-lg text-xs bg-muted/60 border border-border/50 text-muted-foreground">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Bot className="w-3 h-3 text-primary/70" />
                              <span className="font-medium text-primary/80">Sistema</span>
                            </div>
                            <MessageContent content={msg.content || ''} type={msg.message_type || 'text'} isSent={false} />
                            <div className="flex justify-end mt-1">
                              <span className="text-[10px] text-muted-foreground/50">
                                {formatMessageTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex mb-1",
                          isAgent ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] px-3 py-2 rounded-lg text-sm relative",
                            isAgent
                              ? "bg-emerald-600 text-white rounded-br-sm"
                              : "bg-card border border-border text-foreground rounded-bl-sm"
                          )}
                        >
                          <MessageContent 
                            content={msg.content || ''} 
                            type={msg.message_type || 'text'} 
                            isSent={isAgent} 
                          />
                          <div className={cn("flex items-center gap-1 mt-1 justify-end")}>
                            <span
                              className={cn(
                                "text-[10px]",
                                isAgent ? "text-white/60" : "text-muted-foreground/60"
                              )}
                            >
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isAgent && getMessageStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="px-4 py-3 border-t border-border bg-card">
              {isURA ? (
                <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto bg-muted/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GitBranch className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Cliente em fluxo URA. Transfira para atender manualmente.</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setTransferDialogOpen(true)}
                    disabled={transferring}
                    className="shrink-0"
                  >
                    <Headphones className="w-4 h-4 mr-1" />
                    {transferring ? "Transferindo..." : "Transferir"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    ref={inputRef}
                    placeholder="Digite uma mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-10 bg-muted/50 border-0 focus-visible:ring-1"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    className="shrink-0 h-9 w-9 rounded-full"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state - no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 font-['Space_Grotesk'] tracking-tight">
              NEXT PRO&nbsp;Chat
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Selecione uma conversa para começar a atender seus clientes
            </p>
          </div>
        )}
      </div>

      <CloseConversationDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        conversationId={selectedConversationId || ""}
        protocolNumber={selectedConversation?.protocol || undefined}
        onClose={() => {
          updateConversation.mutate({ id: selectedConversationId!, updates: { status: 'closed' } });
          setSelectedConversationId(null);
          setCloseDialogOpen(false);
        }}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onTransfer={handleTransferFromURA}
        showSelfOption
      />

      <TransferDialog
        open={headerTransferDialogOpen}
        onOpenChange={setHeaderTransferDialogOpen}
        onTransfer={handleHeaderTransfer}
        showSelfOption
      />

      {selectedConversation && (
        <EditContactDialog
          open={editContactDialogOpen}
          onOpenChange={setEditContactDialogOpen}
          contact={{
            id: selectedConversation.id,
            name: selectedConversation.contact_name,
            phone: selectedConversation.contact_phone,
          }}
          onUpdated={(updates) => {
            if (selectedConversationId) {
              updateConversation.mutate({
                id: selectedConversationId,
                updates: {
                  contact_name: updates.name,
                },
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default Conversations;
