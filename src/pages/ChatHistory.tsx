import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MessageSquare,
  Calendar,
  Clock,
  User,
  CheckCheck,
  Check,
  Filter,
  Eye,
  X,
} from "lucide-react";
import { format, isToday, isYesterday, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type DateFilter = "today" | "yesterday" | "last7" | "last30" | "this_month" | "last_month" | "custom";

const ChatHistory = () => {
  const { companyId, isLoadingCompany } = useCompanyId();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "last7":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "last30":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "custom":
        return {
          start: customStart ? new Date(customStart) : startOfMonth(now),
          end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfDay(now) };
    }
  }, [dateFilter, customStart, customEnd]);

  // Fetch closed conversations
  const { data: closedConversations, isLoading } = useQuery({
    queryKey: ["chat-history", companyId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("conversations")
        .select("*")
        .eq("status", "closed")
        .gte("updated_at", dateRange.start.toISOString())
        .lte("updated_at", dateRange.end.toISOString())
        .order("updated_at", { ascending: false });

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !isLoadingCompany,
  });

  // Fetch profiles for assigned_to mapping
  const { data: profilesMap } = useQuery({
    queryKey: ["profiles-map-history", companyId],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, full_name");
      if (companyId) query = query.eq("company_id", companyId);
      const { data } = await query;
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.id] = p.full_name || "Sem nome"; });
      return map;
    },
    staleTime: 60000,
  });

  // Fetch messages for selected conversation
  const { data: conversationMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["history-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await (supabase
        .from("messages")
        .select("*") as any)
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedConversation?.id,
  });

  const filteredConversations = useMemo(() => {
    if (!closedConversations) return [];
    if (!searchTerm.trim()) return closedConversations;
    const term = searchTerm.toLowerCase();
    return closedConversations.filter(
      (c) =>
        c.contact_name?.toLowerCase().includes(term) ||
        c.contact_phone?.includes(term) ||
        c.protocol?.toLowerCase().includes(term)
    );
  }, [closedConversations, searchTerm]);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return `Hoje ${format(date, "HH:mm")}`;
    if (isYesterday(date)) return `Ontem ${format(date, "HH:mm")}`;
    return format(date, "dd/MM/yyyy HH:mm");
  };

  const handleViewMessages = (conv: any) => {
    setSelectedConversation(conv);
    setMessagesDialogOpen(true);
  };

  const getFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case "today": return "Hoje";
      case "yesterday": return "Ontem";
      case "last7": return "Últimos 7 dias";
      case "last30": return "Últimos 30 dias";
      case "this_month": return "Este mês";
      case "last_month": return "Mês anterior";
      case "custom": return "Personalizado";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Atendimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize todos os atendimentos encerrados
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {filteredConversations.length} atendimento{filteredConversations.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou protocolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="last7">Últimos 7 dias</SelectItem>
                  <SelectItem value="last30">Últimos 30 dias</SelectItem>
                  <SelectItem value="this_month">Este mês</SelectItem>
                  <SelectItem value="last_month">Mês anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date range */}
            {dateFilter === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-[150px]"
                />
                <span className="text-muted-foreground text-sm">até</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum atendimento encontrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Tente ajustar os filtros de busca ou período
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredConversations.map((conv) => (
            <Card
              key={conv.id}
              className="hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => handleViewMessages(conv)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(conv.contact_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {conv.contact_name || conv.contact_phone || "Desconhecido"}
                      </span>
                      {conv.protocol && (
                        <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                          #{conv.protocol}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{conv.contact_phone}</span>
                      {conv.assigned_to && profilesMap?.[conv.assigned_to] && (
                        <span className="text-[10px] text-primary/80 flex items-center gap-0.5">
                          <User className="w-3 h-3" />
                          {profilesMap[conv.assigned_to]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {conv.last_message || "Sem mensagens"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[11px]">{formatDate(conv.updated_at)}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Encerrado
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ver chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Messages dialog */}
      <Dialog open={messagesDialogOpen} onOpenChange={setMessagesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(selectedConversation?.contact_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="block">
                  {selectedConversation?.contact_name || selectedConversation?.contact_phone}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {selectedConversation?.contact_phone}
                  {selectedConversation?.protocol && ` • #${selectedConversation.protocol}`}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[60vh] px-1">
            <div className="space-y-1 py-2">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : !conversationMessages?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma mensagem encontrada
                </div>
              ) : (
                conversationMessages.map((msg: any) => {
                  const isAgent = msg.sender_type === "agent" || msg.sender_type === "system";
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex mb-1", isAgent ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] px-3 py-2 rounded-lg text-sm",
                          isAgent
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.media_url && (
                          <div className="mb-2 rounded overflow-hidden">
                            <img src={msg.media_url} alt="media" className="max-w-full max-h-48 rounded" />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className={cn("text-[10px]", isAgent ? "text-white/60" : "text-muted-foreground/60")}>
                            {format(new Date(msg.created_at), "dd/MM HH:mm")}
                          </span>
                          {isAgent && (
                            msg.status === "read" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                            ) : msg.status === "delivered" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-white/50" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-white/50" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatHistory;