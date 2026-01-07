import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, MessageSquare } from "lucide-react";
import { ViewConversationDialog } from "@/components/conversations/ViewConversationDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDepartments } from "@/hooks/useDepartments";

const AttendanceReports = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchProtocol, setSearchProtocol] = useState("");
  const [filterQueue, setFilterQueue] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("today");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { departments } = useDepartments();

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('conversations')
        .select(`
          *,
          leads (name, phone)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply date filter - use updated_at to catch conversations with activity today
      const now = new Date();
      if (filterPeriod === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.or(`created_at.gte.${startOfDay},updated_at.gte.${startOfDay}`);
      } else if (filterPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.or(`created_at.gte.${weekAgo},updated_at.gte.${weekAgo}`);
      } else if (filterPeriod === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.or(`created_at.gte.${monthAgo},updated_at.gte.${monthAgo}`);
      }

      if (filterQueue !== 'all') {
        query = query.eq('department_id', filterQueue);
      }

      const { data, error } = await query;
      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar relatório");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [filterQueue, filterType, filterPeriod]);

  const filteredConversations = conversations.filter(conv => {
    const matchesNumber = !searchNumber || 
      conv.leads?.phone?.includes(searchNumber) ||
      conv.user_phone?.includes(searchNumber);
    const matchesProtocol = !searchProtocol ||
      conv.id.toLowerCase().includes(searchProtocol.toLowerCase());
    return matchesNumber && matchesProtocol;
  });

  const getDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (conv: any) => {
    // Se tem closed_at, está fechado independente do status
    if (conv.closed_at) {
      return <Badge className="bg-gray-100 text-gray-700 border-0">FECHADO</Badge>;
    }
    
    switch (conv.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-0">ATIVO</Badge>;
      case 'in_attendance':
        return <Badge className="bg-blue-100 text-blue-700 border-0">EM ATENDIMENTO</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-700 border-0">FECHADO</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-100 text-yellow-700 border-0">AGUARDANDO</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-0">PENDENTE</Badge>;
      default:
        return <Badge variant="secondary">{conv.status?.toUpperCase() || 'N/A'}</Badge>;
    }
  };

  const hasRealMessages = (conv: any) => {
    return conv.last_message && conv.last_message !== "Conversa iniciada";
  };

  const exportReport = () => {
    const csvContent = "ID,Cliente,Telefone,Resultado,Duração,Status,Data,Data Fechamento\n" +
      filteredConversations.map(conv => {
        const name = conv.leads?.name || conv.user_name || 'Sem nome';
        const phone = conv.leads?.phone || conv.user_phone || '';
        const duration = getDuration(conv.created_at, conv.closed_at);
        const date = format(new Date(conv.created_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR });
        const closedDate = conv.closed_at 
          ? format(new Date(conv.closed_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR }) 
          : '';
        return `"${conv.id.slice(0, 5)}","${name}","${phone}","${conv.last_message || ''}","${duration}","${conv.status}","${date}","${closedDate}"`;
      }).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_atendimentos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Relatório exportado!");
  };

  const openViewDialog = (conv: any) => {
    setSelectedConversation(conv);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Relatório de atendimentos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" onClick={fetchConversations} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input 
            placeholder="Número" 
            className="w-32"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
          />
          <Input 
            placeholder="Protocolo" 
            className="w-32"
            value={searchProtocol}
            onChange={(e) => setSearchProtocol(e.target.value)}
          />
          <Select value={filterQueue} onValueChange={setFilterQueue}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fila" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as filas</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="human">Humano</SelectItem>
              <SelectItem value="ai">IA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="w-24">Duração</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead className="w-40">Data</TableHead>
              <TableHead className="w-40">Data de fechamento</TableHead>
              <TableHead className="w-32 text-right">Funções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Carregando...</p>
                </TableCell>
              </TableRow>
            ) : filteredConversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Nenhum atendimento encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredConversations.map((conv, index) => (
                <TableRow key={conv.id}>
                  <TableCell className="font-mono text-xs text-gray-500">
                    {(29712 + index).toString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                          {(conv.leads?.name || conv.user_name || '?').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm truncate max-w-[150px]">
                          {conv.leads?.name || conv.user_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conv.leads?.phone || conv.user_phone || ''}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`w-3 h-3 rounded-full ${
                      conv.status === 'closed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 max-w-[200px] truncate">
                    {conv.last_message || 'inatividade'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {getDuration(conv.created_at, conv.closed_at)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(conv)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {format(new Date(conv.created_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {conv.closed_at 
                      ? format(new Date(conv.closed_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR })
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 ${!hasRealMessages(conv) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-primary'}`}
                        onClick={() => openViewDialog(conv)}
                        title={!hasRealMessages(conv) ? "Sem mensagens" : "Ver histórico"}
                        disabled={!hasRealMessages(conv)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t text-sm text-gray-500">
          Contagem: {filteredConversations.length}
        </div>
      </Card>

      {/* View Conversation Dialog */}
      <ViewConversationDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        conversation={selectedConversation}
      />
    </div>
  );
};

export default AttendanceReports;
