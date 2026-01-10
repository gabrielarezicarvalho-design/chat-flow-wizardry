import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Webhook, User, Phone, MapPin, Clock, Tag, 
  MessageSquare, MousePointerClick, List, Plus, Trash2, Save, Loader2,
  ExternalLink, ChevronDown, FileText, Send
} from "lucide-react";
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
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
}

const defaultConfig: Omit<FieldConfig, 'id'> = {
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
  telegram_enabled: false,
  telegram_chat_id: null
};

export function WebhookFieldConfig({ connections, campaigns }: WebhookFieldConfigProps) {
  const [config, setConfig] = useState<FieldConfig>({ id: 'default', ...defaultConfig });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // Placeholder - would save to database
      toast.success("Configuração salva com sucesso!");
    } catch (err) {
      console.error("Error saving config:", err);
      toast.error("Erro ao salvar configuração");
    }
    setIsSaving(false);
  };

  const updateConfig = (updates: Partial<FieldConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const addHeader = () => {
    if (!newHeaderKey.trim() || !newHeaderValue.trim()) return;
    const newHeaders = { ...config.external_webhook_headers, [newHeaderKey]: newHeaderValue };
    updateConfig({ external_webhook_headers: newHeaders });
    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const removeHeader = (key: string) => {
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

          {/* Headers */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded px-2">
              <span className="font-medium">Headers Personalizados</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              {Object.entries(config.external_webhook_headers).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Input value={key} disabled className="flex-1" />
                  <Input value={value} disabled className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => removeHeader(key)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Header name" 
                  value={newHeaderKey}
                  onChange={(e) => setNewHeaderKey(e.target.value)}
                  className="flex-1"
                />
                <Input 
                  placeholder="Header value"
                  value={newHeaderValue}
                  onChange={(e) => setNewHeaderValue(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" variant="outline" onClick={addHeader}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configuração
            </Button>
            <Button 
              variant="outline" 
              onClick={testExternalWebhook}
              disabled={isTesting || !config.external_webhook_url}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Testar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}