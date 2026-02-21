import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Bot, DollarSign, AlertTriangle, RefreshCw, Loader2,
  Bell, BellOff, TrendingDown, CheckCircle, Settings2, Send
} from "lucide-react";

interface CreditInfo {
  total_granted: number;
  total_used: number;
  total_available: number;
  has_payment_method: boolean;
}

interface NotificationConfig {
  enabled: boolean;
  threshold: number;
  api_key: string;
  telegram_chat_id: string;
  telegram_bot_token: string;
}

export default function ChatGPTCredits() {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);
  const [config, setConfig] = useState<NotificationConfig>({
    enabled: false,
    threshold: 20,
    api_key: "",
    telegram_chat_id: "",
    telegram_bot_token: "",
  });
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [user?.id, companyId]);

  const loadConfig = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "openai_credits_config")
        .eq("company_id", companyId)
        .maybeSingle();

      if (data?.value) {
        const val = data.value as any;
        setConfig({
          enabled: val.enabled || false,
          threshold: val.threshold || 20,
          api_key: val.api_key || "",
          telegram_chat_id: val.telegram_chat_id || "",
          telegram_bot_token: val.telegram_bot_token || "",
        });
      }
    } catch (err) {
      console.error("Error loading config:", err);
    }
  };

  const saveConfig = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const configData = {
        enabled: config.enabled,
        threshold: config.threshold,
        api_key: config.api_key,
        telegram_chat_id: config.telegram_chat_id,
        telegram_bot_token: config.telegram_bot_token,
      };

      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "openai_credits_config")
        .eq("company_id", companyId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("settings")
          .update({ value: configData as any })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("settings")
          .insert({
            key: "openai_credits_config",
            company_id: companyId,
            value: configData as any,
          });
      }

      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const checkCredits = async () => {
    if (!config.api_key) {
      toast.error("Insira sua API Key da OpenAI primeiro");
      return;
    }
    setCheckingCredits(true);
    try {
      const { data, error } = await supabase.functions.invoke("openai-credits", {
        body: { api_key: config.api_key },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setCredits(data);

      if (data.total_granted > 0) {
        const percentRemaining = (data.total_available / data.total_granted) * 100;
        if (percentRemaining <= config.threshold) {
          toast.warning(`⚠️ Seus créditos estão em ${percentRemaining.toFixed(1)}%! Considere recarregar.`);
        }
      }

      toast.success("Créditos verificados!");
    } catch (err: any) {
      console.error("Error checking credits:", err);
      toast.error("Erro ao verificar créditos. Verifique sua API Key.");
    } finally {
      setCheckingCredits(false);
    }
  };

  const testTelegram = async () => {
    if (!config.telegram_chat_id) {
      toast.error("Insira o Chat ID do Telegram");
      return;
    }
    setTestingTelegram(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-send", {
        body: {
          chat_id: config.telegram_chat_id,
          message: "✅ *Teste de Notificação*\n\nSua integração com alertas de créditos OpenAI está funcionando!",
          bot_token: config.telegram_bot_token || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(`Erro Telegram: ${data.error}`);
        return;
      }
      toast.success("Mensagem de teste enviada ao Telegram!");
    } catch (err) {
      toast.error("Erro ao enviar teste. Verifique o Bot Token e Chat ID.");
    } finally {
      setTestingTelegram(false);
    }
  };

  const getUsagePercentage = () => {
    if (!credits || credits.total_granted === 0) return 0;
    return (credits.total_used / credits.total_granted) * 100;
  };

  const getRemainingPercentage = () => {
    if (!credits || credits.total_granted === 0) return 0;
    return (credits.total_available / credits.total_granted) * 100;
  };

  const getStatusColor = () => {
    const remaining = getRemainingPercentage();
    if (remaining > 50) return "text-emerald-400";
    if (remaining > 20) return "text-amber-400";
    return "text-red-400";
  };

  const getStatusBg = () => {
    const remaining = getRemainingPercentage();
    if (remaining > 50) return "bg-emerald-500";
    if (remaining > 20) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Bot className="h-7 w-7 text-emerald-500" />
          ChatGPT / OpenAI
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitore seus créditos da OpenAI e receba alertas via Telegram quando estiverem acabando
        </p>
      </div>

      {/* Config Card */}
      <Card className="p-6 border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Configuração</h2>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key da OpenAI</Label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="sk-..."
                className="bg-background border-border"
              />
              <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Acesse platform.openai.com → API Keys para gerar sua chave
            </p>
          </div>

          {/* Notifications toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {config.enabled ? (
                <Bell className="h-5 w-5 text-emerald-500" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label>Notificações automáticas via Telegram</Label>
                <p className="text-xs text-muted-foreground">Verificação periódica a cada hora com alerta no Telegram</p>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {config.enabled && (
            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-2">
                <Label>Alertar quando restar menos de (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={config.threshold}
                  onChange={(e) => setConfig({ ...config, threshold: Number(e.target.value) })}
                  className="bg-background border-border w-32"
                />
              </div>

              <div className="space-y-2">
                <Label>Telegram Chat ID</Label>
                <Input
                  value={config.telegram_chat_id}
                  onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
                  placeholder="Ex: -1001234567890"
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Envie /start para @userinfobot no Telegram para obter seu Chat ID
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bot Token do Telegram (opcional)</Label>
                <Input
                  value={config.telegram_bot_token}
                  onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
                  placeholder="Deixe vazio para usar o bot padrão"
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Crie um bot com @BotFather ou deixe em branco para usar o bot do sistema
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={testTelegram}
                disabled={testingTelegram || !config.telegram_chat_id}
              >
                {testingTelegram ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Teste no Telegram
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Configurações
            </Button>
            <Button
              variant="outline"
              onClick={checkCredits}
              disabled={checkingCredits || !config.api_key}
            >
              {checkingCredits ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verificar Créditos Agora
            </Button>
          </div>
        </div>
      </Card>

      {/* Credits Display */}
      {credits && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-border bg-card">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">${credits.total_granted.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Créditos Totais</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">${credits.total_used.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Utilizados</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card">
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-8 w-8 ${getStatusColor()}`} />
                <div>
                  <p className={`text-2xl font-bold ${getStatusColor()}`}>${credits.total_available.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Disponível</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Uso dos créditos</span>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getRemainingPercentage().toFixed(1)}% restante
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getStatusBg()}`}
                style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
              />
            </div>
            {getRemainingPercentage() <= config.threshold && (
              <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Seus créditos estão baixos! Considere recarregar.</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {!credits && !checkingCredits && (
        <Card className="p-6 border-border bg-card text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Configure sua API Key e clique em "Verificar Créditos" para ver o status dos seus créditos OpenAI
          </p>
        </Card>
      )}
    </div>
  );
}
