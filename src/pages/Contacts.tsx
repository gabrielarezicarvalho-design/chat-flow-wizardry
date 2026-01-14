import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Search, Users, Download, Upload, Tag, RefreshCw, Plus, 
  Pencil, X, ChevronLeft, ChevronRight, Check, Loader2
} from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useConnections } from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const ITEMS_PER_PAGE = 10;

const Contacts = () => {
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads();
  const { connections } = useConnections();
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  });
  const [applyingTag, setApplyingTag] = useState<string | null>(null);
  const [tagPopoverOpen, setTagPopoverOpen] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch available tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  const activeConnection = connections.find(c => c.status === 'connected');

  const filteredLeads = leads.filter((lead) =>
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.tags && lead.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSyncFromWhatsApp = async () => {
    if (!activeConnection) {
      toast.error("Nenhuma conexão ativa encontrada");
      return;
    }

    const connAny = activeConnection as any;
    if (!connAny.token) {
      toast.error("Conexão sem token");
      return;
    }

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('wa-contacts', {
        body: {
          action: 'sync',
          connectionId: activeConnection.id,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${data.added} contatos sincronizados! (${data.skipped} já existentes)`);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      } else {
        toast.error(data?.error || "Erro ao sincronizar");
      }
    } catch (err) {
      console.error("Error syncing:", err);
      toast.error("Erro ao sincronizar contatos");
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenDialog = (lead?: any) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        notes: lead.notes || ""
      });
    } else {
      setEditingLead(null);
      setFormData({ name: "", phone: "", email: "", notes: "" });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    try {
      if (editingLead) {
        await updateLead.mutateAsync({
          id: editingLead.id,
          updates: formData
        });
      } else {
        await createLead.mutateAsync({
          ...formData,
          source: "Manual"
        });
      }
      setDialogOpen(false);
      setFormData({ name: "", phone: "", email: "", notes: "" });
      setEditingLead(null);
    } catch (err) {
      console.error("Error saving contact:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este contato?")) return;
    try {
      await deleteLead.mutateAsync(id);
    } catch (err) {
      console.error("Error deleting contact:", err);
    }
  };

  const handleToggleTag = async (lead: any, tagName: string) => {
    const currentTags = lead.tags || [];
    const hasTag = currentTags.includes(tagName);
    const newTags = hasTag 
      ? currentTags.filter((t: string) => t !== tagName)
      : [...currentTags, tagName];

    setApplyingTag(`${lead.id}-${tagName}`);

    try {
      // Update local first
      await updateLead.mutateAsync({
        id: lead.id,
        updates: { tags: newTags }
      });

      // Sync with WhatsApp if connected
      if (activeConnection && lead.phone) {
        const connAny = activeConnection as any;
        if (connAny.token) {
          const tag = availableTags.find((t: any) => t.name === tagName);
          
          if (tag && !hasTag) {
            // Add label to contact in WhatsApp
            await supabase.functions.invoke('wa-labels', {
              body: {
                action: 'add_to_contact',
                connectionId: activeConnection.id,
                labelId: tag.id,
                labelName: tagName,
                phone: lead.phone
              }
            });
          }
        }
      }

      toast.success(hasTag ? `Etiqueta "${tagName}" removida` : `Etiqueta "${tagName}" aplicada`);
    } catch (err) {
      console.error("Error toggling tag:", err);
      toast.error("Erro ao atualizar etiqueta");
    } finally {
      setApplyingTag(null);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate pagination numbers
  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground">
            {leads.length} contatos
            {activeConnection && ` • Sincronizado com: ${activeConnection.instance_name}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeConnection && (
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleSyncFromWhatsApp}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar WhatsApp'}
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Importar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" />
                Adicionar Contato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLead ? "Editar Contato" : "Novo Contato"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Nome do contato"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    placeholder="5511999999999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    placeholder="Notas sobre o contato"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingLead ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos ou etiquetas..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* Contacts Table */}
      {filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum contato encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {leads.length === 0 
              ? "Adicione contatos ou sincronize do WhatsApp"
              : "Nenhum contato corresponde à busca"
            }
          </p>
          <div className="flex gap-2 justify-center">
            {activeConnection && leads.length === 0 && (
              <Button variant="outline" onClick={handleSyncFromWhatsApp} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar do WhatsApp
              </Button>
            )}
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Contato
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Etiquetas</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead, index) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">
                      {lead.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.phone}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">
                      {lead.email || "-"}
                    </TableCell>
                    <TableCell>
                      <Popover 
                        open={tagPopoverOpen === lead.id} 
                        onOpenChange={(open) => setTagPopoverOpen(open ? lead.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-1 min-w-[80px] justify-start"
                          >
                            {lead.tags && lead.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {lead.tags.slice(0, 2).map((tag: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {lead.tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{lead.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                Adicionar
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-1">
                            <p className="text-sm font-medium px-2 py-1">Etiquetas</p>
                            {availableTags.length === 0 ? (
                              <p className="text-sm text-muted-foreground px-2 py-2">
                                Nenhuma etiqueta disponível. Crie etiquetas em Segmentação.
                              </p>
                            ) : (
                              availableTags.map((tag: any) => {
                                const isSelected = lead.tags?.includes(tag.name);
                                const isLoading = applyingTag === `${lead.id}-${tag.name}`;
                                
                                return (
                                  <div
                                    key={tag.id}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                                    onClick={() => !isLoading && handleToggleTag(lead, tag.name)}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Checkbox checked={isSelected} />
                                    )}
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: tag.color || '#6b7280' }}
                                    />
                                    <span className="text-sm flex-1">{tag.name}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {lead.source || 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(lead)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(lead.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {getPaginationNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <Button
                      key={idx}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground">...</span>
                  )
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Contacts;
