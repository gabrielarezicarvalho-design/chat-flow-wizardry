import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Webhook, User, Phone, MapPin, Clock, Tag, 
  MessageSquare, MousePointerClick, List, Plus, Trash2, Save, Loader2,
  ExternalLink, ChevronDown, FileText, X, Send, Users, Hash
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Connection {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface WebhookFieldConfigProps {
  connections: Connection[];
  campaigns: Campaign[];
}

interface FieldConfig {
  id: string;
  user_id: string;
  connection_id: string | null;
  name: string;
  is_active: boolean;
  capture_contact_name: boolean;
  capture_contact_phone: boolean;
  capture_contact_address: boolean;
  capture_message_time: boolean;
  capture_campaign_name: boolean;
  capture_message_content: boolean;
  capture_response_type: boolean;
  capture_button_clicked: boolean;
  capture_list_selection: boolean;
  custom_fields: string[];
  filter_campaigns: string[];
  filter_only_responses: boolean;
  filter_only_buttons: boolean;
  external_webhook_url: string | null;
  external_webhook_enabled: boolean;
  external_webhook_headers: Record<string, string>;
  // Telegram fields
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  telegram_filter_keywords: string[];
  telegram_filter_mode: string;
  telegram_send_to_channel: boolean;
  telegram_send_to_group: boolean;
}

const defaultConfig: Omit<FieldConfig, 'id' | 'user_id'> = {
  connection_id: null,
  name: 'Configuração Padrão',
  is_active: true,
  capture_contact_name: true,
  capture_contact_phone: true,
  capture_contact_address: false,
  capture_message_time: true,
  capture_campaign_name: true,
  capture_message_content: true,
  capture_response_type: true,
  capture_button_clicked: true,
  capture_list_selection: true,
  custom_fields: [],
  filter_campaigns: [],
  filter_only_responses: false,
  filter_only_buttons: false,
  external_webhook_url: null,
  external_webhook_enabled: false,
  external_webhook_headers: {},
  // Telegram defaults
  telegram_enabled: false,
  telegram_chat_id: null,
  telegram_filter_keywords: [],
  telegram_filter_mode: 'contains',
  telegram_send_to_channel: false,
  telegram_send_to_group: false
};

export function WebhookFieldConfig({ connections, campaigns }: WebhookFieldConfigProps) {
  const [config, setConfig] = useState<FieldConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      console.log("🔍 Carregando config para user:", userData.user.id);

      const { data, error } = await supabase
        .from("webhook_field_configs")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("❌ Erro ao carregar config:", error);
        throw error;
      }

      if (data) {
        console.log("✅ Config carregada:", data.id);
        console.log("📝 Telegram enabled:", data.telegram_enabled);
        console.log("📝 Telegram chat_id:", data.telegram_chat_id);
        
        setConfig({
          ...data,
          custom_fields: Array.isArray(data.custom_fields) ? data.custom_fields : [],
          filter_campaigns: Array.isArray(data.filter_campaigns) ? data.filter_campaigns : [],
          external_webhook_headers: typeof data.external_webhook_headers === 'object' 
            ? data.external_webhook_headers 
            : {},
          telegram_filter_keywords: Array.isArray(data.telegram_filter_keywords) ? data.telegram_filter_keywords : []
        } as FieldConfig);
      } else {
        console.log("📝 Criando nova config...");
        const { data: newConfig, error: createError } = await supabase
          .from("webhook_field_configs")
          .insert({
            user_id: userData.user.id,
            ...defaultConfig
          })
          .select()
          .single();

        if (createError) {
          console.error("❌ Erro ao criar config:", createError);
          throw createError;
        }
        
        console.log("✅ Nova config criada:", newConfig.id);
        setConfig({
          ...newConfig,
          custom_fields: [],
          filter_campaigns: [],
          external_webhook_headers: {},
          telegram_filter_keywords: []
        } as FieldConfig);
      }
    } catch (err) {
      console.error("Error loading webhook config:", err);
      toast.error("Erro ao carregar configuração");
    }
    setIsLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    
    const updateData = {
      connection_id: config.connection_id,
      name: config.name,
      is_active: config.is_active,
      capture_contact_name: config.capture_contact_name,
      capture_contact_phone: config.capture_contact_phone,
      capture_contact_address: config.capture_contact_address,
      capture_message_time: config.capture_message_time,
      capture_campaign_name: config.capture_campaign_name,
      capture_message_content: config.capture_message_content,
      capture_response_type: config.capture_response_type,
      capture_button_clicked: config.capture_button_clicked,
      capture_list_selection: config.capture_list_selection,
      custom_fields: config.custom_fields,
      filter_campaigns: config.filter_campaigns,
      filter_only_responses: config.filter_only_responses,
      filter_only_buttons: config.filter_only_buttons,
      external_webhook_url: config.external_webhook_url,
      external_webhook_enabled: config.external_webhook_enabled,
      external_webhook_headers: config.external_webhook_headers,
      // Telegram fields
      telegram_enabled: config.telegram_enabled,
      telegram_chat_id: config.telegram_chat_id,
      telegram_filter_keywords: config.telegram_filter_keywords,
      telegram_filter_mode: config.telegram_filter_mode,
      telegram_send_to_channel: config.telegram_send_to_channel,
      telegram_send_to_group: config.telegram_send_to_group
    };
    
    console.log("💾 Salvando configuração:", config.id);
    console.log("📝 Dados Telegram:", {
      telegram_enabled: config.telegram_enabled,
      telegram_chat_id: config.telegram_chat_id,
      telegram_filter_keywords: config.telegram_filter_keywords
    });
    
    try {
      const { data, error } = await supabase
        .from("webhook_field_configs")
        .update(updateData)
        .eq("id", config.id)
        .select();

      if (error) {
        console.error("❌ Erro ao salvar:", error);
        throw error;
      }
      
      console.log("✅ Configuração salva:", data);
      toast.success("Configuração salva com sucesso!");
    } catch (err) {
      console.error("Error saving config:", err);
      toast.error("Erro ao salvar configuração");
    }
    setIsSaving(false);
  };

  const updateConfig = (updates: Partial<FieldConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const addHeader = () => {
    if (!newHeaderKey.trim() || !newHeaderValue.trim() || !config) return;
    const newHeaders = { ...config.external_webhook_headers, [newHeaderKey]: newHeaderValue };
    updateConfig({ external_webhook_headers: newHeaders });
    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const removeHeader = (key: string) => {
    if (!config) return;
    const newHeaders = { ...config.external_webhook_headers };
    delete newHeaders[key];
    updateConfig({ external_webhook_headers: newHeaders });
  };

  const testExternalWebhook = async () => {
    if (!config?.external_webhook_url) {
      toast.error("Configure a URL do webhook primeiro");
      return;
    }

    setIsTesting(true);
    try {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          contact_name: 'Teste',
          contact_phone: '5511999999999',
          message_content: 'Esta é uma mensagem de teste',
          campaign_name: 'Campanha Teste',
          response_type: 'text'
        }
      };

      const response = await fetch(config.external_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.external_webhook_headers
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast.success("Webhook testado com sucesso!");
      } else {
        toast.error(`Erro no webhook: ${response.status}`);
      }
    } catch (err) {
      console.error("Webhook test error:", err);
      toast.error("Erro ao testar webhook. Verifique a URL e CORS.");
    }
    setIsTesting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          WebHooks
        </h2>
        <p className="text-muted-foreground text-sm">
          Envie dados dos contatos para outra aplicação após a execução dos eventos cadastrados
        </p>
      </div>

      {/* Main Config Card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Conexão */}
          <div className="space-y-2">
            <Label>Conexão</Label>
            <Select 
              value={config.connection_id || 'all'} 
              onValueChange={(value) => updateConfig({ connection_id: value === 'all' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as conexões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as conexões</SelectItem>
                {connections.map(conn => (
                  <SelectItem key={conn.id} value={conn.id}>{conn.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL do Webhook Externo */}
          <div className="space-y-2">
            <Label>URL do WebHook</Label>
            <Input
              placeholder="Insira a URL de destino aqui (ex: Make, Zapier, n8n...)"
              value={config.external_webhook_url || ''}
              onChange={(e) => updateConfig({ external_webhook_url: e.target.value })}
            />
          </div>

          {/* Ativo Toggle */}
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch
              checked={config.external_webhook_enabled || false}
              onCheckedChange={(checked) => updateConfig({ external_webhook_enabled: checked })}
            />
          </div>

          {/* Dados a Enviar */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded px-2">
              <span className="font-medium">Dados a enviar</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3 pl-2">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_contact_phone"
                  checked={config.capture_contact_phone}
                  onCheckedChange={(checked) => updateConfig({ capture_contact_phone: !!checked })}
                />
                <Label htmlFor="capture_contact_phone" className="cursor-pointer flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Número
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_contact_name"
                  checked={config.capture_contact_name}
                  onCheckedChange={(checked) => updateConfig({ capture_contact_name: !!checked })}
                />
                <Label htmlFor="capture_contact_name" className="cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nome
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_contact_address"
                  checked={config.capture_contact_address}
                  onCheckedChange={(checked) => updateConfig({ capture_contact_address: !!checked })}
                />
                <Label htmlFor="capture_contact_address" className="cursor-pointer flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Endereço
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_message_time"
                  checked={config.capture_message_time}
                  onCheckedChange={(checked) => updateConfig({ capture_message_time: !!checked })}
                />
                <Label htmlFor="capture_message_time" className="cursor-pointer flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Horário
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_campaign_name"
                  checked={config.capture_campaign_name}
                  onCheckedChange={(checked) => updateConfig({ capture_campaign_name: !!checked })}
                />
                <Label htmlFor="capture_campaign_name" className="cursor-pointer flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Nome da Campanha
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_message_content"
                  checked={config.capture_message_content}
                  onCheckedChange={(checked) => updateConfig({ capture_message_content: !!checked })}
                />
                <Label htmlFor="capture_message_content" className="cursor-pointer flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Conteúdo da Mensagem
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_button_clicked"
                  checked={config.capture_button_clicked}
                  onCheckedChange={(checked) => updateConfig({ capture_button_clicked: !!checked })}
                />
                <Label htmlFor="capture_button_clicked" className="cursor-pointer flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  Botão Clicado
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_list_selection"
                  checked={config.capture_list_selection}
                  onCheckedChange={(checked) => updateConfig({ capture_list_selection: !!checked })}
                />
                <Label htmlFor="capture_list_selection" className="cursor-pointer flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  Seleção de Lista
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="capture_response_type"
                  checked={config.capture_response_type}
                  onCheckedChange={(checked) => updateConfig({ capture_response_type: !!checked })}
                />
                <Label htmlFor="capture_response_type" className="cursor-pointer flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Tipo de Resposta
                </Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Headers Customizados (Opcional) */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded px-2">
              <span className="text-sm text-muted-foreground">Headers customizados (opcional)</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Chave (ex: Authorization)"
                  value={newHeaderKey}
                  onChange={(e) => setNewHeaderKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Valor (ex: Bearer token...)"
                  value={newHeaderValue}
                  onChange={(e) => setNewHeaderValue(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addHeader}
                  disabled={!newHeaderKey.trim() || !newHeaderValue.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {Object.entries(config.external_webhook_headers || {}).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(config.external_webhook_headers || {}).map(([key]) => (
                    <Badge key={key} variant="secondary" className="gap-1">
                      {key}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeHeader(key)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Filtros Avançados (Opcional) */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded px-2">
              <span className="text-sm text-muted-foreground">Filtros avançados (opcional)</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3 pl-2">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter_only_responses"
                  checked={config.filter_only_responses}
                  onCheckedChange={(checked) => updateConfig({ filter_only_responses: !!checked })}
                />
                <Label htmlFor="filter_only_responses" className="cursor-pointer">
                  Apenas respostas (ignorar mensagens iniciais)
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter_only_buttons"
                  checked={config.filter_only_buttons}
                  onCheckedChange={(checked) => updateConfig({ filter_only_buttons: !!checked })}
                />
                <Label htmlFor="filter_only_buttons" className="cursor-pointer">
                  Apenas cliques em botões
                </Label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Telegram Integration Card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Integração Telegram</h3>
            </div>
            <Switch
              checked={config.telegram_enabled || false}
              onCheckedChange={(checked) => updateConfig({ telegram_enabled: checked })}
            />
          </div>

          {config.telegram_enabled && (
            <div className="space-y-4">
              {/* Chat ID */}
              <div className="space-y-2">
                <Label>Chat ID (Canal ou Grupo)</Label>
                <Input
                  placeholder="Ex: -1001234567890 ou @meuchannel"
                  value={config.telegram_chat_id || ''}
                  onChange={(e) => updateConfig({ telegram_chat_id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use @BotFather para criar o bot. Adicione o bot ao canal/grupo e use @userinfobot para pegar o ID.
                </p>
              </div>

              {/* Tipo de destino */}
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="telegram_send_to_channel"
                    checked={config.telegram_send_to_channel}
                    onCheckedChange={(checked) => updateConfig({ telegram_send_to_channel: !!checked })}
                  />
                  <Label htmlFor="telegram_send_to_channel" className="cursor-pointer flex items-center gap-1">
                    <Hash className="h-4 w-4" />
                    Canal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="telegram_send_to_group"
                    checked={config.telegram_send_to_group}
                    onCheckedChange={(checked) => updateConfig({ telegram_send_to_group: !!checked })}
                  />
                  <Label htmlFor="telegram_send_to_group" className="cursor-pointer flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Grupo
                  </Label>
                </div>
              </div>

              {/* Filtro de palavras-chave */}
              <div className="space-y-2">
                <Label>Filtro por palavras-chave (opcional)</Label>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para enviar todas as mensagens. Adicione palavras para filtrar.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma palavra-chave..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newKeyword.trim()) {
                          updateConfig({ 
                            telegram_filter_keywords: [...(config.telegram_filter_keywords || []), newKeyword.trim()] 
                          });
                          setNewKeyword("");
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newKeyword.trim()) {
                        updateConfig({ 
                          telegram_filter_keywords: [...(config.telegram_filter_keywords || []), newKeyword.trim()] 
                        });
                        setNewKeyword("");
                      }
                    }}
                    disabled={!newKeyword.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {(config.telegram_filter_keywords || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.telegram_filter_keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {keyword}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => updateConfig({ 
                            telegram_filter_keywords: config.telegram_filter_keywords.filter((_, i) => i !== idx) 
                          })}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Modo do filtro */}
              <div className="space-y-2">
                <Label>Modo do filtro</Label>
                <Select 
                  value={config.telegram_filter_mode || 'contains'} 
                  onValueChange={(value) => updateConfig({ telegram_filter_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém qualquer palavra</SelectItem>
                    <SelectItem value="exact">Contém frase exata</SelectItem>
                    <SelectItem value="starts">Começa com</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de teste */}
              <Button 
                variant="outline" 
                onClick={async () => {
                  if (!config.telegram_chat_id) {
                    toast.error("Configure o Chat ID primeiro");
                    return;
                  }
                  setIsTestingTelegram(true);
                  try {
                    const response = await supabase.functions.invoke('telegram-send', {
                      body: {
                        chat_id: config.telegram_chat_id,
                        message: `🧪 *Teste de Integração*\n\n✅ Telegram conectado com sucesso!\n\n📱 Sistema: MarketFlow\n⏰ ${new Date().toLocaleString('pt-BR')}`
                      }
                    });
                    if (response.error) throw response.error;
                    toast.success("Mensagem de teste enviada!");
                  } catch (err: any) {
                    console.error("Telegram test error:", err);
                    toast.error("Erro ao enviar teste. Verifique o token e Chat ID.");
                  }
                  setIsTestingTelegram(false);
                }}
                disabled={isTestingTelegram || !config.telegram_chat_id}
                className="w-full"
              >
                {isTestingTelegram ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Testar Telegram
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-3">
        <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configuração
            </>
          )}
        </Button>

        {config.external_webhook_url && (
          <Button 
            variant="outline" 
            onClick={testExternalWebhook}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Testar
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
