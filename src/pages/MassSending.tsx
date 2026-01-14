import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Send, Loader2, ArrowLeft, ArrowRight, Users, Upload, Check, Tag, FileSpreadsheet, Image, FileText, Music, Video, Type, Eye, Trash2, BarChart3, Calendar, Clock, CheckCircle, MoreVertical, Wifi, WifiOff, RefreshCw, Rocket, Megaphone, X, Smartphone, List, LayoutGrid, MousePointer, BookmarkPlus, Terminal, Save, MessageSquare, Gift, Star, BarChart, Pause, Play, Link, Copy } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WhatsAppPreview, InteractiveType } from "@/components/mass-sending/WhatsAppPreview";
import { CampaignTemplates } from "@/components/mass-sending/CampaignTemplates";
import { ApiTester } from "@/components/mass-sending/ApiTester";
import { CampaignTester } from "@/components/mass-sending/CampaignTester";
import { CampaignResponses } from "@/components/mass-sending/CampaignResponses";
import { BirthdayCampaigns } from "@/components/mass-sending/BirthdayCampaigns";
import { SatisfactionSurveys } from "@/components/mass-sending/SatisfactionSurveys";
import { CampaignActionsStep } from "@/components/mass-sending/CampaignActionsStep";
import { CampaignReports } from "@/components/mass-sending/CampaignReports";
import { MessageTemplates } from "@/components/mass-sending/MessageTemplates";
import { CampaignScheduler } from "@/components/mass-sending/CampaignScheduler";
import { OptimalTimeSuggestions } from "@/components/mass-sending/OptimalTimeSuggestions";
import { FeatureGate } from "@/components/FeatureGate";
import { WebhookFieldConfig } from "@/components/mass-sending/WebhookFieldConfig";

type MessageType = "text" | "image" | "document" | "audio" | "video";

interface Connection {
  id: string;
  name: string;
  status: string;
  token?: string;
  environment?: string;
  base_url?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  message_type: string;
  message_content: string | null;
  media_url: string | null;
  total_contacts: number;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  tags: string[] | null;
}

interface ButtonItem {
  id: string;
  label: string;
  action?: string;
}

interface ListItem {
  id: string;
  title: string;
  description: string;
}

interface CarouselCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  buttons: { label: string; action: string }[];
}

interface PollOption {
  id: string;
  text: string;
}

interface DebugLog {
  time: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

interface CampaignTemplate {
  id: string;
  name: string;
  connection_id: string | null;
  message_type: string;
  message_content: string | null;
  media_url: string | null;
  interactive_type: string | null;
  buttons: any[];
  list_items: any[];
  carousel_cards: any[];
  contact_source: string | null;
  selected_tags: string[];
  created_at: string;
}

function MassSendingContent() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"campaigns" | "templates" | "message-templates" | "scheduler" | "optimal-times" | "webhook" | "birthday" | "satisfaction" | "tester" | "reports">("campaigns");

  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [connId, setConnId] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [date, setDate] = useState("");

