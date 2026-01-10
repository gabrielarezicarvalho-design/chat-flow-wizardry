import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useConnections } from "@/hooks/useConnections";
import { useLeads } from "@/hooks/useLeads";
import { 
  Target, 
  Users, 
  MessageSquare, 
  Play, 
  Pause, 
  Plus,
  Trash2,
  Edit2,
  Upload,
  Database,
  Webhook,
  Mail,
  Copy,
  Rocket,
} from "lucide-react";

interface SequenceMessage {
  id: string;
  dayOffset: number;
  message: string;
  enabled: boolean;
}

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused";
  leadSource: "leads" | "import" | "webhook";
  connectionId: string | null;
  sequence: SequenceMessage[];
  leadsContacted: number;
  responses: number;
  conversions: number;
  lastRun: string;
  selectedLeadIds?: string[];
  webhookUrl?: string;
}

const AutoProspecting = () => {
  const { connections } = useConnections();
  const { leads } = useLeads();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  const [campaignName, setCampaignName] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [leadSource, setLeadSource] = useState<"leads" | "import" | "webhook">("leads");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [sequence, setSequence] = useState<SequenceMessage[]>([
    { id: "1", dayOffset: 0, message: "", enabled: true },
  ]);

  const generateWebhookUrl = () => {
    const baseUrl = window.location.origin;
    const token = Math.random().toString(36).substring(2, 15);
    return `${baseUrl}/api/webhook/prospecting/${token}`;
  };

  const resetForm = () => {
    setCampaignName("");
    setConnectionId("");
    setLeadSource("leads");
    setSelectedLeadIds([]);
    setSequence([{ id: "1", dayOffset: 0, message: "", enabled: true }]);
  };

  const addSequenceMessage = () => {
    const lastDay = sequence.length > 0 
      ? Math.max(...sequence.map(s => s.dayOffset))
      : -1;
    
    setSequence([
      ...sequence,
      { 
        id: Date.now().toString(), 
        dayOffset: lastDay + 3, 
        message: "", 
        enabled: true 
      }
    ]);
  };

  const removeSequenceMessage = (id: string) => {
    if (sequence.length <= 1) {
      toast.error("A campanha precisa ter pelo menos uma mensagem");
      return;
    }
    setSequence(sequence.filter(s => s.id !== id));
  };

  const updateSequenceMessage = (id: string, field: keyof SequenceMessage, value: any) => {
    setSequence(sequence.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleCreateCampaign = () => {
    if (!campaignName.trim()) {
      toast.error("Nome da campanha é obrigatório");
      return;
    }
    if (!connectionId) {
      toast.error("Selecione uma conexão WhatsApp");
      return;
    }
    if (sequence.some(s => s.enabled && !s.message.trim())) {
      toast.error("Todas as mensagens ativas devem ter conteúdo");
      return;
    }
    
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: campaignName,
      status: "paused",
      leadSource,
      connectionId,
      sequence,
      leadsContacted: 0,
      responses: 0,
      conversions: 0,
      lastRun: new Date().toISOString(),
      selectedLeadIds,
      webhookUrl: leadSource === "webhook" ? generateWebhookUrl() : undefined,
    };
    
    setCampaigns([...campaigns, newCampaign]);
    resetForm();
    setIsCreateDialogOpen(false);
    toast.success("Campanha criada com sucesso!");
  };

  const handleEditCampaign = () => {
    if (!selectedCampaign || !campaignName.trim()) {
      toast.error("Nome da campanha é obrigatório");
      return;
    }
    
    setCampaigns(campaigns.map(c => 
      c.id === selectedCampaign.id 
        ? { 
            ...c, 
            name: campaignName, 
            leadSource,
            connectionId,
            sequence,
            selectedLeadIds,
          }
        : c
    ));
    setIsEditDialogOpen(false);
    setSelectedCampaign(null);
    resetForm();
    toast.success("Campanha atualizada com sucesso!");
  };

  const handleDeleteCampaign = () => {
    if (!selectedCampaign) return;
    
    setCampaigns(campaigns.filter(c => c.id !== selectedCampaign.id));
    setIsDeleteDialogOpen(false);
    setSelectedCampaign(null);
    toast.success("Campanha excluída com sucesso!");
  };

  const handleToggleStatus = (campaign: Campaign) => {
    if (!campaign.connectionId) {
      toast.error("Configure uma conexão WhatsApp antes de ativar");
      return;
    }
    
    const newStatus = campaign.status === "active" ? "paused" : "active";
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id 
        ? { ...c, status: newStatus, lastRun: new Date().toISOString() }
        : c
    ));
    toast.success(`Campanha ${newStatus === "active" ? "ativada" : "pausada"} com sucesso!`);
  };

  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setCampaignName(campaign.name);
    setConnectionId(campaign.connectionId || "");
    setLeadSource(campaign.leadSource);
    setSelectedLeadIds(campaign.selectedLeadIds || []);
    setSequence(campaign.sequence);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL do webhook copiada!");
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    setSelectedLeadIds(leads.map(l => l.id));
  };

  const clearLeadSelection = () => {
    setSelectedLeadIds([]);
  };

  const getLeadSourceLabel = (source: string) => {
    switch (source) {
      case "leads": return "Leads do Sistema";
      case "import": return "Planilha";
      case "webhook": return "Webhook";
      default: return source;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            Prospecção Automática
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure campanhas com sequências de mensagens programadas
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Empty State or Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma campanha criada</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Crie sua primeira campanha de prospecção automática para enviar sequências de mensagens programadas aos seus leads.
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      campaign.status === "active" 
                        ? "bg-green-500/10" 
                        : "bg-muted"
                    }`}>
                      {campaign.status === "active" ? (
                        <Play className="h-5 w-5 text-green-500" />
                      ) : (
                        <Pause className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                          {campaign.status === "active" ? "Ativa" : "Pausada"}
                        </Badge>
                        <Badge variant="outline">
                          {getLeadSourceLabel(campaign.leadSource)}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Mail className="h-3 w-3" />
                          {campaign.sequence.filter(s => s.enabled).length} msgs
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center px-3">
                      <p className="text-xl font-bold">{campaign.leadsContacted}</p>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-xl font-bold text-green-500">{campaign.responses}</p>
                      <p className="text-xs text-muted-foreground">Respostas</p>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleStatus(campaign)}
                        title={campaign.status === "active" ? "Pausar" : "Ativar"}
                      >
                        {campaign.status === "active" ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(campaign)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openDeleteDialog(campaign)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>
              Configure uma campanha de prospecção automática
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome da campanha</Label>
              <Input
                placeholder="Ex: Prospecção de Clientes"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Conexão */}
            <div className="space-y-2">
              <Label>Conexão WhatsApp</Label>
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.instance_name} {conn.status === "connected" && "✓"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origem dos Leads */}
            <div className="space-y-3">
              <Label>Origem dos Leads</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={leadSource === "leads" ? "default" : "outline"}
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => setLeadSource("leads")}
                >
                  <Database className="h-5 w-5" />
                  <span className="text-xs">Leads do Sistema</span>
                </Button>
                <Button
                  type="button"
                  variant={leadSource === "import" ? "default" : "outline"}
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => setLeadSource("import")}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Importar Planilha</span>
                </Button>
                <Button
                  type="button"
                  variant={leadSource === "webhook" ? "default" : "outline"}
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => setLeadSource("webhook")}
                >
                  <Webhook className="h-5 w-5" />
                  <span className="text-xs">Webhook/API</span>
                </Button>
              </div>
            </div>

            {/* Leads Selection */}
            {leadSource === "leads" && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>Selecionar Leads ({leads.length} disponíveis)</Label>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={selectAllLeads}>
                    Selecionar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearLeadSelection}>
                    Limpar
                  </Button>
                </div>
                <ScrollArea className="h-32 border rounded-md p-2 bg-background">
                  {leads.length > 0 ? (
                    <div className="space-y-1">
                      {leads.slice(0, 50).map((lead) => (
                        <div 
                          key={lead.id} 
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleLeadSelection(lead.id)}
                        >
                          <Checkbox checked={selectedLeadIds.includes(lead.id)} />
                          <span className="text-sm">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">{lead.phone}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum lead cadastrado
                    </p>
                  )}
                </ScrollArea>
                <p className="text-sm text-muted-foreground">
                  {selectedLeadIds.length} lead(s) selecionado(s)
                </p>
              </div>
            )}

            {leadSource === "import" && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>Importar Planilha</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-background">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste uma planilha Excel ou CSV
                  </p>
                  <Button variant="outline" size="sm">
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>
            )}

            {leadSource === "webhook" && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>Webhook/API</Label>
                <p className="text-sm text-muted-foreground">
                  A URL será gerada após criar a campanha
                </p>
              </div>
            )}

            {/* Sequência de Mensagens */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sequência de Mensagens</Label>
                <Button variant="outline" size="sm" onClick={addSequenceMessage} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-3">
                {sequence.map((msg, index) => (
                  <div key={msg.id} className="border rounded-lg p-4 space-y-3 bg-background">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={msg.enabled ? "default" : "secondary"}>
                          {index === 0 ? "Dia 0 (Imediato)" : `Dia ${msg.dayOffset}`}
                        </Badge>
                        <Switch
                          checked={msg.enabled}
                          onCheckedChange={(checked) => updateSequenceMessage(msg.id, "enabled", checked)}
                        />
                      </div>
                      {index > 0 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeSequenceMessage(msg.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    
                    {index > 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Enviar após</Label>
                        <Input
                          type="number"
                          min={1}
                          value={msg.dayOffset}
                          onChange={(e) => updateSequenceMessage(msg.id, "dayOffset", parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">dias</span>
                      </div>
                    )}
                    
                    <Textarea
                      placeholder="Digite a mensagem... Use {nome} para personalizar"
                      value={msg.message}
                      onChange={(e) => updateSequenceMessage(msg.id, "message", e.target.value)}
                      rows={3}
                      disabled={!msg.enabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCampaign}>
              Criar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Campanha</DialogTitle>
            <DialogDescription>
              Atualize as informações da campanha
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nome da campanha</Label>
              <Input
                placeholder="Ex: Prospecção de Clientes"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label>Conexão WhatsApp</Label>
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.instance_name} {conn.status === "connected" && "✓"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCampaign?.webhookUrl && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>URL do Webhook</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={selectedCampaign.webhookUrl} 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyWebhookUrl(selectedCampaign.webhookUrl!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sequência de Mensagens</Label>
                <Button variant="outline" size="sm" onClick={addSequenceMessage} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-3">
                {sequence.map((msg, index) => (
                  <div key={msg.id} className="border rounded-lg p-4 space-y-3 bg-background">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={msg.enabled ? "default" : "secondary"}>
                          {index === 0 ? "Dia 0 (Imediato)" : `Dia ${msg.dayOffset}`}
                        </Badge>
                        <Switch
                          checked={msg.enabled}
                          onCheckedChange={(checked) => updateSequenceMessage(msg.id, "enabled", checked)}
                        />
                      </div>
                      {index > 0 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeSequenceMessage(msg.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    
                    {index > 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Enviar após</Label>
                        <Input
                          type="number"
                          min={1}
                          value={msg.dayOffset}
                          onChange={(e) => updateSequenceMessage(msg.id, "dayOffset", parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">dias</span>
                      </div>
                    )}
                    
                    <Textarea
                      placeholder="Digite a mensagem..."
                      value={msg.message}
                      onChange={(e) => updateSequenceMessage(msg.id, "message", e.target.value)}
                      rows={3}
                      disabled={!msg.enabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCampaign}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedCampaign?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AutoProspecting;
