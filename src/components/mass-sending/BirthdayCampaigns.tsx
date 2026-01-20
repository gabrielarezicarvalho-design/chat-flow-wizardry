import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Upload, Calendar, Clock, Users, Gift, Eye, Edit, FileSpreadsheet, Image, Play, Pause, Video, List, MessageSquare, Cake, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BirthdayImportDialog } from "./BirthdayImportDialog";

interface Connection {
  id: string;
  name: string;
}

interface ButtonItem {
  id: string;
  text: string;
}

interface BirthdayCampaign {
  id: string;
  name: string;
  connection_id: string | null;
  message_type: string;
  message_content: string | null;
  media_url: string | null;
  days_before: number;
  send_time: string;
  is_active: boolean;
  created_at: string;
  contacts_count?: number;
  interactive_type?: string | null;
  buttons?: any;
}

interface BirthdayContact {
  id: string;
  campaign_id: string;
  name: string;
  phone: string;
  birth_date: string;
  last_sent_year: number | null;
}

interface BirthdayCampaignsProps {
  connections: Connection[];
}

type MessageType = "text" | "image" | "video" | "document" | "interactive";
type InteractiveType = "buttons" | "list";

export function BirthdayCampaigns({ connections }: BirthdayCampaignsProps) {
  const [campaigns, setCampaigns] = useState<BirthdayCampaign[]>([]);
  const [contacts, setContacts] = useState<BirthdayContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [importCampaignId, setImportCampaignId] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<BirthdayCampaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // New contact form
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    birth_date: ""
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    connection_id: "",
    message_type: "text" as MessageType,
    message_content: "🎂 Parabéns {nome}! Desejamos um feliz aniversário cheio de alegrias!",
    media_url: "",
    interactive_type: "buttons" as InteractiveType,
    buttons: [{ id: "1", text: "Obrigado! 🎉" }] as ButtonItem[],
    days_before: 0,
    send_time: "09:00",
    is_active: true,
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: campaignsData, error } = await supabase
        .from("birthday_campaigns")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const campaignsWithCount = await Promise.all(
        (campaignsData || []).map(async (campaign: any) => {
          const { count } = await supabase
            .from("birthday_contacts")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", campaign.id);

          return { ...campaign, contacts_count: count || 0 };
        })
      );

      setCampaigns(campaignsWithCount);
    } catch (err) {
      console.error("Error loading campaigns:", err);
      toast.error("Erro ao carregar campanhas");
    }
    setLoading(false);
  };

  const loadContacts = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from("birthday_contacts")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("birth_date", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error("Error loading contacts:", err);
      toast.error("Erro ao carregar contatos");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Digite um nome para a campanha");
      return;
    }
    if (!formData.connection_id) {
      toast.error("Selecione uma conexão");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const campaignData = {
        name: formData.name,
        connection_id: formData.connection_id,
        message_type: formData.message_type,
        message_content: formData.message_content,
        media_url: formData.media_url || null,
        interactive_type: formData.message_type === "interactive" ? formData.interactive_type : null,
        buttons: formData.message_type === "interactive" ? JSON.parse(JSON.stringify(formData.buttons)) : null,
        days_before: formData.days_before,
        send_time: formData.send_time,
        is_active: formData.is_active,
      };

      if (selectedCampaign) {
        await supabase
          .from("birthday_campaigns")
          .update(campaignData as any)
          .eq("id", selectedCampaign.id);
        toast.success("Campanha atualizada!");
      } else {
        await (supabase.from("birthday_campaigns") as any).insert({
          ...campaignData,
          user_id: userData.user.id,
        });
        toast.success("Campanha criada!");
      }

      loadCampaigns();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      connection_id: "",
      message_type: "text",
      message_content: "🎂 Parabéns {nome}! Desejamos um feliz aniversário cheio de alegrias!",
      media_url: "",
      interactive_type: "buttons",
      buttons: [{ id: "1", text: "Obrigado! 🎉" }],
      days_before: 0,
      send_time: "09:00",
      is_active: true,
    });
    setSelectedCampaign(null);
  };

  const editCampaign = (campaign: BirthdayCampaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      connection_id: campaign.connection_id || "",
      message_type: (campaign.message_type as MessageType) || "text",
      message_content: campaign.message_content || "",
      media_url: campaign.media_url || "",
      interactive_type: (campaign.interactive_type as InteractiveType) || "buttons",
      buttons: (campaign.buttons as ButtonItem[]) || [{ id: "1", text: "Obrigado! 🎉" }],
      days_before: campaign.days_before,
      send_time: campaign.send_time,
      is_active: campaign.is_active,
    });
    setShowForm(true);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;

    try {
      // Delete contacts first
      await supabase.from("birthday_contacts").delete().eq("campaign_id", id);
      await supabase.from("birthday_campaigns").delete().eq("id", id);
      toast.success("Campanha excluída!");
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleCampaign = async (campaign: BirthdayCampaign) => {
    try {
      await supabase
        .from("birthday_campaigns")
        .update({ is_active: !campaign.is_active })
        .eq("id", campaign.id);
      toast.success(campaign.is_active ? "Campanha pausada" : "Campanha ativada");
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      await supabase.from("birthday_contacts").delete().eq("id", contactId);
      setContacts(contacts.filter((c) => c.id !== contactId));
      toast.success("Contato removido");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addButton = () => {
    if (formData.buttons.length >= 3) {
      toast.error("Máximo de 3 botões");
      return;
    }
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { id: Date.now().toString(), text: "" }]
    });
  };

  const removeButton = (id: string) => {
    setFormData({
      ...formData,
      buttons: formData.buttons.filter(b => b.id !== id)
    });
  };

  const updateButton = (id: string, text: string) => {
    setFormData({
      ...formData,
      buttons: formData.buttons.map(b => b.id === id ? { ...b, text } : b)
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (formData.message_type === "image" && !isImage) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }
    if (formData.message_type === "video" && !isVideo) {
      toast.error("Por favor, selecione um vídeo");
      return;
    }

    // Validate file size (10MB for images, 1GB for videos)
    const maxSize = isVideo ? 1024 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande. Máximo: ${isVideo ? "1GB" : "10MB"}`);
      return;
    }

    setUploadingMedia(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `birthday-campaigns/${userData.user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(data.path);

      setFormData({ ...formData, media_url: urlData.publicUrl });
      toast.success("Mídia enviada!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Erro ao enviar mídia");
    }
    setUploadingMedia(false);
    e.target.value = "";
  };

  const removeMedia = () => {
    setFormData({ ...formData, media_url: "" });
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      toast.error("Digite o nome do contato");
      return;
    }
    if (!newContact.phone.trim()) {
      toast.error("Digite o telefone do contato");
      return;
    }
    if (!newContact.birth_date) {
      toast.error("Selecione a data de nascimento");
      return;
    }

    setAddingContact(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const cleanPhone = newContact.phone.replace(/\D/g, "");

      await supabase.from("birthday_contacts").insert({
        campaign_id: selectedCampaign?.id,
        user_id: userData.user.id,
        name: newContact.name,
        phone: cleanPhone,
        birth_date: newContact.birth_date
      });

      toast.success("Contato adicionado!");
      setNewContact({ name: "", phone: "", birth_date: "" });
      setShowAddContact(false);
      
      if (selectedCampaign) {
        loadContacts(selectedCampaign.id);
        loadCampaigns();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setAddingContact(false);
  };

  const getUpcomingBirthdays = () => {
    const today = new Date();
    const next7Days = addDays(today, 7);
    
    return contacts.filter((c) => {
      const birthDate = parseISO(c.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      return thisYearBirthday >= today && thisYearBirthday <= next7Days;
    });
  };

  const formatPreviewMessage = (message: string, name: string) => {
    return message.replace(/{nome}/g, name);
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "interactive": return <List className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Campanhas de Aniversário</h3>
          <p className="text-sm text-muted-foreground">
            Envie mensagens automáticas para aniversariantes
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="p-8 text-center">
          <Cake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">Nenhuma campanha de aniversário</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua primeira campanha para enviar mensagens automáticas
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Campanha
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      campaign.is_active ? "bg-green-500/10" : "bg-muted"
                    }`}
                  >
                    <Gift
                      className={`w-5 h-5 ${
                        campaign.is_active ? "text-green-600" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge variant="outline" className="text-xs gap-1">
                        {getMessageTypeIcon(campaign.message_type)}
                        {campaign.message_type === "interactive" 
                          ? campaign.interactive_type === "buttons" ? "Botões" : "Lista"
                          : campaign.message_type === "image" ? "Imagem"
                          : campaign.message_type === "video" ? "Vídeo"
                          : "Texto"
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {campaign.contacts_count} contatos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {campaign.send_time}
                      </span>
                      {campaign.days_before > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {campaign.days_before} dia(s) antes
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={campaign.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleCampaign(campaign)}
                  >
                    {campaign.is_active ? (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Ativa
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3 mr-1" />
                        Pausada
                      </>
                    )}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportCampaignId(campaign.id);
                      setShowImportDialog(true);
                    }}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Importar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      loadContacts(campaign.id);
                      setShowContacts(true);
                    }}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Contatos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => editCampaign(campaign)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCampaign(campaign.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCampaign ? "Editar Campanha" : "Nova Campanha de Aniversário"}
            </DialogTitle>
            <DialogDescription>
              Configure uma campanha para enviar mensagens automáticas em aniversários
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Campanha</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Aniversariantes VIP"
              />
            </div>
            
            <div>
              <Label>Conexão WhatsApp</Label>
              <Select
                value={formData.connection_id}
                onValueChange={(v) => setFormData({ ...formData, connection_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Mensagem</Label>
              <Select
                value={formData.message_type}
                onValueChange={(v) => setFormData({ ...formData, message_type: v as MessageType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Texto
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Imagem
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Vídeo
                    </div>
                  </SelectItem>
                  <SelectItem value="interactive">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4" />
                      Interativa (Botões/Lista)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Media upload for image/video */}
            {(formData.message_type === "image" || formData.message_type === "video") && (
              <div>
                <Label>{formData.message_type === "image" ? "Imagem" : "Vídeo"}</Label>
                <input
                  type="file"
                  ref={mediaInputRef}
                  accept={formData.message_type === "image" ? "image/*" : "video/*"}
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                
                {formData.media_url ? (
                  <div className="mt-2 space-y-2">
                    {formData.message_type === "image" ? (
                      <div className="relative">
                        <img 
                          src={formData.media_url} 
                          alt="Preview" 
                          className="w-full max-h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={removeMedia}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative bg-muted rounded-lg p-4 flex items-center gap-3">
                        <Video className="w-8 h-8 text-muted-foreground" />
                        <div className="flex-1 truncate text-sm">
                          {formData.media_url.split("/").pop()}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={removeMedia}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Clique no X para remover e enviar outra mídia
                    </p>
                  </div>
                ) : (
                  <div 
                    className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    {uploadingMedia ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Enviando...</p>
                      </div>
                    ) : (
                      <>
                        {formData.message_type === "image" ? (
                          <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        ) : (
                          <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        )}
                        <p className="text-sm font-medium">
                          Clique para enviar {formData.message_type === "image" ? "imagem" : "vídeo"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Máximo: {formData.message_type === "image" ? "10MB" : "50MB"}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Interactive type selection */}
            {formData.message_type === "interactive" && (
              <div>
                <Label>Tipo Interativo</Label>
                <Select
                  value={formData.interactive_type}
                  onValueChange={(v) => setFormData({ ...formData, interactive_type: v as InteractiveType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buttons">Botões (até 3)</SelectItem>
                    <SelectItem value="list">Lista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={formData.message_content}
                onChange={(e) =>
                  setFormData({ ...formData, message_content: e.target.value })
                }
                placeholder="Use {nome} para personalizar"
                className="h-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{nome}"} para incluir o nome do aniversariante
              </p>
            </div>

            {/* Buttons configuration */}
            {formData.message_type === "interactive" && formData.interactive_type === "buttons" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Botões</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addButton}
                    disabled={formData.buttons.length >= 3}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {formData.buttons.map((btn, idx) => (
                  <div key={btn.id} className="flex gap-2">
                    <Input
                      value={btn.text}
                      onChange={(e) => updateButton(btn.id, e.target.value)}
                      placeholder={`Botão ${idx + 1}`}
                      maxLength={20}
                    />
                    {formData.buttons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeButton(btn.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Máximo 20 caracteres por botão</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Enviar</Label>
                <Select
                  value={formData.days_before.toString()}
                  onValueChange={(v) =>
                    setFormData({ ...formData, days_before: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No dia</SelectItem>
                    <SelectItem value="1">1 dia antes</SelectItem>
                    <SelectItem value="2">2 dias antes</SelectItem>
                    <SelectItem value="3">3 dias antes</SelectItem>
                    <SelectItem value="7">1 semana antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.send_time}
                  onChange={(e) =>
                    setFormData({ ...formData, send_time: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Campanha ativa</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {selectedCampaign ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contacts Dialog */}
      <Dialog open={showContacts} onOpenChange={setShowContacts}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Contatos - {selectedCampaign?.name}</span>
              <Button
                size="sm"
                onClick={() => setShowAddContact(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos ({contacts.length})</TabsTrigger>
              <TabsTrigger value="upcoming">
                Próximos 7 dias ({getUpcomingBirthdays().length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Nenhum contato</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Importe um CSV ou adicione contatos manualmente
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedCampaign) {
                          setImportCampaignId(selectedCampaign.id);
                          setShowImportDialog(true);
                        }
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Importar CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddContact(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Manual
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Aniversário</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                          <TableCell>
                            {format(parseISO(c.birth_date), "dd/MM", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteContact(c.id)}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
            <TabsContent value="upcoming">
              {getUpcomingBirthdays().length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum aniversário nos próximos 7 dias
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {getUpcomingBirthdays().map((c) => {
                      const birthDate = parseISO(c.birth_date);
                      const thisYearBirthday = new Date(
                        new Date().getFullYear(),
                        birthDate.getMonth(),
                        birthDate.getDate()
                      );
                      return (
                        <Card key={c.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Cake className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{c.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {isToday(thisYearBirthday)
                                  ? "Hoje!"
                                  : format(thisYearBirthday, "EEEE, dd 'de' MMMM", {
                                      locale: ptBR,
                                    })}
                              </p>
                            </div>
                            {isToday(thisYearBirthday) && (
                              <Badge className="bg-green-500">Hoje</Badge>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Aniversariante</DialogTitle>
            <DialogDescription>
              Cadastre manualmente um contato de aniversário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder="Ex: 11999999999"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Apenas números, com DDD
              </p>
            </div>
            <div>
              <Label>Data de Nascimento *</Label>
              <Input
                type="date"
                value={newContact.birth_date}
                onChange={(e) => setNewContact({ ...newContact, birth_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddContact} disabled={addingContact}>
              {addingContact && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pré-visualização</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <Card className="bg-[#0B141A] p-4">
              {/* Media preview */}
              {selectedCampaign.media_url && (selectedCampaign.message_type === "image" || selectedCampaign.message_type === "video") && (
                <div className="mb-2 rounded-lg overflow-hidden max-w-[280px] ml-auto">
                  {selectedCampaign.message_type === "image" ? (
                    <img 
                      src={selectedCampaign.media_url} 
                      alt="Preview" 
                      className="w-full h-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/280x200?text=Imagem";
                      }}
                    />
                  ) : (
                    <div className="bg-muted/20 p-8 text-center">
                      <Video className="w-12 h-12 mx-auto text-white/50" />
                      <p className="text-xs text-white/50 mt-2">Vídeo</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-[#005C4B] text-white p-3 rounded-lg max-w-[280px] ml-auto">
                <p className="text-sm whitespace-pre-wrap">
                  {formatPreviewMessage(
                    selectedCampaign.message_content || "",
                    "Maria"
                  )}
                </p>
                <p className="text-[10px] text-white/60 text-right mt-1">
                  {selectedCampaign.send_time}
                </p>
              </div>

              {/* Buttons preview */}
              {selectedCampaign.message_type === "interactive" && 
               selectedCampaign.interactive_type === "buttons" && 
               selectedCampaign.buttons && (
                <div className="mt-2 max-w-[280px] ml-auto space-y-1">
                  {(selectedCampaign.buttons as ButtonItem[]).map((btn) => (
                    <div 
                      key={btn.id}
                      className="bg-[#005C4B]/50 text-white text-center py-2 rounded border border-[#005C4B] text-sm"
                    >
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <BirthdayImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        campaignId={importCampaignId}
        onSuccess={() => {
          loadCampaigns();
          if (showContacts && selectedCampaign?.id === importCampaignId) {
            loadContacts(importCampaignId);
          }
        }}
      />
    </div>
  );
}