  const [contactSource, setContactSource] = useState<"manual" | "tags" | "csv" | "leads">("manual");
  const [manualContacts, setManualContacts] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [csvContacts, setCsvContacts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [messageType, setMessageType] = useState<MessageType>("text");
  const [msg, setMsg] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [viewOnce, setViewOnce] = useState(false);
  
  // Interactive message states
  const [interactiveType, setInteractiveType] = useState<InteractiveType>("none");
  const [buttons, setButtons] = useState<ButtonItem[]>([]);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [carouselCards, setCarouselCards] = useState<CarouselCard[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollMultiSelect, setPollMultiSelect] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // Campaign Actions state
  const [tagOnSend, setTagOnSend] = useState(false);
  const [tagOnSendId, setTagOnSendId] = useState("");
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [saveAsLead, setSaveAsLead] = useState(false);
  const [controllingCampaign, setControllingCampaign] = useState<string | null>(null);

  // Sending configuration (anti-ban)
  const [delayInterval, setDelayInterval] = useState(10); // seconds between messages
  const [pauseEveryX, setPauseEveryX] = useState(10); // pause every X messages
  const [pauseDuration, setPauseDuration] = useState(60); // pause duration in seconds
  const [sendImmediately, setSendImmediately] = useState(true); // send immediately or queue
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "unknown">("unknown");
  
  // Debug console
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const debugRef = useRef<HTMLDivElement>(null);
  
  const addLog = (type: DebugLog["type"], message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setDebugLogs(prev => [...prev.slice(-50), { time, type, message }]);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-scroll debug console
    if (debugRef.current) {
      debugRef.current.scrollTop = debugRef.current.scrollHeight;
    }
  }, [debugLogs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const userId = userData.user.id;
        const [connectionsRes, campaignsRes, tagsRes, leadsRes, templatesRes] = await Promise.all([
          supabase.from("connections").select("id, instance_name, status, token, environment, base_url"),
          supabase.from("campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("tags").select("*").eq("user_id", userId),
          supabase.from("leads").select("*").eq("user_id", userId),
          supabase.from("campaign_templates").select("*").eq("user_id", userId).order("created_at", { ascending: false })
        ]);
        // Map connections to expected interface
        const mappedConnections = (connectionsRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.instance_name,
          status: c.status,
          token: c.token,
          environment: c.environment,
          base_url: c.base_url
        })) as Connection[];
        setConnections(mappedConnections);
        // Map campaigns without started_at
        const mappedCampaigns = (campaignsRes.data || []).map((c: any) => ({
          ...c,
          started_at: null
        })) as Campaign[];
        setCampaigns(mappedCampaigns);
        setTags((tagsRes.data as TagItem[]) || []);
        setLeads((leadsRes.data as Lead[]) || []);
        setTemplates((templatesRes.data as CampaignTemplate[]) || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  const getContactsFromTags = (): string[] => {
    if (selectedTags.length === 0) return [];
    return leads
      .filter(lead => lead.tags && lead.tags.some(t => selectedTags.includes(t)))
      .map(lead => lead.phone)
      .filter(Boolean);
  };

  const getAllContacts = (): string[] => {
    let contacts: string[] = [];
    if (contactSource === "manual") {
      contacts = manualContacts.split("\n").filter(n => n.trim()).map(n => n.trim());
    } else if (contactSource === "tags") {
      contacts = getContactsFromTags();
    } else if (contactSource === "csv") {
      contacts = csvContacts;
    } else if (contactSource === "leads") {
      contacts = selectedLeads;
    }
    return contacts.map(n => n.replace(/\D/g, "") + "@s.whatsapp.net");
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(line => line.trim());
      const phones = lines.map(line => {
        const parts = line.split(/[,;]/);
        return parts[0]?.trim().replace(/\D/g, "");
      }).filter(p => p && p.length >= 10);
      setCsvContacts(phones);
      toast.success(phones.length + " contatos importados");
    };
    reader.readAsText(file);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    
    // Set preview for images and videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setMediaPreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaPreview("");
    }
    
    // For videos and large files, upload to storage and use URL
    // For smaller files (images, audio, documents), use base64
    const shouldUploadToStorage = file.type.startsWith("video/") || file.size > 5 * 1024 * 1024; // 5MB limit for base64
    
    if (shouldUploadToStorage) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          toast.error("Você precisa estar logado para enviar vídeos");
          setMediaFile(null);
          return;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${userData.user.id}/${Date.now()}_media.${fileExt}`;
        
        toast.loading("Enviando arquivo para servidor...", { id: "media-upload" });
        
        const { error: uploadError } = await supabase.storage
          .from("campaign-media")
          .upload(fileName, file);
        
        if (uploadError) {
          toast.error("Erro ao enviar arquivo: " + uploadError.message, { id: "media-upload" });
          setMediaFile(null);
          return;
        }
        
        const { data: publicUrl } = supabase.storage
          .from("campaign-media")
          .getPublicUrl(fileName);
        
        setMediaUrl(publicUrl.publicUrl);
        toast.success("Arquivo enviado: " + file.name, { id: "media-upload" });
        console.log("[MassSending] Media uploaded to storage:", publicUrl.publicUrl);
      } catch (error: any) {
        toast.error("Erro ao enviar arquivo: " + error.message, { id: "media-upload" });
        setMediaFile(null);
      }
    } else {
      // Use base64 for smaller files
      const reader = new FileReader();
      reader.onload = (evt) => {
        setMediaUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
      toast.success("Arquivo carregado: " + file.name);
    }
  };

  const checkConnectionStatus = async (connectionId: string): Promise<boolean> => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn || !conn.token) {
      setConnectionStatus("disconnected");
      return false;
    }
    
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-status-instance", {
        body: {
          token: conn.token,
          environment: conn.environment || "TESTE",
          base_url: conn.base_url
        }
      });
      
      if (error || !data?.success || !data?.connected) {
        setConnectionStatus("disconnected");
        setCheckingStatus(false);
        return false;
      }
      
      setConnectionStatus("connected");
      setCheckingStatus(false);
      return true;
    } catch (err) {
      console.error("Error checking status:", err);
      setConnectionStatus("disconnected");
      setCheckingStatus(false);
      return false;
    }
  };

  const sendCampaign = async () => {
    setShowDebugConsole(true);
    addLog("info", "Iniciando envio de campanha...");
    
    const nums = getAllContacts();
    if (nums.length === 0) {
      addLog("error", "Nenhum contato selecionado");
      toast.error("Adicione contatos");
      return;
    }
    addLog("info", `${nums.length} contatos selecionados`);
    
    if (messageType === "text" && !msg && interactiveType === "none") {
      addLog("error", "Mensagem vazia");
      toast.error("Digite uma mensagem");
      return;
    }
    if (messageType !== "text" && !mediaUrl && interactiveType !== "carousel") {
      addLog("error", "Arquivo de mídia não selecionado");
      toast.error("Adicione o arquivo de midia");
      return;
    }
    if (!acceptedTerms) {
      addLog("error", "Termos não aceitos");
      toast.error("Você precisa aceitar os termos de uso para enviar");
      return;
    }
    
    // If scheduled for a future time, only save and don't send
    if (schedule && date) {
      const scheduledDate = new Date(date);
      const now = new Date();
      
      if (scheduledDate > now) {
        setSending(true);
        addLog("info", `Agendando campanha para ${scheduledDate.toLocaleString()}...`);
        
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error("Não autenticado");
          
          // Determine message type for storage
          const useMenuEndpoint = interactiveType !== "none" && (
            (interactiveType === "buttons" && buttons.some(b => b.label.trim())) ||
            (interactiveType === "list" && listItems.some(i => i.title.trim())) ||
            (interactiveType === "carousel" && carouselCards.some(c => c.title.trim()))
          );
          
          const insertData = {
            user_id: userData.user.id,
            name: name,
            message_type: useMenuEndpoint ? `interactive_${interactiveType}` : messageType,
            message_content: msg,
            media_url: mediaUrl || null,
            contacts: nums,
            total_contacts: nums.length,
            connection_id: connId,
            scheduled_at: scheduledDate.toISOString(),
            status: "scheduled"
          };
          
          console.log("[MassSending] Saving scheduled campaign:", insertData);
          addLog("info", `Salvando campanha: ${JSON.stringify({ name, total_contacts: nums.length, scheduled_at: scheduledDate.toISOString() })}`);
          
          const { data: savedData, error: saveError } = await supabase
            .from("campaigns")
            .insert(insertData)
            .select()
            .single();
          
          if (saveError) {
            console.error("[MassSending] Error saving campaign:", saveError);
            addLog("error", `Erro ao agendar: ${saveError.message} (code: ${saveError.code})`);
            throw new Error(saveError.message);
          }
          
          console.log("[MassSending] Campaign saved:", savedData);
          addLog("success", `Campanha "${name}" agendada para ${scheduledDate.toLocaleString()} - ID: ${savedData?.id}`);
          toast.success(`Campanha agendada para ${scheduledDate.toLocaleString()}`);
          loadData();
          resetForm();
        } catch (err: unknown) {
          const error = err as Error;
          console.error("[MassSending] Exception:", error);
          addLog("error", `Exceção: ${error.message}`);
          toast.error(error.message);
        }
        setSending(false);
        return;
      }
    }
    
    setSending(true);
    addLog("info", "Verificando conexão WhatsApp...");
    
    const isConnected = await checkConnectionStatus(connId);
    if (!isConnected) {
      addLog("error", "Instância WhatsApp desconectada");
      toast.error("Instancia WhatsApp desconectada. Reconecte na pagina de Conexoes.", {
        action: {
          label: "Ir para Conexoes",
          onClick: () => window.location.href = "/connections"
        },
        duration: 8000
      });
      setSending(false);
      return;
    }
    addLog("success", "Conexão WhatsApp OK");
    
    let campaignId: string | undefined;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Nao autenticado");
      
      // Determine if we should use the menu endpoint
      const useMenuEndpoint = interactiveType !== "none" && (
        (interactiveType === "buttons" && buttons.some(b => b.label.trim())) ||
        (interactiveType === "list" && listItems.some(i => i.title.trim())) ||
        (interactiveType === "carousel" && carouselCards.some(c => c.title.trim())) ||
        (interactiveType === "poll" && pollQuestion.trim() && pollOptions.some(o => o.text.trim()))
      );
      
      let finalMessage = msg;
      let menuChoices: string[] = [];
      // UZAPI menu types: buttons, list, carousel
      let uzapiMenuType = interactiveType;
      
      if (useMenuEndpoint) {
        if (interactiveType === "buttons") {
          // Format for buttons: ["Botão 1", "Botão 2", "Botão 3"]
          menuChoices = buttons.filter(b => b.label.trim()).map(b => b.label);
          addLog("info", `Preparando botões interativos com ${menuChoices.length} opções`);
        } else if (interactiveType === "list") {
          // Format for list: ["Título 1\nDescrição 1", "Título 2\nDescrição 2"]
          menuChoices = listItems.filter(i => i.title.trim()).map(i => {
            if (i.description && i.description.trim()) {
              return `${i.title}\n${i.description}`;
            }
            return i.title;
          });
          addLog("info", `Preparando lista com ${menuChoices.length} itens`);
        } else if (interactiveType === "carousel") {
          // Format for carousel: ["[Title\nDescription]","{imageUrl}","Button1|action","Button2|action",...]
          menuChoices = [];
          carouselCards.filter(c => c.title.trim()).forEach(card => {
            menuChoices.push(`[${card.title}\n${card.description || ''}]`);
            if (card.imageUrl && card.imageUrl.trim()) {
              menuChoices.push(`{${card.imageUrl}}`);
            }
            card.buttons.filter(b => b.label.trim()).forEach(btn => {
              const action = btn.action && btn.action.trim() ? btn.action : 'https://example.com';
              menuChoices.push(`${btn.label}|${action}`);
            });
          });
          addLog("info", `Preparando carrossel com ${carouselCards.length} cards`);
        } else if (interactiveType === "poll") {
          // Format for poll: ["Opção 1", "Opção 2", ...]
          uzapiMenuType = "poll";
          finalMessage = pollQuestion; // Use poll question as the message text
          menuChoices = pollOptions.filter(o => o.text.trim()).map(o => o.text);
          addLog("info", `Preparando enquete com ${menuChoices.length} opções`);
        }
      }
      
      addLog("info", "Salvando campanha no banco de dados...");
      const { data: campaignData, error: campaignError } = await supabase.from("campaigns").insert({
        user_id: userData.user.id,
        name: name,
        message_type: useMenuEndpoint ? `interactive_${interactiveType}` : messageType,
        message_content: finalMessage,
        media_url: mediaUrl || null,
        total_contacts: nums.length,
        scheduled_at: schedule && date ? new Date(date).toISOString() : null,
        status: schedule ? "scheduled" : "sending"
      }).select().single();
      
      if (campaignError) {
        addLog("error", `Erro ao salvar campanha: ${campaignError.message}`);
        throw new Error("Erro ao salvar campanha");
      }
      
      campaignId = campaignData.id;
      addLog("success", "Campanha salva no banco");
      
      if (useMenuEndpoint) {
        addLog("info", `Enviando menu interativo (tipo: ${uzapiMenuType})...`);
        
        // Build the payload based on interactive type
        const menuPayload: any = {
          action: "menu",
          connectionId: connId,
          numbers: nums,
          menuType: uzapiMenuType,
          text: finalMessage,
          delayMin: delayInterval,
          delayMax: delayInterval + 5,
          pauseEveryX: pauseEveryX,
          pauseDuration: pauseDuration,
        };
        
        if (interactiveType === "carousel") {
          // Format carousel cards for UZAPI /send/carousel endpoint
          // UZAPI expects: { text: "Title\nDescription", image: "url", buttons: [{id, text, type}] }
          menuPayload.carousel = carouselCards.filter(c => c.title.trim()).map(card => ({
            text: card.description ? `${card.title}\n${card.description}` : card.title,
            image: card.imageUrl || "",
            buttons: card.buttons.filter(b => b.label.trim()).map(btn => {
              // Determine button type and id based on action
              const isUrl = btn.action && (btn.action.startsWith("http://") || btn.action.startsWith("https://"));
              return {
                id: isUrl ? btn.action : btn.label.toLowerCase().replace(/\s+/g, "_"),
                text: btn.label,
                type: isUrl ? "URL" : "REPLY"
              };
            })
          }));
          addLog("info", `Carousel payload: ${JSON.stringify(menuPayload.carousel)}`);
        } else if (interactiveType === "poll") {
          menuPayload.choices = menuChoices;
          menuPayload.selectableCount = pollMultiSelect ? pollOptions.filter(o => o.text.trim()).length : 1;
        } else {
          menuPayload.choices = menuChoices;
        }
        
        addLog("info", `Payload: ${JSON.stringify(menuPayload)}`);
        
        // Use menu endpoint for interactive messages
        const { data, error } = await supabase.functions.invoke("wa-sender", {
          body: menuPayload
        });
        
        if (error) {
          addLog("error", `Erro na função: ${error.message}`);
          throw new Error(error.message || "Erro ao enviar campanha");
        }
        
        addLog("info", `Resposta: ${JSON.stringify(data)}`);
        
        if (data && !data.success) {
          addLog("error", `Erro UZAPI: ${data.error || JSON.stringify(data)}`);
          throw new Error(data.error || "Erro ao enviar campanha");
        }
        
        // Log individual results and count
        let sentCount = 0;
        let failedCount = 0;
        
        if (data?.data?.results) {
          data.data.results.forEach((r: any) => {
            if (r.success) {
              sentCount++;
              addLog("success", `✓ Enviado para ${r.number}`);
            } else {
              failedCount++;
              addLog("error", `✗ Falha ${r.number}: ${r.result?.error || r.error || 'Erro desconhecido'}`);
            }
          });
        } else {
          // Fallback to data counts
          sentCount = data?.data?.sent || 0;
          failedCount = data?.data?.failed || 0;
        }
        
        // Update campaign status to completed
        await supabase.from("campaigns").update({
          status: failedCount === nums.length ? "failed" : "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString()
        }).eq("id", campaignId);
        
        toast.success(`Campanha enviada! ${sentCount} enviados, ${failedCount} falhas`);
        addLog("success", `Campanha finalizada: ${sentCount} enviados, ${failedCount} falhas`);
      } else {
        addLog("info", "Enviando mensagem simples via UZAPI...");
        addLog("info", `ViewOnce ativo: ${viewOnce}`);
        // Use simple endpoint for regular messages
        const { data, error } = await supabase.functions.invoke("wa-sender", {
          body: {
            action: "simple",
            connectionId: connId,
            numbers: nums,
            type: messageType,
            text: finalMessage,
            media: mediaUrl || undefined,
            viewOnce: viewOnce === true,
            delayMin: delayInterval,
            delayMax: delayInterval + 5,
            pauseEveryX: pauseEveryX,
            pauseDuration: pauseDuration,
            sendImmediately: sendImmediately,
            info: name
          }
        });
        
        if (error) {
          addLog("error", `Erro: ${error.message}`);
          throw new Error(error.message || "Erro ao enviar campanha");
        }
        
        addLog("info", `Resposta: ${JSON.stringify(data)}`);
        
        if (data && !data.success) {
          if (data.details?.error === "No session") {
            addLog("error", "Sessão WhatsApp não encontrada");
            toast.error("Instancia WhatsApp desconectada. Reconecte na pagina de Conexoes.", {
              action: {
                label: "Ir para Conexoes",
                onClick: () => window.location.href = "/connections"
              },
              duration: 8000
            });
            setSending(false);
            return;
          }
          addLog("error", `Erro UZAPI: ${data.error}`);
          // Update campaign as failed
          await supabase.from("campaigns").update({
            status: "failed",
            failed_count: nums.length,
            completed_at: new Date().toISOString()
          }).eq("id", campaignId);
          throw new Error(data.error || "Erro ao enviar campanha");
        }
        
        // Count results
        let sentCount = data?.data?.sent || nums.length;
        let failedCount = data?.data?.failed || 0;
        
        // Update campaign status to completed
        await supabase.from("campaigns").update({
          status: "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString()
        }).eq("id", campaignId);
        
        addLog("success", `Campanha finalizada: ${sentCount} enviados, ${failedCount} falhas`);
        toast.success(`Campanha enviada! ${sentCount} enviados, ${failedCount} falhas`);
      }
      
      // Apply tag on send if configured - update leads tags array directly
      if (tagOnSend && tagOnSendId) {
        addLog("info", "Aplicando etiqueta aos contatos enviados...");
        const phoneNumbers = nums.map(n => n.replace("@s.whatsapp.net", ""));
        
        // Find leads with matching phone numbers and add tag
        for (const phone of phoneNumbers) {
          const lead = leads.find(l => l.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
          if (lead) {
            // Get tag name
            const tag = tags.find(t => t.id === tagOnSendId);
            if (tag && (!lead.tags || !lead.tags.includes(tag.name))) {
              const newTags = [...(lead.tags || []), tag.name];
              await supabase.from("leads").update({ tags: newTags }).eq("id", lead.id);
            }
          }
        }
        addLog("success", `Etiqueta aplicada aos contatos`);
      }
      
      loadData();
      resetForm();
    } catch (err: unknown) {
      const error = err as Error;
      addLog("error", `Exceção: ${error.message}`);
      
      // Update campaign as failed if campaignId exists
      if (typeof campaignId !== 'undefined') {
        await supabase.from("campaigns").update({
          status: "failed",
          failed_count: nums.length,
          completed_at: new Date().toISOString()
        }).eq("id", campaignId);
      }
      
      toast.error(error.message || "Erro ao criar campanha");
    }
    setSending(false);
  };

  const resetForm = () => {
    setWizard(false);
    setStep(1);
    setName("");
    setConnId("");
    setSchedule(false);
    setDate("");
    setContactSource("manual");
    setManualContacts("");
    setSelectedTags([]);
    setSelectedLeads([]);
    setCsvContacts([]);
    setMessageType("text");
    setMsg("");
    setMediaUrl("");
    setMediaFile(null);
    setMediaPreview("");
    setViewOnce(false);
    setInteractiveType("none");
    setButtons([]);
    setListItems([]);
    setCarouselCards([]);
    setPollOptions([]);
    setPollQuestion("");
    setPollMultiSelect(false);
    setDebugLogs([]);
    setShowDebugConsole(false);
    setTagOnSend(false);
    setTagOnSendId("");
    setNotifyOnComplete(true);
    setSaveAsLead(false);
    setDelayInterval(10);
    setPauseEveryX(10);
    setPauseDuration(60);
    setSendImmediately(true);
    setAcceptedTerms(false);
  };

  const executeScheduledCampaign = async (campaignId: string) => {
    setControllingCampaign(campaignId);
    try {
      // Get campaign data
      const { data: campaign, error: fetchError } = await supabase
        .from("campaigns")
        .select("*, connections(token, base_url)")
        .eq("id", campaignId)
        .single();
      
      if (fetchError || !campaign) {
        throw new Error("Campanha não encontrada");
      }
      
      const connection = (campaign as any).connections;
      if (!connection?.token || !connection?.base_url) {
        throw new Error("Conexão inválida. Verifique se a conexão está ativa.");
      }
      
      // Update status to sending
      await supabase
        .from("campaigns")
        .update({ status: "sending", started_at: new Date().toISOString() })
        .eq("id", campaignId);
      
      const campaignContacts = (campaign as any).contacts || [];
      if (!Array.isArray(campaignContacts) || campaignContacts.length === 0) {
        throw new Error("Nenhum contato na campanha");
      }
      
      // Build messages for UZAPI
      const campaignMessages = campaignContacts.map((contact: string) => ({
        number: contact.replace("@s.whatsapp.net", "").replace(/\D/g, ""),
        type: "text",
        text: campaign.message_content || ""
      }));
      
      // Send via UZAPI
      const response = await fetch(`${connection.base_url}/sender/advanced`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": connection.token
        },
        body: JSON.stringify({
          delayMin: 10,
          delayMax: 30,
          info: campaign.name,
          messages: campaignMessages
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaignId);
        throw new Error(result.error || "Erro ao enviar");
      }
      
      // Update as sent
      await supabase
        .from("campaigns")
        .update({ 
          status: "sent",
          sent_count: campaignMessages.length,
          completed_at: new Date().toISOString()
        })
        .eq("id", campaignId);
      
      toast.success(`Campanha enviada! ${campaignMessages.length} mensagens.`);
      loadData();
    } catch (err: any) {
      console.error("Error executing campaign:", err);
      toast.error(err.message || "Erro ao executar campanha");
    }
    setControllingCampaign(null);
  };

  const saveAsTemplate = async () => {
    if (!name.trim()) { toast.error("Digite um nome"); return; }
    setSavingTemplate(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");
      await (supabase.from("campaign_templates") as any).insert({
        user_id: userData.user.id, name, connection_id: connId || null,
        message_type: messageType, message_content: msg, media_url: mediaUrl || null,
        interactive_type: interactiveType, buttons, list_items: listItems,
        carousel_cards: carouselCards, contact_source: contactSource, selected_tags: selectedTags
      });
      toast.success("Template salvo!"); loadData();
    } catch (err: any) { toast.error(err.message); }
    setSavingTemplate(false);
  };

  const loadFromTemplate = (template: CampaignTemplate) => {
    setName(template.name); setConnId(template.connection_id || "");
    setMessageType(template.message_type as MessageType); setMsg(template.message_content || "");
    setMediaUrl(template.media_url || ""); setInteractiveType((template.interactive_type || "none") as InteractiveType);
    setButtons(template.buttons || []); setListItems(template.list_items || []);
    setCarouselCards(template.carousel_cards || []); setWizard(true); setStep(1);
    toast.success("Template carregado!");
  };

  const addButton = () => {
    if (buttons.length >= 3) {
      toast.error("Máximo de 3 botões permitidos");
      return;
    }
    setButtons([...buttons, { id: `btn_${Date.now()}`, label: "", action: "" }]);
  };

  const updateButton = (index: number, field: "label" | "action", value: string) => {
    const newButtons = [...buttons];
    newButtons[index][field] = value;
    setButtons(newButtons);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const addListItem = () => {
    if (listItems.length >= 10) {
      toast.error("Máximo de 10 itens permitidos");
      return;
    }
    setListItems([...listItems, { id: `item_${Date.now()}`, title: "", description: "" }]);
  };

  const updateListItem = (index: number, field: "title" | "description", value: string) => {
    const newItems = [...listItems];
    newItems[index][field] = value;
    setListItems(newItems);
  };

  const removeListItem = (index: number) => {
    setListItems(listItems.filter((_, i) => i !== index));
  };

  const addCarouselCard = () => {
    if (carouselCards.length >= 5) {
      toast.error("Máximo de 5 cards permitidos");
      return;
    }
    setCarouselCards([...carouselCards, { 
      id: `card_${Date.now()}`, 
      title: "", 
      description: "", 
      imageUrl: "",
      buttons: [{ label: "", action: "" }]
    }]);
  };

  const updateCarouselCard = (index: number, field: "title" | "description" | "imageUrl", value: string) => {
    const newCards = [...carouselCards];
    newCards[index][field] = value;
    setCarouselCards(newCards);
  };

  const handleCarouselImageUpload = async (index: number, file: File) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Você precisa estar logado para fazer upload");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${Date.now()}_card_${index}.${fileExt}`;

      toast.loading("Enviando imagem...", { id: "carousel-upload" });

      const { error: uploadError } = await supabase.storage
        .from("campaign-media")
        .upload(fileName, file);

      if (uploadError) {
        toast.error("Erro ao enviar imagem: " + uploadError.message, { id: "carousel-upload" });
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("campaign-media")
        .getPublicUrl(fileName);

      updateCarouselCard(index, "imageUrl", publicUrl.publicUrl);
      toast.success("Imagem enviada com sucesso!", { id: "carousel-upload" });
    } catch (error: any) {
      toast.error("Erro ao enviar imagem: " + error.message, { id: "carousel-upload" });
    }
  };

