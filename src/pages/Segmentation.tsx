import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Tags, 
  Plus, 
  Search, 
  Users, 
  Filter,
  Trash2,
  Edit,
  Target,
  History,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Megaphone,
  RefreshCw,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useConnections } from "@/hooks/useConnections";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  filters: SegmentFilter[];
  contactCount: number;
}

interface SegmentFilter {
  type: "tag" | "campaign_status" | "last_contact" | "response_type";
  operator: "is" | "is_not" | "contains" | "before" | "after";
  value: string;
}

const Segmentation = () => {
  const queryClient = useQueryClient();
  const { connections } = useConnections();
  const [searchTerm, setSearchTerm] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#10b981");
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterCampaignStatus, setFilterCampaignStatus] = useState<string>("all");
  const [isApplyTagOpen, setIsApplyTagOpen] = useState(false);
  const [selectedTagToApply, setSelectedTagToApply] = useState<string>("");
  const [syncingLabels, setSyncingLabels] = useState(false);

  const activeConnection = connections.find(c => c.status === 'connected');

  // Fetch tags
  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Fetch leads/contacts
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["leads-segmentation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch campaigns for history
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-segmentation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch campaign responses
  const { data: responses = [] } = useQuery({
    queryKey: ["responses-segmentation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_responses")
        .select("*");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Sync labels from WhatsApp
  const handleSyncLabels = async () => {
    if (!activeConnection) {
      toast.error("Nenhuma conexão ativa. Conecte ao WhatsApp primeiro.");
      return;
    }

    setSyncingLabels(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('wa-labels', {
        body: {
          action: 'sync',
          connectionId: activeConnection.id,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ["tags"] });
        queryClient.invalidateQueries({ queryKey: ["leads-segmentation"] });
        if (data.totalLabels === 0) {
          toast.info("Nenhuma etiqueta encontrada no WhatsApp Business");
        } else {
          toast.success(`${data.addedTags || 0} etiquetas sincronizadas! ${data.addedContacts || 0} contatos atualizados`);
        }
      } else {
        toast.error(data?.error || "Erro ao sincronizar etiquetas");
      }
    } catch (err) {
      console.error("Error syncing labels:", err);
      toast.error("Erro ao sincronizar etiquetas do WhatsApp");
    } finally {
      setSyncingLabels(false);
    }
  };

  // Create tag mutation - also creates in WhatsApp if connected
  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // First, try to create in WhatsApp if connected
      if (activeConnection) {
        try {
          const { data: waResult } = await supabase.functions.invoke('wa-labels', {
            body: {
              action: 'create',
              connectionId: activeConnection.id,
              labelName: name,
              labelColor: color,
              userId: user.id
            }
          });
          console.log("WhatsApp label result:", waResult);
        } catch (waErr) {
          console.log("Could not create in WhatsApp:", waErr);
        }
      }

      // Create locally
      const { data, error } = await supabase
        .from("tags")
        .insert({ name, color, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTagName("");
      setIsCreateTagOpen(false);
      toast.success("Tag criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar tag: " + error.message);
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover tag: " + error.message);
    },
  });

  // Update contact tags mutation
  const updateContactTagsMutation = useMutation({
    mutationFn: async ({ contactIds, tagName, action }: { contactIds: string[]; tagName: string; action: "add" | "remove" }) => {
      for (const contactId of contactIds) {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) continue;

        let newTags = contact.tags || [];
        if (action === "add" && !newTags.includes(tagName)) {
          newTags = [...newTags, tagName];
        } else if (action === "remove") {
          newTags = newTags.filter((t: string) => t !== tagName);
        }

        const { error } = await supabase
          .from("leads")
          .update({ tags: newTags })
          .eq("id", contactId);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-segmentation"] });
      setSelectedContacts([]);
      setIsApplyTagOpen(false);
      toast.success("Tags atualizadas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tags: " + error.message);
    },
  });

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = filterTag === "all" || (contact.tags && contact.tags.includes(filterTag));
    
    // Check campaign status
    let matchesCampaignStatus = true;
    if (filterCampaignStatus !== "all") {
      const contactResponses = responses.filter(r => r.contact_phone === contact.phone);
      if (filterCampaignStatus === "responded") {
        matchesCampaignStatus = contactResponses.length > 0;
      } else if (filterCampaignStatus === "not_responded") {
        matchesCampaignStatus = contactResponses.length === 0;
      } else if (filterCampaignStatus === "positive") {
        matchesCampaignStatus = contactResponses.some(r => r.response_type === "positive");
      } else if (filterCampaignStatus === "negative") {
        matchesCampaignStatus = contactResponses.some(r => r.response_type === "negative");
      }
    }
    
    return matchesSearch && matchesTag && matchesCampaignStatus;
  });

  // Get contact campaign history
  const getContactHistory = (phone: string) => {
    return responses.filter(r => r.contact_phone === phone);
  };

  // Stats
  const tagStats = tags.map(tag => ({
    ...tag,
    count: contacts.filter(c => c.tags && c.tags.includes(tag.name)).length
  }));

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleApplyTag = () => {
    if (!selectedTagToApply || selectedContacts.length === 0) return;
    updateContactTagsMutation.mutate({
      contactIds: selectedContacts,
      tagName: selectedTagToApply,
      action: "add"
    });
  };

  const colors = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", 
    "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Segmentação de Contatos</h1>
          <p className="text-muted-foreground">Organize seus contatos com tags e filtros avançados</p>
        </div>
        <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Tag</Label>
                <Input 
                  value={newTagName} 
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: Cliente VIP"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full transition-all ${newTagColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <Badge style={{ backgroundColor: newTagColor }} className="text-white">
                  {newTagName || "Preview"}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTagOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createTagMutation.mutate({ name: newTagName, color: newTagColor })}
                disabled={!newTagName.trim() || createTagMutation.isPending}
              >
                Criar Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">
            <Users className="w-4 h-4 mr-2" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tags className="w-4 h-4 mr-2" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-[180px]">
                    <Tags className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tags</SelectItem>
                    {tags.map(tag => (
                      <SelectItem key={tag.id} value={tag.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCampaignStatus} onValueChange={setFilterCampaignStatus}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Comportamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="responded">Responderam</SelectItem>
                    <SelectItem value="not_responded">Não responderam</SelectItem>
                    <SelectItem value="positive">Resposta positiva</SelectItem>
                    <SelectItem value="negative">Resposta negativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions Bar */}
          {selectedContacts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg"
            >
              <span className="font-medium">{selectedContacts.length} contatos selecionados</span>
              <Dialog open={isApplyTagOpen} onOpenChange={setIsApplyTagOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Tags className="w-4 h-4 mr-2" />
                    Aplicar Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aplicar Tag aos Contatos</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>Selecione a tag</Label>
                    <Select value={selectedTagToApply} onValueChange={setSelectedTagToApply}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.map(tag => (
                          <SelectItem key={tag.id} value={tag.name}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsApplyTagOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleApplyTag} disabled={!selectedTagToApply}>
                      Aplicar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={() => setSelectedContacts([])}>
                Limpar seleção
              </Button>
            </motion.div>
          )}

          {/* Contacts Table */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b p-4 flex items-center gap-4">
                <Checkbox 
                  checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {filteredContacts.length} contatos encontrados
                </span>
              </div>
              <ScrollArea className="h-[500px]">
                {loadingContacts ? (
                  <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum contato encontrado
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredContacts.map(contact => {
                      const history = getContactHistory(contact.phone);
                      return (
                        <div 
                          key={contact.id} 
                          className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox 
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts([...selectedContacts, contact.id]);
                              } else {
                                setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{contact.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {contact.phone}
                                </span>
                              )}
                              {contact.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {contact.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.tags && contact.tags.map((tagName: string) => {
                              const tag = tags.find(t => t.name === tagName);
                              return (
                                <Badge 
                                  key={tagName} 
                                  style={{ backgroundColor: tag?.color || "#6b7280" }}
                                  className="text-white text-xs"
                                >
                                  {tagName}
                                </Badge>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {history.length > 0 ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {history.length} respostas
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                <Clock className="w-3 h-3 mr-1" />
                                Sem respostas
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          {/* Sync Button */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium">Sincronizar Etiquetas do WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeConnection 
                      ? `Conectado a: ${activeConnection.instance_name}`
                      : "Conecte ao WhatsApp para sincronizar etiquetas"
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSyncLabels}
                  disabled={syncingLabels || !activeConnection}
                >
                  {syncingLabels ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {syncingLabels ? 'Sincronizando...' : 'Sincronizar do WhatsApp'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingTags ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Carregando tags...
              </div>
            ) : tags.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Tags className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="mb-2">Nenhuma tag criada.</p>
                <p className="text-sm">Crie sua primeira tag ou sincronize do WhatsApp Business.</p>
              </div>
            ) : (
              tagStats.map(tag => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="relative overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 w-1 h-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <CardContent className="p-4 pl-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: tag.color + "20" }}
                          >
                            <Tags className="w-5 h-5" style={{ color: tag.color }} />
                          </div>
                          <div>
                            <h3 className="font-medium">{tag.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tag.count} contatos
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Deseja remover esta tag?")) {
                              deleteTagMutation.mutate(tag.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Campanhas por Contato</CardTitle>
              <CardDescription>
                Veja quais contatos interagiram com suas campanhas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {responses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma resposta de campanha registrada
                  </div>
                ) : (
                  <div className="space-y-4">
                    {responses.slice(0, 50).map(response => {
                      const campaign = campaigns.find(c => c.id === response.campaign_id);
                      return (
                        <div key={response.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{response.contact_name || response.contact_phone}</span>
                              {response.response_type === "positive" && (
                                <Badge className="bg-green-100 text-green-700">Positiva</Badge>
                              )}
                              {response.response_type === "negative" && (
                                <Badge className="bg-red-100 text-red-700">Negativa</Badge>
                              )}
                              {(!response.response_type || response.response_type === "neutral") && (
                                <Badge variant="secondary">Neutra</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Campanha: {campaign?.name || "Desconhecida"}
                            </p>
                            {response.response_text && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">
                                "{response.response_text}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(response.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Segmentation;