import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Send, MessageSquare, CheckCheck, 
  Tag, History, UserPlus, ArrowRightLeft, XCircle, Clock, Users, 
  Phone, MoreVertical, Filter, AlertCircle
} from "lucide-react";
import { TransferDialog } from "@/components/conversations/TransferDialog";
import { CommandMenu } from "@/components/conversations/CommandMenu";
import { NewConversationDialog } from "@/components/conversations/NewConversationDialog";
import { DebugConsole } from "@/components/conversations/DebugConsole";
import { EditContactDialog } from "@/components/conversations/EditContactDialog";
import { SearchMessagesDialog } from "@/components/conversations/SearchMessagesDialog";
import { InviteAgentDialog } from "@/components/conversations/InviteAgentDialog";
import { ConversationHistoryDialog } from "@/components/conversations/ConversationHistoryDialog";
import { CloseConversationDialog } from "@/components/conversations/CloseConversationDialog";
import { MessageTemplatesPopover } from "@/components/conversations/MessageTemplatesPopover";
import { EmojiPopover } from "@/components/conversations/EmojiPopover";
import { MediaSendPopover } from "@/components/conversations/MediaSendPopover";
import { AudioRecorderButton } from "@/components/conversations/AudioRecorderButton";
import { MessageContent } from "@/components/conversations/MessageContent";
import { ConversationTagsPopover } from "@/components/conversations/ConversationTagsPopover";
import { useConversations } from "@/hooks/useConversations";
import { useMessages, useGlobalMessages } from "@/hooks/useMessages";
import { useAgentNotifications } from "@/hooks/useAgentNotifications";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/FeatureGate";

