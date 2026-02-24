import { useState, useRef, useEffect } from "react";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
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
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CloseConversationDialog } from "@/components/conversations/CloseConversationDialog";

const Conversations = () => {
  const { conversations, isLoading, deleteConversation } = useConversations();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const { messages, isLoading: messagesLoading } = useMessages(selectedConversationId || undefined);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_phone?.includes(searchTerm)
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when conversation selected
  useEffect(() => {
    if (selectedConversationId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedConversationId]);

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
        status: "sending",
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

      // Try to send via WhatsApp if conversation has a connection and phone
      if (selectedConversation?.contact_phone && selectedConversation?.company_id) {
        try {
          const { data: sendResult, error: sendError } = await supabase.functions.invoke("whatsapp-send", {
            body: {
              company_id: selectedConversation.company_id,
              to: selectedConversation.contact_phone,
              text: text,
            },
          });

          if (sendError) {
            console.warn("WhatsApp send failed, message saved locally:", sendError);
          }
        } catch (waError) {
          console.warn("WhatsApp API unavailable, message saved locally:", waError);
        }
      }
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem");
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

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
            {conversations.length}
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

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
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
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message || "Nenhuma mensagem"}
                      </p>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <Badge className="rounded-full h-5 min-w-5 px-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white shrink-0">
                          {conv.unread_count}
                        </Badge>
                      ) : null}
                    </div>
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

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {selectedConversation.contact_name || selectedConversation.contact_phone}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.contact_phone}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Badge
                  variant={selectedConversation.status === "open" ? "default" : "secondary"}
                  className="text-[10px] h-5"
                >
                  {selectedConversation.status === "open" ? "Aberto" : "Fechado"}
                </Badge>
                {selectedConversation.status === "open" && (
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
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 px-4 py-3">
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
                    const isAgent = msg.sender_type === "agent" || msg.sender_type === "system";
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
                          {msg.media_url && (
                            <div className="mb-2 rounded overflow-hidden">
                              <img
                                src={msg.media_url}
                                alt="media"
                                className="max-w-full max-h-64 object-cover rounded"
                              />
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          <div
                            className={cn(
                              "flex items-center gap-1 mt-1",
                              isAgent ? "justify-end" : "justify-end"
                            )}
                          >
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
            </div>
          </>
        ) : (
          /* Empty state - no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              MarketFlow Chat
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
          deleteConversation.mutate(selectedConversationId!);
          setSelectedConversationId(null);
          setCloseDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Conversations;