  const addCarouselButton = (cardIndex: number) => {
    const newCards = [...carouselCards];
    if (newCards[cardIndex].buttons.length >= 3) {
      toast.error("Máximo de 3 botões por card");
      return;
    }
    newCards[cardIndex].buttons.push({ label: "", action: "" });
    setCarouselCards(newCards);
  };

  const updateCarouselButton = (cardIndex: number, btnIndex: number, field: "label" | "action", value: string) => {
    const newCards = [...carouselCards];
    newCards[cardIndex].buttons[btnIndex][field] = value;
    setCarouselCards(newCards);
  };

  const removeCarouselCard = (index: number) => {
    setCarouselCards(carouselCards.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length >= 12) {
      toast.error("Máximo de 12 opções permitidas");
      return;
    }
    setPollOptions([...pollOptions, { id: `poll_${Date.now()}`, text: "" }]);
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index].text = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };
  const deleteCampaign = async (campaignId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    setDeleting(campaignId);
    await supabase.from("campaigns").delete().eq("id", campaignId);
    toast.success("Campanha excluída");
    loadData();
    setDeleting(null);
  };

  // Control campaign via UZAPI (stop, continue, delete)
  const controlCampaign = async (campaignId: string, action: "stop" | "continue" | "delete") => {
    setControllingCampaign(campaignId);
    
    try {
      // Get campaign details to find folder_id (if stored)
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*, connection_id")
        .eq("id", campaignId)
        .single();

      if (!campaign) {
        toast.error("Campanha não encontrada");
        return;
      }

      // Update local status based on action
      let newStatus: string;
      switch (action) {
        case "stop":
          newStatus = "paused";
          break;
        case "continue":
          newStatus = "scheduled";
          break;
        case "delete":
          // Just delete locally
          await supabase.from("campaigns").delete().eq("id", campaignId);
          toast.success("Campanha excluída");
          loadData();
          setControllingCampaign(null);
          return;
        default:
          return;
      }

      await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);

      toast.success(
        action === "stop" ? "Campanha pausada" : "Campanha retomada"
      );
      loadData();
    } catch (error) {
      console.error("Error controlling campaign:", error);
      toast.error("Erro ao controlar campanha");
    } finally {
      setControllingCampaign(null);
    }
  };

  const contactCount = contactSource === "manual"
    ? manualContacts.split("\n").filter(n => n.trim()).length
    : contactSource === "tags"
      ? getContactsFromTags().length
      : csvContacts.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "sending": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "scheduled": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "failed": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluída";
      case "sending": return "Enviando";
      case "scheduled": return "Agendada";
      case "failed": return "Falhou";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Conecte o WhatsApp</h3>
          <p className="text-muted-foreground mb-6">Para criar campanhas de envio em massa, conecte uma instância WhatsApp primeiro.</p>
          <Button onClick={() => window.location.href = "/connections"} className="w-full">
            Ir para Conexões
          </Button>
        </Card>
      </div>
    );
  }

  if (wizard) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Nova Campanha</h1>
            <p className="text-muted-foreground">Configure sua campanha de envio em massa</p>
          </div>
          <Button variant="ghost" onClick={resetForm}>
            <ArrowLeft className="w-4 h-4 mr-2" />Cancelar
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: "Configuração" },
            { num: 2, label: "Contatos" },
            { num: 3, label: "Mensagem" },
            { num: 4, label: "Ações" }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                step >= s.num 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium">
                  {step > s.num ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {idx < 3 && <div className={`w-8 h-0.5 mx-1 ${step > s.num ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-base">Nome da Campanha</Label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Promoção Black Friday" 
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-base">Conexão WhatsApp</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={connId} onValueChange={(id) => {
                    setConnId(id);
                    setConnectionStatus("unknown");
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma conexão" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {connId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => checkConnectionStatus(connId)}
                      disabled={checkingStatus}
                    >
                      {checkingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                {connId && connectionStatus !== "unknown" && (
                  <div className={`flex items-center gap-2 mt-2 text-sm ${connectionStatus === "connected" ? "text-green-600" : "text-destructive"}`}>
                    {connectionStatus === "connected" ? (
                      <>
                        <Wifi className="w-4 h-4" />
                        <span>Instância conectada</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4" />
                        <span>Instância desconectada</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Agendar envio</p>
                    <p className="text-sm text-muted-foreground">Defina uma data e hora para iniciar</p>
                  </div>
                </div>
                <Switch checked={schedule} onCheckedChange={setSchedule} />
              </div>
              {schedule && (
                <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Tabs value={contactSource} onValueChange={(v) => setContactSource(v as "manual" | "tags" | "csv" | "leads")}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />Manual
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />Contatos
                  </TabsTrigger>
                  <TabsTrigger value="tags" className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />Etiquetas
                  </TabsTrigger>
                  <TabsTrigger value="csv" className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />Planilha
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-4">
                  <Label>Números (um por linha)</Label>
                  <Textarea
                    value={manualContacts}
                    onChange={e => setManualContacts(e.target.value)}
                    placeholder={"5511999999999\n5511888888888\n5521777777777"}
                    className="h-48 font-mono text-sm mt-2"
                  />
                </TabsContent>

                <TabsContent value="leads" className="mt-4">
                  <Label>Selecionar contatos salvos</Label>
                  {leads.length === 0 ? (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                      <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum contato salvo</p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedLeads(leads.map(l => l.phone))}
                        >
                          Selecionar todos
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedLeads([])}
                        >
                          Limpar
                        </Button>
                      </div>
                      {leads.map(lead => (
                        <label 
                          key={lead.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedLeads.includes(lead.phone) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedLeads.includes(lead.phone)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLeads([...selectedLeads, lead.phone]);
                              } else {
                                setSelectedLeads(selectedLeads.filter(p => p !== lead.phone));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{lead.name || 'Sem nome'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{lead.phone}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedLeads.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-4">
                      {selectedLeads.length} contatos selecionados
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="tags" className="mt-4">
                  <Label>Selecione as etiquetas</Label>
                  {tags.length === 0 ? (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                      <Tag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma etiqueta cadastrada</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {tags.map(tag => (
                        <label 
                          key={tag.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTags.includes(tag.name) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            id={tag.id}
                            checked={selectedTags.includes(tag.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags([...selectedTags, tag.name]);
                              } else {
                                setSelectedTags(selectedTags.filter(t => t !== tag.name));
                              }
                            }}
                          />
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color || "#3B82F6" }} />
                          <span className="text-sm font-medium">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedTags.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-4">
                      {getContactsFromTags().length} contatos encontrados
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="csv" className="mt-4">
                  <Label>Importar planilha CSV</Label>
                  <div className="mt-3">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      ref={fileInputRef}
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="font-medium">Clique para selecionar</p>
                      <p className="text-sm text-muted-foreground mt-1">CSV com números na primeira coluna</p>
                    </div>
                  </div>
                  {csvContacts.length > 0 && (
                    <div className="mt-4 p-4 bg-green-500/10 rounded-lg">
                      <p className="font-medium text-green-700">{csvContacts.length} contatos importados</p>
                      <p className="text-sm text-green-600 mt-1">
                        Primeiros: {csvContacts.slice(0, 3).join(", ")}...
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium">{contactCount} contatos selecionados</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Message Configuration */}
              <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
                <div>
                  <Label className="text-base">Tipo de Mensagem</Label>
                  <div className="mt-3 space-y-2">
                    {/* First row: Texto, Imagem, Vídeo, Documento */}
                    <ToggleGroup 
                      type="single" 
                      value={messageType} 
                      onValueChange={(v) => v && setMessageType(v as MessageType)}
                      className="justify-start gap-0 p-1 bg-muted rounded-lg"
                    >
                      <ToggleGroupItem 
                        value="text" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Type className="w-4 h-4" />
                        Texto
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="image" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Image className="w-4 h-4" />
                        Imagem
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="video" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Video className="w-4 h-4" />
                        Vídeo
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="document" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <FileText className="w-4 h-4" />
                        Documento
                      </ToggleGroupItem>
                    </ToggleGroup>
                    {/* Second row: Áudio */}
                    <ToggleGroup 
                      type="single" 
                      value={messageType} 
                      onValueChange={(v) => v && setMessageType(v as MessageType)}
                      className="justify-start gap-0 p-1 bg-muted rounded-lg w-fit"
                    >
                      <ToggleGroupItem 
                        value="audio" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Music className="w-4 h-4" />
                        Áudio
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                {messageType !== "text" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Upload de Mídia</Label>
                      <input
                        type="file"
                        accept={
                          messageType === "image" ? "image/*" :
                            messageType === "video" ? "video/*" :
                              messageType === "audio" ? "audio/*" :
                                messageType === "document" ? ".pdf,.doc,.docx,.xls,.xlsx,.txt" : "*/*"
                        }
                        ref={mediaInputRef}
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                      <div 
                        onClick={() => mediaInputRef.current?.click()}
                        className="mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        {mediaFile ? (
                          <div className="flex items-center justify-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-sm">{mediaFile.name}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                            <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                          </>
                        )}
                      </div>
                    </div>

                    {(messageType === "image" || messageType === "video") && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Visualização única</span>
                        </div>
                        <Switch checked={viewOnce} onCheckedChange={setViewOnce} />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>{messageType === "text" ? "Mensagem" : "Legenda (opcional)"}</Label>
                  <Textarea
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="h-28 mt-2"
                  />
                </div>

                {/* Interactive Type Selection */}
                <div>
                  <Label className="text-base">Menu Interativo (UZAPI)</Label>
                  <p className="text-xs text-muted-foreground mb-3">Envie botões, listas ou carrossel interativo</p>
                  <div className="space-y-2">
                    {/* First row: Nenhum, Botões, Lista */}
                    <ToggleGroup 
                      type="single" 
                      value={interactiveType} 
                      onValueChange={(v) => v && setInteractiveType(v as InteractiveType)}
                      className="justify-start gap-0 p-1 bg-muted rounded-lg"
                    >
                      <ToggleGroupItem 
                        value="none" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <Type className="w-4 h-4" />
                        Nenhum
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="buttons" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <MousePointer className="w-4 h-4" />
                        Botões
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="list" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <List className="w-4 h-4" />
                        Lista
                      </ToggleGroupItem>
                    </ToggleGroup>
                    {/* Second row: Enquete, Carrossel */}
                    <ToggleGroup 
                      type="single" 
                      value={interactiveType} 
                      onValueChange={(v) => v && setInteractiveType(v as InteractiveType)}
                      className="justify-start gap-0 p-1 bg-muted rounded-lg w-fit"
                    >
                      <ToggleGroupItem 
                        value="poll" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <BarChart className="w-4 h-4" />
                        Enquete
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="carousel" 
                        className="flex items-center gap-2 px-4 py-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        <LayoutGrid className="w-4 h-4" />
                        Carrossel
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                {/* Buttons Configuration */}
                {interactiveType === "buttons" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label>Botões Interativos (máx. 3)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3}>
                        <Plus className="w-3 h-3 mr-1" />Adicionar
                      </Button>
                    </div>
                    {buttons.map((btn, idx) => (
                      <div key={btn.id} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
                        <Input
                          value={btn.label}
                          onChange={(e) => updateButton(idx, "label", e.target.value)}
                          placeholder="Texto do botão"
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeButton(idx)}>
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    {buttons.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">Clique em adicionar para criar botões</p>
                    )}
                  </div>
                )}

                {/* List Configuration */}
                {interactiveType === "list" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label>Itens da Lista (máx. 10)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addListItem} disabled={listItems.length >= 10}>
                        <Plus className="w-3 h-3 mr-1" />Adicionar
                      </Button>
                    </div>
                    {listItems.map((item, idx) => (
                      <div key={item.id} className="space-y-2 p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
                          <Input
                            value={item.title}
                            onChange={(e) => updateListItem(idx, "title", e.target.value)}
                            placeholder="Título do item"
                            className="flex-1"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem(idx)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <Input
                          value={item.description}
                          onChange={(e) => updateListItem(idx, "description", e.target.value)}
                          placeholder="Descrição (opcional)"
                          className="ml-8"
                        />
                      </div>
                    ))}
                    {listItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">Clique em adicionar para criar itens</p>
                    )}
                  </div>
                )}

                {/* Carousel Configuration */}
                {interactiveType === "carousel" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label>Cards do Carrossel (máx. 5)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCarouselCard} disabled={carouselCards.length >= 5}>
                        <Plus className="w-3 h-3 mr-1" />Adicionar Card
                      </Button>
                    </div>
                    {carouselCards.map((card, idx) => (
                      <div key={card.id} className="space-y-2 p-3 bg-background rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Card {idx + 1}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeCarouselCard(idx)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <Input
                          value={card.title}
                          onChange={(e) => updateCarouselCard(idx, "title", e.target.value)}
                          placeholder="Título do card"
                        />
                        <Input
                          value={card.description}
                          onChange={(e) => updateCarouselCard(idx, "description", e.target.value)}
                          placeholder="Descrição"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={card.imageUrl}
                            onChange={(e) => updateCarouselCard(idx, "imageUrl", e.target.value)}
                            placeholder="URL da imagem ou faça upload →"
                            className="flex-1"
                          />
                          <input
                            type="file"
                            id={`carousel-image-${idx}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCarouselImageUpload(idx, file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => document.getElementById(`carousel-image-${idx}`)?.click()}
                            title="Upload de imagem"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                        {card.imageUrl && (
                          <div className="relative">
                            <img 
                              src={card.imageUrl} 
                              alt={`Preview card ${idx + 1}`} 
                              className="w-full h-24 object-cover rounded-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">Botões do card:</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => addCarouselButton(idx)}
                            disabled={card.buttons.length >= 3}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        {card.buttons.map((btn, bIdx) => (
                          <div key={bIdx} className="flex gap-2">
                            <Input
                              value={btn.label}
                              onChange={(e) => updateCarouselButton(idx, bIdx, "label", e.target.value)}
                              placeholder="Texto"
                              className="flex-1"
                            />
                            <Input
                              value={btn.action}
                              onChange={(e) => updateCarouselButton(idx, bIdx, "action", e.target.value)}
                              placeholder="URL/ação"
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                    {carouselCards.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">Clique em adicionar para criar cards</p>
                    )}
                  </div>
                )}

                {/* Poll Configuration */}
                {interactiveType === "poll" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <Label>Configuração da Enquete</Label>
                    <div className="space-y-2">
                      <Input
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Pergunta da enquete"
                      />
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Permitir múltiplas respostas</span>
                        </div>
                        <Switch checked={pollMultiSelect} onCheckedChange={setPollMultiSelect} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Opções (máx. 12)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPollOption} disabled={pollOptions.length >= 12}>
                        <Plus className="w-3 h-3 mr-1" />Adicionar
                      </Button>
                    </div>
                    {pollOptions.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
                        <Input
                          value={opt.text}
                          onChange={(e) => updatePollOption(idx, e.target.value)}
                          placeholder="Opção de resposta"
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(idx)}>
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    {pollOptions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">Clique em adicionar para criar opções</p>
                    )}
                  </div>
                )}

                {/* Summary */}
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="w-5 h-5 text-primary" />
                    <p className="font-semibold">Resumo</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Nome:</div>
                    <div className="font-medium">{name}</div>
                    <div className="text-muted-foreground">Contatos:</div>
                    <div className="font-medium">{contactCount}</div>
                    <div className="text-muted-foreground">Tipo:</div>
                    <div className="font-medium capitalize">{messageType}</div>
                    {interactiveType !== "none" && (
                      <>
                        <div className="text-muted-foreground">Interativo:</div>
                        <div className="font-medium capitalize">{interactiveType}</div>
                      </>
                    )}
                    {schedule && (
                      <>
                        <div className="text-muted-foreground">Agendado:</div>
                        <div className="font-medium">{new Date(date).toLocaleString()}</div>
                      </>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right: WhatsApp Preview */}
              <div className="hidden lg:block">
                <WhatsAppPreview
                  messageType={messageType}
                  message={msg}
                  mediaPreview={mediaPreview}
                  mediaFile={mediaFile}
                  buttons={buttons}
                  interactiveType={interactiveType}
                  listItems={listItems.map(i => ({ title: i.title, description: i.description }))}
                  carouselCards={carouselCards.map(c => ({
                    title: c.title,
                    description: c.description,
                    imageUrl: c.imageUrl,
                    buttons: c.buttons
                  }))}
                  pollQuestion={pollQuestion}
                  pollOptions={pollOptions}
                  pollMultiSelect={pollMultiSelect}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <CampaignActionsStep
              tags={tags}
              tagOnSend={tagOnSend}
              setTagOnSend={setTagOnSend}
              tagOnSendId={tagOnSendId}
              setTagOnSendId={setTagOnSendId}
              notifyOnComplete={notifyOnComplete}
              setNotifyOnComplete={setNotifyOnComplete}
              saveAsLead={saveAsLead}
              setSaveAsLead={setSaveAsLead}
              delayInterval={delayInterval}
              setDelayInterval={setDelayInterval}
              pauseEveryX={pauseEveryX}
              setPauseEveryX={setPauseEveryX}
              pauseDuration={pauseDuration}
              setPauseDuration={setPauseDuration}
              sendImmediately={sendImmediately}
              setSendImmediately={setSendImmediately}
              acceptedTerms={acceptedTerms}
              setAcceptedTerms={setAcceptedTerms}
            />
          )}
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />Anterior
          </Button>
          <div className="flex gap-2">
            {step === 4 && name && (
              <Button 
                variant="outline" 
                onClick={saveAsTemplate} 
                disabled={savingTemplate}
              >
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookmarkPlus className="w-4 h-4 mr-2" />}
                Salvar Template
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={
                step === 1 ? !name || !connId : 
                step === 2 ? contactCount === 0 : 
                step === 3 ? (messageType === "text" && !msg && interactiveType === "none") : false
              }>
                Próximo<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={sendCampaign} disabled={sending || !acceptedTerms}>
                {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Send className="w-4 h-4 mr-2" />
                Enviar Campanha
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Envio em Massa</h1>
          <p className="text-muted-foreground">Gerencie campanhas, templates e teste envios</p>
        </div>
        <Button onClick={() => setWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />Nova Campanha
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-11 max-w-7xl">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />Campanhas
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />Relatórios
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />Respostas
          </TabsTrigger>
          <TabsTrigger value="message-templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />Templates
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />Agendar
          </TabsTrigger>
          <TabsTrigger value="optimal-times" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />Horários
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Link className="w-4 h-4" />Webhook
          </TabsTrigger>
          <TabsTrigger value="birthday" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />Aniversário
          </TabsTrigger>
          <TabsTrigger value="satisfaction" className="flex items-center gap-2">
            <Star className="w-4 h-4" />Satisfação
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4" />Favoritos
          </TabsTrigger>
          <TabsTrigger value="tester" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />Tester
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma campanha ainda</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie sua primeira campanha de envio em massa para alcançar seus contatos de forma eficiente.
              </p>
              <Button onClick={() => setWizard(true)} size="lg">
                <Plus className="w-4 h-4 mr-2" />Criar Campanha
              </Button>
            </Card>
          ) : (
        <div className="grid gap-4">
          {campaigns.map(c => {
            const successRate = c.total_contacts > 0 
              ? Math.round(((c.sent_count || 0) / c.total_contacts) * 100) 
              : 0;
            
            return (
              <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      c.status === "completed" ? "bg-green-500/10" : 
                      c.status === "failed" ? "bg-red-500/10" :
                      c.status === "sending" ? "bg-blue-500/10" : 
                      c.status === "scheduled" ? "bg-yellow-500/10" : "bg-muted"
                    }`}>
                      {c.status === "completed" ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : c.status === "failed" ? (
                        <X className="w-6 h-6 text-red-600" />
                      ) : c.status === "sending" ? (
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      ) : c.status === "scheduled" ? (
                        <Clock className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{c.name}</p>
                        <Badge variant="outline" className={getStatusColor(c.status)}>
                          {getStatusLabel(c.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {c.total_contacts} contatos
                        </span>
                        <span className="flex items-center gap-1">
                          {c.message_type?.startsWith("interactive_") ? (
                            <MousePointer className="w-3.5 h-3.5" />
                          ) : c.message_type === "text" ? (
                            <Type className="w-3.5 h-3.5" />
                          ) : c.message_type === "image" ? (
                            <Image className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          {c.message_type?.replace("interactive_", "")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        {c.status === "scheduled" && c.scheduled_at && (
                          <span className="flex items-center gap-1 text-yellow-600 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            Agendado: {new Date(c.scheduled_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar for completed/failed campaigns */}
                      {(c.status === "completed" || c.status === "failed") && (
                        <div className="mt-2 max-w-md">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="text-green-600 font-medium">
                              {c.sent_count || 0} enviados
                            </span>
                            {(c.failed_count || 0) > 0 && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-red-600 font-medium">
                                  {c.failed_count} falhas
                                </span>
                              </>
                            )}
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {successRate}% sucesso
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(c.status === "completed" || c.status === "failed") && (
                      <div className="flex items-center gap-3 mr-2">
                        <div className="text-center px-3 py-1 rounded-lg bg-green-500/10">
                          <p className="text-lg font-bold text-green-600">{c.sent_count || 0}</p>
                          <p className="text-xs text-muted-foreground">Enviados</p>
                        </div>
                        {(c.failed_count || 0) > 0 && (
                          <div className="text-center px-3 py-1 rounded-lg bg-red-500/10">
                            <p className="text-lg font-bold text-red-600">{c.failed_count}</p>
                            <p className="text-xs text-muted-foreground">Falhas</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedCampaign(c); setShowDetails(true); }}>
                          <Eye className="w-4 h-4 mr-2" />Ver Detalhes
                        </DropdownMenuItem>
                        {(c.status === "completed" || c.status === "failed") && (
                          <DropdownMenuItem onClick={() => { setSelectedCampaign(c); setShowReport(true); }}>
                            <BarChart3 className="w-4 h-4 mr-2" />Relatório
                          </DropdownMenuItem>
                        )}
                        {/* Campaign control actions */}
                        {c.status === "scheduled" && (
                          <DropdownMenuItem 
                            onClick={() => executeScheduledCampaign(c.id)}
                            disabled={controllingCampaign === c.id}
                          >
                            {controllingCampaign === c.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            Enviar Agora
                          </DropdownMenuItem>
                        )}
                        {(c.status === "sending" || c.status === "scheduled") && (
                          <DropdownMenuItem 
                            onClick={() => controlCampaign(c.id, "stop")}
                            disabled={controllingCampaign === c.id}
                          >
                            {controllingCampaign === c.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Pause className="w-4 h-4 mr-2" />
                            )}
                            Pausar
                          </DropdownMenuItem>
                        )}
                        {c.status === "paused" && (
                          <DropdownMenuItem 
                            onClick={() => controlCampaign(c.id, "continue")}
                            disabled={controllingCampaign === c.id}
                          >
                            {controllingCampaign === c.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            Continuar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => controlCampaign(c.id, "delete")}
                          className="text-destructive"
                          disabled={deleting === c.id || controllingCampaign === c.id}
                        >
                          {deleting === c.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <CampaignReports />
        </TabsContent>

        <TabsContent value="message-templates" className="mt-6">
          <MessageTemplates onSelectTemplate={(content) => {
            setMsg(content);
            setWizard(true);
            setStep(3);
          }} />
        </TabsContent>

        <TabsContent value="scheduler" className="mt-6">
          <CampaignScheduler 
            campaignName={name}
            onSchedule={(date, recurrence) => {
              setSchedule(true);
              setDate(date.toISOString().slice(0, 16));
            }}
          />
        </TabsContent>

        <TabsContent value="optimal-times" className="mt-6">
          <OptimalTimeSuggestions />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <CampaignTemplates 
            templates={templates} 
            onRefresh={loadData} 
            onUseTemplate={loadFromTemplate}
            connections={connections}
          />
        </TabsContent>

        <TabsContent value="tester" className="mt-6">
          <div className="space-y-6">
            <CampaignTester connections={connections} />
            <ApiTester connections={connections} />
          </div>
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <CampaignResponses campaigns={campaigns} />
        </TabsContent>

        <TabsContent value="webhook" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Configuração de Campos */}
            <WebhookFieldConfig connections={connections} campaigns={campaigns} />

            {/* Documentação da API */}
            <Card className="p-6 h-fit">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Webhook de Integração</h3>
                  <p className="text-sm text-muted-foreground">
                    Endpoint para integrar com outros sistemas
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">URL do Webhook</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value="https://lvldqyyzhlygwbgcdqcg.supabase.co/functions/v1/campaign-webhook"
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText("https://lvldqyyzhlygwbgcdqcg.supabase.co/functions/v1/campaign-webhook");
                        toast.success("URL copiada!");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm">Ações Disponíveis</h4>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-background rounded border">
                      <code className="text-primary font-medium">create_campaign</code>
                      <p className="text-muted-foreground">Cria uma nova campanha</p>
                    </div>
                    <div className="p-2 bg-background rounded border">
                      <code className="text-primary font-medium">add_contacts</code>
                      <p className="text-muted-foreground">Adiciona contatos a uma campanha</p>
                    </div>
                    <div className="p-2 bg-background rounded border">
                      <code className="text-primary font-medium">get_status</code>
                      <p className="text-muted-foreground">Retorna o status de uma campanha</p>
                    </div>
                    <div className="p-2 bg-background rounded border">
                      <code className="text-primary font-medium">list_campaigns</code>
                      <p className="text-muted-foreground">Lista todas as campanhas</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm">Exemplo de Requisição</h4>
                  <pre className="text-[10px] bg-background p-2 rounded border overflow-x-auto">
{`POST /functions/v1/campaign-webhook
Content-Type: application/json

{
  "user_id": "seu-user-id",
  "action": "create_campaign",
  "campaign_name": "Minha Campanha",
  "connection_id": "uuid-da-conexao",
  "message": "Olá!",
  "contacts": ["5511999999999"]
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="birthday" className="mt-6">
          <BirthdayCampaigns connections={connections} />
        </TabsContent>

        <TabsContent value="satisfaction" className="mt-6">
          <SatisfactionSurveys connections={connections} />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Campanha</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedCampaign.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={getStatusColor(selectedCampaign.status)}>
                    {getStatusLabel(selectedCampaign.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Contatos</p>
                  <p className="font-medium">{selectedCampaign.total_contacts}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Mensagem</p>
                  <p className="font-medium capitalize">{selectedCampaign.message_type?.replace("interactive_", "")}</p>
                </div>
                {(selectedCampaign.status === "completed" || selectedCampaign.status === "failed") && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Enviados com Sucesso</p>
                      <p className="font-medium text-green-600">{selectedCampaign.sent_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Falhas</p>
                      <p className="font-medium text-red-600">{selectedCampaign.failed_count || 0}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">{new Date(selectedCampaign.created_at).toLocaleString()}</p>
                </div>
                {selectedCampaign.scheduled_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Agendada para</p>
                    <p className="font-medium text-yellow-600">{new Date(selectedCampaign.scheduled_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedCampaign.started_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Iniciada em</p>
                    <p className="font-medium">{new Date(selectedCampaign.started_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedCampaign.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Concluída em</p>
                    <p className="font-medium">{new Date(selectedCampaign.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              {/* Success Rate Progress */}
              {(selectedCampaign.status === "completed" || selectedCampaign.status === "failed") && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Taxa de Sucesso</p>
                  <Progress 
                    value={selectedCampaign.total_contacts > 0 
                      ? ((selectedCampaign.sent_count || 0) / selectedCampaign.total_contacts) * 100 
                      : 0
                    } 
                  />
                  <p className="text-sm text-right mt-1">
                    {selectedCampaign.total_contacts > 0 
                      ? Math.round(((selectedCampaign.sent_count || 0) / selectedCampaign.total_contacts) * 100)
                      : 0
                    }%
                  </p>
                </div>
              )}
              
              {selectedCampaign.message_content && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
                  <div className="p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
                    {selectedCampaign.message_content}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatório da Campanha</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{selectedCampaign.total_contacts}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </Card>
                <Card className="p-4 text-center bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{selectedCampaign.sent_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Enviados</p>
                </Card>
                <Card className="p-4 text-center bg-red-500/10">
                  <p className="text-2xl font-bold text-red-600">{selectedCampaign.failed_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                </Card>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Taxa de Sucesso</p>
                <Progress 
                  value={selectedCampaign.total_contacts > 0 
                    ? ((selectedCampaign.sent_count || 0) / selectedCampaign.total_contacts) * 100 
                    : 0
                  } 
                />
                <p className="text-sm text-right mt-1">
                  {selectedCampaign.total_contacts > 0 
                    ? Math.round(((selectedCampaign.sent_count || 0) / selectedCampaign.total_contacts) * 100)
                    : 0
                  }%
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Console */}
      {showDebugConsole && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-zinc-400 text-sm font-mono ml-2">Console de Debug</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowDebugConsole(false)}>
              <X className="w-4 h-4 text-zinc-400" />
            </Button>
          </div>
          <div 
            ref={debugRef}
            className="h-48 overflow-y-auto p-3 font-mono text-xs space-y-1"
            style={{ scrollBehavior: 'smooth' }}
          >
            {debugLogs.map((log, i) => (
              <div 
                key={i} 
                className={`flex gap-2 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  'text-zinc-300'
                }`}
              >
                <span className="text-zinc-500">[{log.time}]</span>
                <span className={`uppercase text-xs px-1 rounded ${
                  log.type === 'error' ? 'bg-red-500/20' :
                  log.type === 'success' ? 'bg-green-500/20' :
                  log.type === 'warning' ? 'bg-yellow-500/20' :
                  'bg-zinc-500/20'
                }`}>{log.type}</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
            {debugLogs.length === 0 && (
              <p className="text-zinc-500">Aguardando logs...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MassSending() {
  return (
    <FeatureGate feature="mass_sending">
      <MassSendingContent />
    </FeatureGate>
  );
}

export default MassSending;
