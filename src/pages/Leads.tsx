import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Download, Upload, Plus, Edit, Archive, Trash2, Loader2 } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";

const tagColors: Record<string, string> = {
  "VIP": "bg-primary text-white",
  "Urgente": "bg-warning text-white",
  "Hot Lead": "bg-destructive text-white",
};

const statusColors: Record<string, string> = {
  hot: "bg-destructive/10 text-destructive",
  warm: "bg-warning/10 text-warning",
  cold: "bg-muted text-muted-foreground",
};

const LeadsContent = () => {
  const [filter, setFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    origin: 'whatsapp',
    status: 'warm',
    tags: [] as string[]
  });

  const handleEdit = (lead: any) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone,
      origin: lead.origin,
      status: lead.status,
      tags: lead.tags || []
    });
    setDialogOpen(true);
  };

  const handleArchive = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    updateLead.mutate({
      id: leadId,
      updates: { status: 'cold' }
    });
    toast.success(`${lead?.name} foi arquivado`);
  };

  const handleDelete = (leadId: string) => {
    if (confirm('Deseja realmente excluir este lead?')) {
      deleteLead.mutate(leadId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingLead) {
      await updateLead.mutateAsync({
        id: editingLead.id,
        updates: formData
      });
    } else {
      await createLead.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    setEditingLead(null);
    setFormData({ name: '', phone: '', origin: 'whatsapp', status: 'warm', tags: [] });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://lvldqyyzhlygwbgcdqcg.supabase.co/functions/v1/leads-export`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        }
      );

      if (!response.ok) throw new Error('Erro ao exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Leads exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar leads');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `https://lvldqyyzhlygwbgcdqcg.supabase.co/functions/v1/leads-import`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          },
          body: formData
        }
      );

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error);

      toast.success(result.message);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar leads');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = search === "" || 
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search);
    
    const matchesFilter = filter === "all" || lead.status === filter;
    const matchesOrigin = originFilter === "all" || lead.origin === originFilter;
    
    return matchesSearch && matchesFilter && matchesOrigin;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Leads</h1>
          <p className="text-muted-foreground mt-1">Organize e acompanhe seus leads</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <Button 
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Importar CSV
          </Button>
          <Button 
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingLead(null);
                  setFormData({ name: '', phone: '', origin: 'whatsapp', status: 'warm', tags: [] });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
                <DialogDescription>Preencha as informações do lead</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do lead"
                    required
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label>Origem</Label>
                  <Select value={formData.origin} onValueChange={(v) => setFormData({ ...formData, origin: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingLead ? 'Atualizar' : 'Criar'} Lead
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={originFilter} onValueChange={setOriginFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="site">Site</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead, i) => (
                <TableRow key={lead.id} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                          {lead.avatar || lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{lead.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{lead.origin}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status]}>
                      {lead.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {lead.tags?.map((tag) => (
                        <Badge key={tag} className={tagColors[tag] || "bg-muted"}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(lead)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleArchive(lead.id)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(lead.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const Leads = () => {
  return (
    <FeatureGate feature="leads_management">
      <LeadsContent />
    </FeatureGate>
  );
};

export default Leads;