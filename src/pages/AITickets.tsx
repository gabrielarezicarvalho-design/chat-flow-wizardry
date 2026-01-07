import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Ticket, 
  Clock, 
  User, 
  Phone, 
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  Bot,
  Trash2
} from 'lucide-react';
import { useAITickets, AITicket } from '@/hooks/useAITickets';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AITickets = () => {
  const { tickets, isLoading, updateTicket, resolveTicket, deleteTicket } = useAITickets();
  const [selectedTicket, setSelectedTicket] = useState<AITicket | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pendente</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Resolvido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getDissatisfactionBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 gap-1"><AlertTriangle className="w-3 h-3" /> Média</Badge>;
      case 'low':
        return <Badge className="bg-green-500 gap-1">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.contact_phone.includes(searchTerm) ||
      ticket.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingTickets = filteredTickets.filter(t => t.status === 'pending');
  const inProgressTickets = filteredTickets.filter(t => t.status === 'in_progress');
  const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved');

  const handleStartProgress = (ticket: AITicket) => {
    updateTicket.mutate({ id: ticket.id, updates: { status: 'in_progress' } });
  };

  const handleResolve = () => {
    if (selectedTicket) {
      resolveTicket.mutate({ id: selectedTicket.id, notes: resolveNotes });
      setResolveDialogOpen(false);
      setSelectedTicket(null);
      setResolveNotes('');
    }
  };

  const TicketCard = ({ ticket }: { ticket: AITicket }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-medium">{ticket.contact_name || 'Cliente'}</span>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{ticket.contact_phone}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="line-clamp-2">{ticket.reason}</span>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Insatisfação: </span>
            {getDissatisfactionBadge(ticket.dissatisfaction_level)}
          </div>

          {ticket.best_contact_time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Melhor horário: {ticket.best_contact_time}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

        {ticket.status !== 'resolved' && (
          <div className="flex gap-2 mt-4">
            {ticket.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleStartProgress(ticket); }}
              >
                Iniciar Atendimento
              </Button>
            )}
            <Button 
              size="sm" 
              variant="default"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedTicket(ticket);
                setResolveDialogOpen(true);
              }}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Resolver
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O chamado será permanentemente excluído.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTicket.mutate(ticket.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {ticket.status === 'resolved' && (
          <div className="flex gap-2 mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O chamado será permanentemente excluído.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTicket.mutate(ticket.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Chamados IA</h1>
            <p className="text-muted-foreground">Chamados abertos automaticamente pela IA</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar chamados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Ticket className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTickets.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressTickets.length}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedTickets.length}</p>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pendentes
            {pendingTickets.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingTickets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            Em Andamento
            {inProgressTickets.length > 0 && (
              <Badge className="bg-yellow-500 ml-1">{inProgressTickets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum chamado pendente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          {inProgressTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum chamado em andamento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {resolvedTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum chamado resolvido</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resolvedTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket && !resolveDialogOpen} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Detalhes do Chamado
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                {getDissatisfactionBadge(selectedTicket.dissatisfaction_level)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <p className="font-medium">{selectedTicket.contact_name || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Telefone</label>
                  <p className="font-medium">{selectedTicket.contact_phone}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Motivo</label>
                <p className="font-medium">{selectedTicket.reason}</p>
              </div>

              {selectedTicket.ai_summary && (
                <div>
                  <label className="text-sm text-muted-foreground">Resumo da IA</label>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedTicket.ai_summary}</p>
                </div>
              )}

              {selectedTicket.best_contact_time && (
                <div>
                  <label className="text-sm text-muted-foreground">Melhor horário para contato</label>
                  <p className="font-medium">{selectedTicket.best_contact_time}</p>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground">Criado em</label>
                <p className="font-medium">
                  {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {selectedTicket.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">Observações</label>
                  <p className="text-sm">{selectedTicket.notes}</p>
                </div>
              )}

              {selectedTicket.status !== 'resolved' && (
                <div className="flex gap-2 pt-4">
                  {selectedTicket.status === 'pending' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStartProgress(selectedTicket)}
                    >
                      Iniciar Atendimento
                    </Button>
                  )}
                  <Button 
                    onClick={() => setResolveDialogOpen(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolver Chamado
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Chamado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Observações da resolução</label>
              <Textarea
                placeholder="Descreva como o chamado foi resolvido..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResolve}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AITickets;
