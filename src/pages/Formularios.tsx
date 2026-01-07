import { useState } from 'react';
import { useFormResponses, FormResponse } from '@/hooks/useFormResponses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  FileText, 
  Phone, 
  User, 
  Calendar,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loading } from '@/components/ui/loading';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  novo: { label: 'Aguardando Contato', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <Clock className="h-3 w-3" />, description: 'Ninguém entrou em contato ainda' },
  contatado: { label: 'Contatado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <MessageSquare className="h-3 w-3" />, description: 'Equipe já entrou em contato' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <MessageSquare className="h-3 w-3" />, description: 'Atendimento em andamento' },
  convertido: { label: 'Convertido', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="h-3 w-3" />, description: 'Cliente convertido' },
  perdido: { label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="h-3 w-3" />, description: 'Lead não convertido' },
};

const Formularios = () => {
  const { formResponses, isLoading, updateFormResponse, deleteFormResponse } = useFormResponses();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const filteredResponses = formResponses.filter(response => {
    const matchesSearch = 
      response.phone.toLowerCase().includes(search.toLowerCase()) ||
      (response.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      JSON.stringify(response.collected_data).toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (response: FormResponse) => {
    setSelectedResponse(response);
    setNotes(response.notes || '');
    setDetailsOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateFormResponse.mutateAsync({ id, updates: { status: newStatus } });
  };

  const handleSaveNotes = async () => {
    if (selectedResponse) {
      await updateFormResponse.mutateAsync({ 
        id: selectedResponse.id, 
        updates: { notes } 
      });
      setSelectedResponse({ ...selectedResponse, notes });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      await deleteFormResponse.mutateAsync(id);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Formulários</h1>
        <p className="text-muted-foreground mt-1">
          Respostas coletadas dos leads durante os fluxos de automação
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formResponses.length}</p>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Clock className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formResponses.filter(r => r.status === 'novo').length}
                </p>
                <p className="text-sm text-orange-400 font-medium">Aguardando Contato</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <MessageSquare className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formResponses.filter(r => r.status === 'contatado').length}
                </p>
                <p className="text-sm text-muted-foreground">Contatados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formResponses.filter(r => r.status === 'convertido').length}
                </p>
                <p className="text-sm text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por telefone, nome ou dados..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-background border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="novo">Aguardando Contato</SelectItem>
                <SelectItem value="contatado">Contatados</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="convertido">Convertidos</SelectItem>
                <SelectItem value="perdido">Perdidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {filteredResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Nenhum formulário encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Os leads capturados pelos fluxos aparecerão aqui
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Telefone</TableHead>
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Dados Coletados</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{response.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{response.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-muted-foreground">
                        {Object.keys(response.collected_data).length} campos coletados
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(response.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={response.status}
                        onValueChange={(value) => handleStatusChange(response.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8 bg-transparent border-0 p-0">
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig[response.status]?.color || statusConfig.novo.color} flex items-center gap-1`}
                          >
                            {statusConfig[response.status]?.icon}
                            {statusConfig[response.status]?.label || response.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(response)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openWhatsApp(response.phone)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Abrir WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(response.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Lead
            </DialogTitle>
          </DialogHeader>
          
          {selectedResponse && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Telefone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{selectedResponse.phone}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openWhatsApp(selectedResponse.phone)}
                      className="ml-auto"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{selectedResponse.name || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Collected Data */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-medium">Dados Coletados</label>
                <Card className="bg-muted/50 border-border">
                  <CardContent className="pt-4">
                    {Object.keys(selectedResponse.collected_data).length === 0 ? (
                      <p className="text-muted-foreground text-sm">Nenhum dado coletado</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(selectedResponse.collected_data).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">
                              {key}
                            </label>
                            <p className="text-foreground font-medium break-words">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground font-medium">Observações</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre este lead..."
                  className="bg-background border-border min-h-[100px]"
                />
                <Button 
                  onClick={handleSaveNotes}
                  disabled={notes === selectedResponse.notes}
                  size="sm"
                >
                  Salvar Observações
                </Button>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                <span>
                  Capturado em: {format(new Date(selectedResponse.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
                <Badge 
                  variant="outline" 
                  className={statusConfig[selectedResponse.status]?.color || statusConfig.novo.color}
                >
                  {statusConfig[selectedResponse.status]?.label || selectedResponse.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Formularios;
