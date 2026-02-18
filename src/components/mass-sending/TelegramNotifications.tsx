import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell, Bot, Hash, Plus, Trash2, Save, Loader2, 
  Send, Megaphone, MessageSquare, Filter, X, TestTube
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Connection {
  id: string;
  name: string;
}

interface TelegramNotificationsProps {
  connections: Connection[];
}

interface TelegramConfig {
  id?: string;
  user_id?: string;
  name: string;
  is_active: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  notify_campaign_start: boolean;
  notify_lead_response: boolean;
  filter_keywords: string[];
  filter_mode: string;
  connection_id: string | null;
}

const defaultConfig: TelegramConfig = {
  name: "Configuração Padrão",
  is_active: true,
  telegram_bot_token: "",
  telegram_chat_id: "",
  notify_campaign_start: true,
  notify_lead_response: true,
  filter_keywords: [],
  filter_mode: "contains",
  connection_id: null,
};

export function TelegramNotifications({ connections }: TelegramNotificationsProps) {
  const [config, setConfig] = useState<TelegramConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("telegram_notification_configs")
        .select("*")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfigId(data.id);
        setConfig({
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          is_active: data.is_active,
          telegram_bot_token: data.telegram_bot_token || "",
          telegram_chat_id: data.telegram_chat_id,
          notify_campaign_start: data.notify_campaign_start,
          notify_lead_response: data.notify_lead_response,
          filter_keywords: data.filter_keywords || [],
          filter_mode: data.filter_mode,
          connection_id: data.connection_id,
        });
      }
    } catch (err) {
      console.error("Error loading telegram config:", err);
    }
    setIsLoading(false);
  };

  const saveConfig = async () => {
    if (!config.telegram_chat_id.trim()) {
      toast.error("Informe o Chat ID do Telegram");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const payload = {
        user_id: userData.user.id,
        name: config.name,
        is_active: config.is_active,
        telegram_bot_token: config.telegram_bot_token || null,
        telegram_chat_id: config.telegram_chat_id,
        notify_campaign_start: config.notify_campaign_start,
        notify_lead_response: config.notify_lead_response,
        filter_keywords: config.filter_keywords,
        filter_mode: config.filter_mode,
        connection_id: config.connection_id,
      };

      if (configId) {
        const { error } = await supabase
          .from("telegram_notification_configs")
          .update(payload)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("telegram_notification_configs")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setConfigId(data.id);
      }

      toast.success("Configuração salva com sucesso!");
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error("Erro ao salvar: " + err.message);
    }
    setIsSaving(false);
  };

  const testTelegram = async () => {
    if (!config.telegram_chat_id.trim()) {
      toast.error("Informe o Chat ID do Telegram");
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-send", {
        body: {
          chat_id: config.telegram_chat_id,
          message: "🔔 *Teste MarketFlow*\n\n✅ Notificações configuradas com sucesso!\n\nVocê receberá alertas de:\n📢 Início de campanhas\n💬 Respostas de leads",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Mensagem de teste enviada!");
    } catch (err: any) {
      console.error("Telegram test error:", err);
      toast.error("Erro ao enviar teste: " + err.message);
    }
    setIsTesting(false);
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    if (config.filter_keywords.includes(kw)) {
      toast.error("Palavra-chave já adicionada");
      return;
    }
    setConfig({ ...config, filter_keywords: [...config.filter_keywords, kw] });
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setConfig({ ...config, filter_keywords: config.filter_keywords.filter(k => k !== kw) });
  };

  const updateConfig = (updates: Partial<TelegramConfig>) => {
    setConfig({ ...config, ...updates });
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
          <Bell className="h-5 w-5" />
          Notificações Telegram
        </h2>
        <p className="text-muted-foreground text-sm">
          Receba notificações no Telegram quando campanhas forem iniciadas ou leads responderem
        </p>
      </div>

      {/* Main Config */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Ativo */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notificações ativas
            </Label>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => updateConfig({ is_active: checked })}
            />
          </div>

          {/* Bot Token */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              Token do Bot (opcional - usa o padrão se vazio)
            </Label>
            <Input
              placeholder="Cole o token do bot do Telegram (ex: 123456:ABC-DEF...)"
              value={config.telegram_bot_token}
              onChange={(e) => updateConfig({ telegram_bot_token: e.target.value })}
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar o bot padrão do sistema. Crie seu bot com @BotFather no Telegram.
            </p>
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Chat ID do Grupo/Canal
            </Label>
            <Input
              placeholder="Ex: -1001234567890"
              value={config.telegram_chat_id}
              onChange={(e) => updateConfig({ telegram_chat_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use @userinfobot ou @RawDataBot no Telegram para descobrir o ID do grupo.
            </p>
          </div>

          {/* Conexão */}
          <div className="space-y-2">
            <Label>Conexão (filtrar por)</Label>
            <Select
              value={config.connection_id || "all"}
              onValueChange={(v) => updateConfig({ connection_id: v === "all" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as conexões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as conexões</SelectItem>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Campaign Start */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Início de Campanha</h3>
              </div>
              <Switch
                checked={config.notify_campaign_start}
                onCheckedChange={(checked) => updateConfig({ notify_campaign_start: checked })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Receba uma notificação sempre que uma campanha for iniciada, com nome, total de contatos e tipo de mensagem.
            </p>
          </CardContent>
        </Card>

        {/* Lead Response */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Respostas de Leads</h3>
              </div>
              <Switch
                checked={config.notify_lead_response}
                onCheckedChange={(checked) => updateConfig({ notify_lead_response: checked })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Receba a mensagem do lead no Telegram quando ele responder, filtrada por palavras-chave.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Keyword Filter */}
      {config.notify_lead_response && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Filtro por Palavras-chave</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Se nenhuma palavra-chave for adicionada, todas as respostas serão notificadas. Adicione palavras para filtrar apenas mensagens relevantes.
            </p>

            {/* Filter Mode */}
            <div className="space-y-2">
              <Label>Modo do filtro</Label>
              <Select
                value={config.filter_mode}
                onValueChange={(v) => updateConfig({ filter_mode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contém qualquer palavra</SelectItem>
                  <SelectItem value="all">Contém todas as palavras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Keywords */}
            <div className="flex gap-2">
              <Input
                placeholder="Digite uma palavra-chave..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              />
              <Button variant="outline" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {config.filter_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.filter_keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configuração
        </Button>
        <Button
          variant="outline"
          onClick={testTelegram}
          disabled={isTesting || !config.telegram_chat_id}
        >
          {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Testar
        </Button>
      </div>
    </div>
  );
}