const ConversationsContent = () => {
  const { conversations, isLoading } = useConversations();
  const { leads } = useLeads();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageInput, setMessageInput] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [searchMessagesOpen, setSearchMessagesOpen] = useState(false);
  const [inviteAgentOpen, setInviteAgentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [prefilledContact, setPrefilledContact] = useState<{ phone: string; name: string } | null>(null);
  const [agentName, setAgentName] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { updateConversation, deleteConversation } = useConversations();
  const { messages, isLoading: loadingMessages } = useMessages(selectedConversation?.id);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Enable notifications and global message updates
  useGlobalMessages();
  useAgentNotifications();

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setAgentName(profile.full_name);
        }
      }
    };
    loadUser();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, selectedConversation?.id]);

  // Filter conversations by tab
  const myChats = conversations.filter((conv: any) => 
    conv.status === 'in_attendance' && conv.assigned_agent === currentUserId
  );
  
  const queueConversations = conversations.filter((conv: any) => 
    conv.status === 'waiting' || conv.status === 'in_queue'
  );

  const handleAcceptFromQueue = async (conv: any) => {
    try {
      await updateConversation.mutateAsync({
        id: conv.id,
        updates: { 
          status: 'in_attendance',
          assigned_agent: currentUserId 
        }
      });
      setSelectedConversation(conv);
      setActiveTab("chats");
      toast.success('Atendimento iniciado!');
    } catch (error) {
      toast.error('Erro ao aceitar atendimento');
    }
  };

  const handleCloseConversation = () => {
    if (!selectedConversation) return;
    setCloseDialogOpen(true);
  };

  const handleConversationClosed = async () => {
    setSelectedConversation(null);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleTransfer = async (agentId?: string, departmentId?: string, humanAgentId?: string) => {
    if (!selectedConversation) return;
    
    // Lógica de roteamento:
    // - humanAgentId: transferência direta para atendente → status 'in_attendance' + assigned_agent
    // - departmentId: transferência para fila → status 'waiting' + department_id
    // - agentId: transferência para IA → status 'in_attendance' + assigned_agent_id (IA)
    
    const updates: any = {};
    
    if (humanAgentId) {
      // Transferência direta para atendente humano → vai pro chat dele
      updates.assigned_agent = humanAgentId;
      updates.status = 'in_attendance';
      updates.department_id = null; // CRÍTICO: Limpa departamento para não ficar na fila
      updates.assigned_agent_id = null; // Limpa IA
      updates.flow_state = null; // Limpa estado do fluxo
    } else if (departmentId) {
      // Transferência para fila do departamento → vai pra fila
      updates.department_id = departmentId;
      updates.status = 'waiting';
      updates.assigned_agent = null; // Limpa atendente
      updates.assigned_agent_id = null; // Limpa IA
      updates.flow_state = null; // Limpa estado do fluxo
    } else if (agentId) {
      // Transferência para assistente IA
      updates.assigned_agent_id = agentId;
      updates.status = 'in_attendance';
      updates.department_id = null; // Limpa departamento
      updates.flow_state = null; // Limpa estado do fluxo
    }
    
    await updateConversation.mutateAsync({
      id: selectedConversation.id,
      updates
    });
    
    // Se foi para fila, desseleciona
    if (departmentId) {
      setSelectedConversation(null);
    }
    
    toast.success('Conversa transferida');
  };

  const handleDelete = async () => {
    if (!selectedConversation || !confirm('Excluir esta conversa?')) return;
    await deleteConversation.mutateAsync(selectedConversation.id);
    setSelectedConversation(null);
  };

  // Check if a phone number is valid for WhatsApp (not a Facebook/Instagram ID)
  const isValidWhatsAppNumber = (phone: string): boolean => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    // Facebook/Instagram IDs are typically very long (15+ digits) and don't follow phone patterns
    if (cleanPhone.length > 15) return false;
    if (cleanPhone.length < 10) return false;
    return true;
  };

  const getConversationPhone = (conv: any): string => {
    return conv?.leads?.phone || conv?.user_phone || '';
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    const phone = getConversationPhone(selectedConversation);
    
    // Validate phone before attempting to send
    if (!isValidWhatsAppNumber(phone)) {
      toast.error("Este contato não possui um número de WhatsApp válido. Parece ser um contato do Facebook/Instagram.");
      return;
    }
    
    const messageText = messageInput.trim();
    const messageWithSignature = agentName 
      ? `*${agentName}:*\n${messageText}` 
      : messageText;
    
    setSendingMessage(true);
    setMessageInput("");
    
    try {
      if (!phone) throw new Error("Telefone não encontrado");
      if (!selectedConversation.connection_id) throw new Error("Conexão não encontrada");

      const { data, error } = await supabase.functions.invoke('wa-send-text', {
        body: {
          connectionId: selectedConversation.connection_id,
          phone,
          text: messageWithSignature,
          conversationId: selectedConversation.id
        }
      });

      if (error) throw error;
      
      // Handle specific error cases
      if (!data?.success) {
        if (data?.details?.message?.includes("Facebook Messenger") || data?.details?.message?.includes("Instagram")) {
          throw new Error("Este contato não possui um número de WhatsApp válido. Parece ser um contato do Facebook/Instagram.");
        }
        if (data?.error?.includes("não está no WhatsApp")) {
          throw new Error("Este número não está registrado no WhatsApp.");
        }
        throw new Error(data?.error || "Erro ao enviar");
      }

      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar");
      setMessageInput(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  // Open or create conversation with a contact
  const handleOpenConversationWithContact = async (lead: any) => {
    // First, check if there's an existing conversation with this lead
    const existingConv = conversations?.find((conv: any) => 
      conv.lead_id === lead.id || 
      conv.leads?.phone === lead.phone ||
      conv.user_phone === lead.phone
    );

    if (existingConv) {
      setSelectedConversation(existingConv);
      setActiveTab("chats");
      return;
    }

    // If no existing conversation, create a new one
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Get the first active connection
      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .limit(1);

      const connectionId = connections?.[0]?.id;

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          lead_id: lead.id,
          user_phone: lead.phone,
          user_name: lead.name,
          platform: 'whatsapp',
          status: 'in_attendance',
          connection_id: connectionId
        })
        .select('*, leads(*)')
        .single();

      if (error) throw error;

      setSelectedConversation(newConv);
      setActiveTab("chats");
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success("Conversa iniciada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao iniciar conversa");
    }
  };

  const getFilteredList = () => {
    const searchLower = searchQuery.toLowerCase();
    
    if (activeTab === "chats") {
      return myChats.filter((conv: any) => 
        conv.leads?.name?.toLowerCase().includes(searchLower) ||
        conv.leads?.phone?.includes(searchQuery) ||
        conv.last_message?.toLowerCase().includes(searchLower)
      );
    }
    
    if (activeTab === "fila") {
      if (!searchQuery.trim()) return queueConversations;
      return queueConversations.filter((conv: any) => {
        const name = conv.leads?.name || conv.user_name || '';
        const phone = conv.leads?.phone || conv.user_phone || '';
        return name.toLowerCase().includes(searchLower) || phone.includes(searchQuery);
      });
    }
    
    if (activeTab === "contatos") {
      return leads?.filter((lead: any) => 
        lead.name?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(searchQuery)
      ) || [];
    }
    
    return [];
  };

  const filteredList = getFilteredList();

  const getAttendanceTime = (createdAt: string) => {
    const start = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}min`;
  };

  const renderEmptyState = () => {
    if (activeTab === "chats") {
      return (
        <div className="py-16 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Não existem chamados abertos</p>
        </div>
      );
    }
    if (activeTab === "fila") {
      return (
        <div className="py-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum contato na fila</p>
        </div>
      );
    }
    return (
      <div className="py-16 text-center">
        <Phone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden flex bg-background">
      {/* Sidebar - Conversations List */}
      <aside className="w-[320px] bg-card border-r border-border flex flex-col">
        {/* Search */}
        <div className="px-3 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar por nome ou número..." 
              className="pl-9 h-9 bg-muted/50 border-0 rounded-lg text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-12 bg-transparent rounded-none grid grid-cols-3 gap-0">
              <TabsTrigger 
                value="chats" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                Chats
                {myChats.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                    {myChats.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="fila" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <Users className="w-4 h-4" />
                Fila
                {queueConversations.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs bg-orange-500 text-white">
                    {queueConversations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="contatos" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <Phone className="w-4 h-4" />
                Contatos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredList.length === 0 ? (
            renderEmptyState()
          ) : activeTab === "contatos" ? (
            // Contacts list
            filteredList.map((lead: any) => (
              <div
                key={lead.id}
                className="px-3 py-3 cursor-pointer border-b border-border/50 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                      {lead.name?.substring(0, 2).toUpperCase() || '👤'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {lead.name || 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.phone}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenConversationWithContact(lead);
                    }}
                    title="Enviar mensagem"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : activeTab === "fila" ? (
            // Queue list
            filteredList.map((conv: any) => (
              <div
                key={conv.id}
                className="px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-sm font-medium">
                      {(conv.leads?.name || conv.user_name || '')?.substring(0, 2).toUpperCase() || '👤'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-sm text-foreground truncate">
                        {conv.leads?.name || conv.user_name || 'Sem nome'}
                      </span>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                        {getAttendanceTime(conv.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {conv.last_message || 'Aguardando atendimento...'}
                    </p>
                    <Button 
                      size="sm" 
                      className="h-7 text-xs w-full"
                      onClick={() => handleAcceptFromQueue(conv)}
                    >
                      Iniciar Atendimento
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Chats list
            filteredList.map((conv: any) => {
              const isSelected = selectedConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`px-3 py-3 cursor-pointer border-b border-border/50 transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className={`text-sm font-medium ${
                        isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {conv.leads?.name?.substring(0, 2).toUpperCase() || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-medium text-sm truncate ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}>
                          {conv.leads?.name || 'Sem nome'}
                        </span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(conv.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-relaxed">
                        {conv.last_message || 'Nenhuma mensagem'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 mt-1 rounded-full bg-green-500 text-white text-[10px] font-medium">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add New Conversation Button */}
        <div className="p-3 border-t border-border">
          <NewConversationDialog 
            defaultPhone={prefilledContact?.phone}
            defaultName={prefilledContact?.name}
            externalOpen={newConversationOpen}
            onOpenChange={(open) => {
              setNewConversationOpen(open);
              if (!open) setPrefilledContact(null);
            }}
          />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {selectedConversation ? (
          <div className="flex flex-col h-full w-full">
            {/* Chat Header */}
            <div className="shrink-0 h-14 px-4 bg-card border-b border-border flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                    {selectedConversation.leads?.name?.substring(0, 2).toUpperCase() || '👤'}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setEditContactOpen(true)}
                >
                  <h2 className="font-medium text-foreground text-sm hover:text-primary">
                    {selectedConversation.leads?.name || 'Sem contato cadastrado'}
                  </h2>
                  <p className="text-xs text-destructive font-mono border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 rounded inline-block">
                    {selectedConversation.protocol_number || `PROT${selectedConversation.id.slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
              </div>
              
              {/* Timer & Action Buttons */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm mr-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs">{getAttendanceTime(selectedConversation.created_at)}</span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchMessagesOpen(true)}
                  title="Buscar"
                >
                  <Search className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setInviteAgentOpen(true)}
                  title="Convidar"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setTransferOpen(true)}
                  title="Transferir"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setHistoryOpen(true)}
                  title="Histórico"
                >
                  <History className="w-4 h-4" />
                </Button>
                
                <ConversationTagsPopover
                  conversationId={selectedConversation.id}
                  onTagsChange={() => queryClient.invalidateQueries({ queryKey: ['conversations'] })}
                />
                
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleCloseConversation}
                  title="Encerrar"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area (Scrollable) */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-6 py-4 bg-muted/30"
            >
              <div className="max-w-3xl mx-auto space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">As mensagens aparecerão aqui</p>
                  </div>
                ) : (
                  messages.map((msg: any, index: number) => {
                    const showDate = index === 0 || 
                      new Date(messages[index - 1]?.criado_em).toDateString() !== new Date(msg.criado_em).toDateString();
                    const isSent = !msg.recebido;
                    
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-card rounded-full text-xs text-muted-foreground shadow-sm">
                              {new Date(msg.criado_em).toLocaleDateString('pt-BR', { 
                                day: 'numeric', 
                                month: 'long' 
                              })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                              isSent
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-card rounded-bl-md"
                            }`}
                          >
                            {!isSent && msg.remetente && msg.remetente !== 'sistema' && (
                              <p className="text-xs font-medium text-primary mb-1">
                                {msg.remetente}
                              </p>
                            )}
                            <MessageContent 
                              content={msg.conteudo} 
                              type={msg.tipo} 
                              isSent={isSent} 
                            />
                            <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
                              <span className={`text-[10px] ${isSent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isSent && (
                                <CheckCheck className={`w-3.5 h-3.5 ${msg.read ? "text-blue-400" : "text-primary-foreground/60"}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input Area (Fixed Bottom) */}
            <div className="shrink-0 bg-card border-t border-border px-4 py-3 z-20">
              {!isValidWhatsAppNumber(getConversationPhone(selectedConversation)) ? (
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Contato do Facebook/Instagram
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Este contato não possui um número de WhatsApp válido. Não é possível enviar mensagens.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <EmojiPopover 
                      onSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                      disabled={selectedConversation.status === 'closed'}
                    />
                    <MediaSendPopover
                      connectionId={selectedConversation.connection_id}
                      phone={getConversationPhone(selectedConversation)}
                      conversationId={selectedConversation.id}
                      disabled={selectedConversation.status === 'closed'}
                      onSent={() => {
                        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                      }}
                    />
                    <MessageTemplatesPopover onSelect={(content) => setMessageInput(content)} />
                    <AudioRecorderButton
                      connectionId={selectedConversation.connection_id}
                      phone={getConversationPhone(selectedConversation)}
                      conversationId={selectedConversation.id}
                      disabled={selectedConversation.status === 'closed'}
                      onSent={() => {
                        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      placeholder="Digite uma mensagem..." 
                      className="h-10 bg-transparent border-0 shadow-none text-sm placeholder:text-muted-foreground"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={selectedConversation.status === 'closed' || sendingMessage}
                    />
                  </div>
                  <Button 
                    variant="ghost"
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                    disabled={!messageInput.trim() || selectedConversation.status === 'closed' || sendingMessage}
                    onClick={handleSendMessage}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                Selecione um contato para iniciar uma conversa
              </h3>
              <p className="text-sm text-muted-foreground/70">
                Escolha um chat na lista ou aceite um atendimento da fila
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <TransferDialog 
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onTransfer={handleTransfer}
      />

      <CommandMenu 
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onSelect={(text) => setMessageInput(text)}
      />

      <EditContactDialog
        open={editContactOpen}
        onOpenChange={setEditContactOpen}
        lead={selectedConversation?.leads}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }}
      />

      <SearchMessagesDialog
        open={searchMessagesOpen}
        onOpenChange={setSearchMessagesOpen}
        messages={messages}
      />

      <InviteAgentDialog
        open={inviteAgentOpen}
        onOpenChange={setInviteAgentOpen}
        conversationId={selectedConversation?.id || ""}
      />

      <ConversationHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        leadId={selectedConversation?.lead_id}
        leadName={selectedConversation?.leads?.name || "Contato"}
      />

      <CloseConversationDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        conversationId={selectedConversation?.id || ""}
        protocolNumber={selectedConversation?.protocol_number || `PROT${selectedConversation?.id?.slice(0, 8).toUpperCase() || ''}`}
        onClose={handleConversationClosed}
      />
      
      <DebugConsole />
    </div>
  );
};

const Conversations = () => {
  return (
    <FeatureGate feature="chat">
      <ConversationsContent />
    </FeatureGate>
  );
};

export default Conversations;
