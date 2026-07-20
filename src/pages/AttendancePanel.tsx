import { useState, useMemo, useEffect } from "react";
import { useConversations } from "@/hooks/useConversations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViewConversationDialog } from "@/components/conversations/ViewConversationDialog";
import {
  Bot,
  Users,
  MessageCircle,
  ArrowRightLeft,
  Trash2,
  FileText,
  XCircle,
  CheckCircle,
  Clock,
  Search,
  Tag,
  Coffee,
  Circle,
  Phone,
  Headphones,
  Sparkles,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type TabType = "agents" | "attendances";
type AgentStatus = "online" | "paused" | "offline" | "break";

interface UserProfile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  department_id: string | null;
  created_at: string | null;
  is_online: boolean | null;
  last_seen_at: string | null;
  status?: AgentStatus;
  active_conversations?: number;
}

export default function AttendancePanel() {
  const { user } = useAuth();
  const { conversations, deleteConversation, updateConversation } = useConversations();
  const { departments } = useDepartments();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("agents");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewConversationOpen, setViewConversationOpen] = useState(false);
  const [selectedAgentForTransfer, setSelectedAgentForTransfer] = useState<string>("");
  const [closingAll, setClosingAll] = useState(false);

  // Real-time subscription for conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('attendance-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Real-time subscription for profile status updates
  useEffect(() => {
    const channel = supabase
      .channel('attendance-profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['attendants'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch current user's company_id
  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch profiles - filter by company when user has one; admins (sem company) veem todos
  const { data: attendants = [] } = useQuery({
    queryKey: ["attendants", currentProfile?.company_id ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, created_at, is_online, last_seen_at, company_id")
        .order("created_at", { ascending: false });

      if (currentProfile?.company_id) {
        query = query.eq("company_id", currentProfile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with conversation counts and calculate online time
      return (data || []).map((profile) => {
        const activeConvs = conversations.filter(
          (c) => c.assigned_to === profile.id
        ).length;

        const isOnline = profile.is_online === true;
        const profileStatus: AgentStatus = isOnline ? "online" : "offline";

        return {
          id: profile.id,
          full_name: profile.full_name,
          company_name: null,
          department_id: null,
          created_at: profile.created_at,
          is_online: profile.is_online,
          last_seen_at: profile.last_seen_at,
          status: profileStatus,
          active_conversations: activeConvs,
        } as UserProfile;
      });
    },
    enabled: !!user?.id,
  });

  // Classify conversations
  const classifiedConversations = useMemo(() => {
    return conversations.map((conv) => {
      const convAny = conv as any;
      const flowState = convAny.flow_state;
      const hasFlowState = flowState && typeof flowState === "object" && Object.keys(flowState).length > 0;
      const hasAssignedAgent = !!conv.assigned_to;
      const attendanceType = (convAny.attendance_type || "").toLowerCase();

      const isAiAgent =
        attendanceType === "ai" ||
        attendanceType === "ia" ||
        (hasFlowState && flowState.waiting_for === "aiAgent");

      const isInFlow =
        !isAiAgent &&
        (attendanceType === "ura" ||
          attendanceType === "flow" ||
          (hasFlowState && !hasAssignedAgent));

      let classification: "in_flow" | "waiting" | "in_attendance" | "ai_agent" = "waiting";

      if (isAiAgent) {
        classification = "ai_agent";
      } else if (isInFlow) {
        classification = "in_flow";
      } else if (hasAssignedAgent && (attendanceType === "agent" || attendanceType === "human" || attendanceType === "")) {
        classification = "in_attendance";
      }

      return {
        ...conv,
        classification,
        aiAgentId: isAiAgent ? flowState?.ai_agent_id ?? convAny.ai_agent_id ?? null : null,
      };
    });
  }, [conversations]);


  // Filter conversations
  const filteredConversations = useMemo(() => {
    return classifiedConversations.filter((conv) => {
      // Filter by agent
      if (agentFilter !== "all") {
        if (agentFilter === "flow") {
          if (conv.classification !== "in_flow") return false;
        } else if (agentFilter === "waiting") {
          if (conv.classification !== "waiting") return false;
        } else if (conv.assigned_to !== agentFilter) {
          return false;
        }
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        const name = conv.contact_name?.toLowerCase() || "";
        const phone = conv.contact_phone || "";
        if (!name.includes(searchLower) && !phone.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [classifiedConversations, agentFilter, search]);

  // Count by classification
  const counts = useMemo(() => {
    return {
      in_flow: classifiedConversations.filter((c) => c.classification === "in_flow").length,
      waiting: classifiedConversations.filter((c) => c.classification === "waiting").length,
      in_attendance: classifiedConversations.filter((c) => c.classification === "in_attendance").length,
      ai_agent: classifiedConversations.filter((c) => c.classification === "ai_agent").length,
    };
  }, [classifiedConversations]);

  // Fetch AI agents for display
  const { data: aiAgents = [] } = useQuery({
    queryKey: ["agents-for-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const getAiAgentName = (agentId: string | null) => {
    if (!agentId) return "Assistente IA";
    const agent = aiAgents.find((a: any) => a.id === agentId);
    return agent?.name || "Assistente IA";
  };

  // Count agents by status
  const agentCounts = useMemo(() => {
    return {
      online: attendants.filter((a) => a.status === "online").length,
      paused: attendants.filter((a) => a.status === "paused").length,
      offline: attendants.filter((a) => a.status === "offline").length,
      break: attendants.filter((a) => a.status === "break").length,
    };
  }, [attendants]);

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return null;
    const agent = attendants.find((a) => a.id === agentId);
    return agent?.full_name || "Atendente";
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return "Sem setor";
    const dept = departments.find((d) => d.id === departmentId);
    return dept?.name || "Desconhecido";
  };

  const getFlowName = (flowState: any) => {
    if (!flowState || !flowState.flow_id) return "URA";
    return flowState.flow_name || "URA";
  };

  const getTimeOpen = (createdAt: string | null) => {
    if (!createdAt) return "N/A";
    return formatDistanceToNow(new Date(createdAt), {
      locale: ptBR,
      addSuffix: false,
    });
  };

  const getOnlineTime = (lastSeenAt: string | null, isOnline: boolean | null) => {
    if (!isOnline || !lastSeenAt) return "-";
    return formatDistanceToNow(new Date(lastSeenAt), {
      locale: ptBR,
      addSuffix: false,
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "break":
        return "bg-orange-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: AgentStatus) => {
    switch (status) {
      case "online":
        return "Online";
      case "paused":
        return "Pausado";
      case "break":
        return "Intervalo";
      case "offline":
        return "Offline";
      default:
        return "Desconhecido";
    }
  };

  const handleOpenConversation = (conv: any) => {
    // Admin abre popup de visualização somente leitura
    setSelectedConversation(conv);
    setViewConversationOpen(true);
  };

  const handleViewDetails = (conv: any) => {
    setSelectedConversation(conv);
    setDetailsDialogOpen(true);
  };

  const handleOpenTransfer = (conv: any) => {
    setSelectedConversation(conv);
    setTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedConversation || !selectedAgentForTransfer) return;

    try {
      await updateConversation.mutateAsync({
        id: selectedConversation.id,
        updates: { 
          assigned_agent: selectedAgentForTransfer,
          status: 'in_attendance', // CRÍTICO: Atualizar status para ir direto pro chat
          department_id: null, // Limpar departamento
          assigned_agent_id: null, // Limpar IA
          flow_state: null, // Limpar estado do fluxo
        },
      });
      toast.success("Atendimento transferido com sucesso!");
      setTransferDialogOpen(false);
      setSelectedAgentForTransfer("");
    } catch (error) {
      toast.error("Erro ao transferir atendimento");
    }
  };

  const handleDelete = async (convId: string) => {
    if (confirm("Tem certeza que deseja encerrar este atendimento?")) {
      try {
        await deleteConversation.mutateAsync(convId);
        toast.success("Atendimento encerrado");
      } catch (error) {
        toast.error("Erro ao encerrar atendimento");
      }
    }
  };

  const handleCloseAll = async () => {
    if (!confirm(`Tem certeza que deseja encerrar TODOS os ${filteredConversations.length} atendimentos?`)) {
      return;
    }

    setClosingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const conv of filteredConversations) {
        try {
          await deleteConversation.mutateAsync(conv.id);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast.warning(`${successCount} atendimentos encerrados, ${errorCount} falhas`);
      } else {
        toast.success(`${successCount} atendimentos encerrados com sucesso!`);
      }
    } finally {
      setClosingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "agents" ? "default" : "outline"}
            onClick={() => setActiveTab("agents")}
            className="gap-2"
          >
            <Headphones className="w-4 h-4" />
            Painel de Agentes
          </Button>
          <Button
            variant={activeTab === "attendances" ? "default" : "outline"}
            onClick={() => setActiveTab("attendances")}
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Painel de Atendimentos
          </Button>
        </div>

        {activeTab === "attendances" && (
          <div className="flex items-center gap-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCloseAll}
              disabled={closingAll || filteredConversations.length === 0}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              {closingAll ? "Encerrando..." : `Encerrar Todos (${filteredConversations.length})`}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar</span>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="flow">Na URA</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  {attendants.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-60"
              />
            </div>
          </div>
        )}
      </div>

      {/* Agents Panel */}
      {activeTab === "agents" && (
        <>
          {/* Agent status counts */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-green-500 text-green-500" />
              <span className="text-sm">Online: {agentCounts.online}</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="text-sm">Pausado: {agentCounts.paused}</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-orange-500 text-orange-500" />
              <span className="text-sm">Intervalo: {agentCounts.break}</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />
              <span className="text-sm">Offline: {agentCounts.offline}</span>
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atendente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atendimentos Ativos</TableHead>
                  <TableHead>Tempo Online</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum atendente cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  attendants.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(agent.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(agent.status || "offline")}`} />
                          </div>
                          <div>
                            <span className="font-medium">
                              {agent.full_name || "Sem nome"}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {agent.company_name || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {getDepartmentName(agent.department_id)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={`${
                            agent.status === "online" 
                              ? "bg-green-500/10 text-green-600 border-green-200" 
                              : agent.status === "paused"
                              ? "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                              : agent.status === "break"
                              ? "bg-orange-500/10 text-orange-600 border-orange-200"
                              : "bg-gray-500/10 text-gray-600 border-gray-200"
                          }`}
                        >
                          {getStatusLabel(agent.status || "offline")}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{agent.active_conversations || 0}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {getOnlineTime(agent.last_seen_at, agent.is_online)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Ver atendimentos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Attendances Panel */}
      {activeTab === "attendances" && (
        <>
          {/* Counts */}
          <div className="flex items-center justify-end gap-6">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Na URA: {counts.in_flow}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Com IA: {counts.ai_agent}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Aguardando: {counts.waiting}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Em atendimento: {counts.in_attendance}</span>
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Etiqueta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead className="w-12 text-center">Status</TableHead>
                  <TableHead>Aberto há</TableHead>
                  <TableHead>Atribuído há</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum atendimento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConversations.map((conv) => (
                    <TableRow key={conv.id}>
                      {/* Tag */}
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>

                      {/* Client */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(conv.contact_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium truncate max-w-[200px] block">
                              {conv.contact_name || conv.contact_phone || "Desconhecido"}
                            </span>
                            {conv.contact_phone && (
                              <span className="text-xs text-muted-foreground">
                                {conv.contact_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Agent */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {conv.classification === "ai_agent" ? (
                            <>
                              <Sparkles className="w-4 h-4 text-purple-500" />
                              <div>
                                <p className="font-medium text-sm text-purple-600">IA Atendendo</p>
                                <p className="text-xs text-muted-foreground">
                                  {getAiAgentName((conv as any).aiAgentId)}
                                </p>
                              </div>
                            </>
                          ) : conv.classification === "in_flow" ? (
                            <>
                              <Bot className="w-4 h-4 text-primary" />
                              <div>
                                <p className="font-medium text-sm">Na URA</p>
                                <p className="text-xs text-muted-foreground">
                                  {getFlowName((conv as any).flow_state)}
                                </p>
                              </div>
                            </>
                          ) : conv.assigned_to ? (
                            <>
                              <Users className="w-4 h-4 text-green-500" />
                              <span className="text-sm">
                                {getAgentName(conv.assigned_to)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Aguardando atribuição
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {conv.classification === "ai_agent" ? (
                          <Sparkles className="w-5 h-5 text-purple-500 mx-auto" />
                        ) : conv.classification === "in_flow" ? (
                          <Bot className="w-5 h-5 text-primary mx-auto" />
                        ) : conv.classification === "in_attendance" ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-500 mx-auto" />
                        )}
                      </TableCell>

                      {/* Time open */}
                      <TableCell className="text-sm">
                        {getTimeOpen(conv.created_at)}
                      </TableCell>

                      {/* Assigned time */}
                      <TableCell className="text-sm text-muted-foreground">
                        {conv.assigned_to ? getTimeOpen(conv.updated_at) : "-"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleViewDetails(conv)}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalhes</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleOpenConversation(conv)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver conversa</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleOpenTransfer(conv)}
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Transferir</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(conv.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Encerrar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Cliente:</p>
              <p className="font-medium">{selectedConversation?.user_name || selectedConversation?.user_phone}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Transferir para:</label>
              <Select value={selectedAgentForTransfer} onValueChange={setSelectedAgentForTransfer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o atendente" />
                </SelectTrigger>
                <SelectContent>
                  {attendants
                    .filter((a) => a.status === "online")
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                          {agent.full_name || "Sem nome"}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleTransfer} disabled={!selectedAgentForTransfer}>
                Transferir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento</DialogTitle>
          </DialogHeader>
          {selectedConversation && (
            <div className="space-y-4 pt-4">
              {(() => {
                const contactName = selectedConversation.contact_name || selectedConversation.user_name;
                const contactPhone = selectedConversation.contact_phone || selectedConversation.user_phone;
                const assignedId = selectedConversation.assigned_to || selectedConversation.assigned_agent;
                const agentName = selectedConversation.classification === "ai_agent"
                  ? getAiAgentName(selectedConversation.aiAgentId)
                  : getAgentName(assignedId);
                const lastMsg = selectedConversation.last_message || selectedConversation.last_message_preview;
                const platform = selectedConversation.platform || selectedConversation.channel || "WhatsApp";
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {getInitials(contactName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {contactName || "Desconhecido"}
                        </h3>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {contactPhone || "Sem telefone"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant="outline" className="mt-1">
                          {selectedConversation.classification === "in_flow"
                            ? "Na URA"
                            : selectedConversation.classification === "in_attendance"
                            ? "Em atendimento"
                            : selectedConversation.classification === "ai_agent"
                            ? "Com IA"
                            : "Aguardando"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Atendente</p>
                        <p className="font-medium mt-1">
                          {agentName || "Não atribuído"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Aberto há</p>
                        <p className="font-medium mt-1">
                          {getTimeOpen(selectedConversation.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Plataforma</p>
                        <p className="font-medium mt-1">{platform}</p>
                      </div>
                    </div>

                    {lastMsg && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Última mensagem</p>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{lastMsg}</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Fechar
                </Button>
                <Button variant="secondary" onClick={() => {
                  setDetailsDialogOpen(false);
                  handleOpenConversation(selectedConversation);
                }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Conversa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Conversation Dialog - Read Only */}
      <ViewConversationDialog
        open={viewConversationOpen}
        onOpenChange={setViewConversationOpen}
        conversation={selectedConversation}
        agentName={selectedConversation ? getAgentName(selectedConversation.assigned_agent) || undefined : undefined}
      />
    </div>
  );
}
