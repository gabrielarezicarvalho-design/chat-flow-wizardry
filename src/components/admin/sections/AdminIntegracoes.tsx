import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plug, Webhook, Cloud, RefreshCw, CheckCircle, XCircle,
  Key, Save, Copy, Loader2, Shield, MessageSquare, Bell, Bot,
} from "lucide-react";
import { ApifyUsageCard } from "@/components/admin/ApifyUsageCard";

interface SecretItem {
  name: string;
  label: string;
  category: string;
  description: string;
  configured: boolean;
}
interface WebhookItem { name: string; url: string; description: string }

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  ai: { label: "Inteligência Artificial", icon: Bot, color: "text-purple-400" },
  whatsapp: { label: "WhatsApp / Meta", icon: MessageSquare, color: "text-emerald-400" },
  auth: { label: "Autenticação Social", icon: Shield, color: "text-cyan-400" },
  notifications: { label: "Notificações", icon: Bell, color: "text-amber-400" },
};

export function AdminIntegracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [settings, setSettings] = useState({
    whatsapp_webhook_callback_url: "",
    whatsapp_verify_token: "",
    meta_api_version: "v21.0",
    environment: "production",
  });
  const [settingsId, setSettingsId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statusRes, settingsRes] = await Promise.all([
        supabase.functions.invoke("admin-integrations-status"),
        supabase.from("app_settings").select("*").order("id", { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (statusRes.error) throw statusRes.error;
      setSecrets(statusRes.data.secrets || []);
      setWebhooks(statusRes.data.webhooks || []);
      if (settingsRes.data) {
        setSettingsId(settingsRes.data.id);
        setSettings({
          whatsapp_webhook_callback_url: settingsRes.data.whatsapp_webhook_callback_url || "",
          whatsapp_verify_token: settingsRes.data.whatsapp_verify_token || "",
          meta_api_version: settingsRes.data.meta_api_version || "v21.0",
          environment: settingsRes.data.environment || "production",
        });
      }
    } catch (e: any) {
      toast.error("Erro ao carregar: " + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = { ...settings, updated_at: new Date().toISOString() };
      const { error } = settingsId
        ? await supabase.from("app_settings").update(payload).eq("id", settingsId)
        : await supabase.from("app_settings").insert(payload);
      if (error) throw error;
      toast.success("Configurações salvas");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const configuredCount = secrets.filter(s => s.configured).length;
  const missingCount = secrets.filter(s => !s.configured).length;

  const grouped = secrets.reduce((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {} as Record<string, SecretItem[]>);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrações da Plataforma</h1>
          <p className="text-slate-400">APIs globais, webhooks e credenciais compartilhadas por todas as empresas</p>
        </div>
        <Button onClick={load} variant="outline" className="border-white/10">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={CheckCircle} value={configuredCount} label="APIs Configuradas" color="emerald" />
        <StatCard icon={XCircle} value={missingCount} label="Faltando Configurar" color="red" />
        <StatCard icon={Plug} value={webhooks.length} label="Webhooks Ativos" color="purple" />
      </div>

      {/* Apify usage */}
      <ApifyUsageCard />



      <Tabs defaultValue="apis" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="apis"><Key className="h-4 w-4 mr-2" />APIs & Secrets</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-2" />Webhooks</TabsTrigger>
          <TabsTrigger value="meta"><MessageSquare className="h-4 w-4 mr-2" />Meta / WhatsApp</TabsTrigger>
        </TabsList>

        {/* APIs */}
        <TabsContent value="apis" className="space-y-6 mt-6">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
            💡 Chaves globais ficam salvas no cofre de secrets do Lovable Cloud e são usadas por todas as empresas.
            Para adicionar ou alterar uma chave, use o botão <strong>"Configurar"</strong> — o Lovable abrirá um formulário seguro.
          </div>

          {Object.entries(grouped).map(([cat, items]) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                  <h2 className="text-lg font-semibold text-white">{meta.label}</h2>
                </div>
                <div className="space-y-2">
                  {items.map((s) => (
                    <div key={s.name} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-white">{s.label}</p>
                          <Badge variant="outline" className="text-xs font-mono border-white/10 text-slate-400">
                            {s.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{s.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {s.configured ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />Configurado
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <XCircle className="h-3 w-3 mr-1" />Faltando
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10"
                          onClick={() => toast.info(
                            `Peça ao chat: "Configure o secret ${s.name}" — um formulário seguro será aberto para você colar o valor.`
                          )}
                        >
                          {s.configured ? "Atualizar" : "Configurar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks" className="space-y-4 mt-6">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
            💡 Copie estas URLs e cadastre no painel do serviço externo (Meta Developers, Evolution, Asaas etc).
          </div>
          {webhooks.map((w) => (
            <div key={w.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-white">{w.name}</p>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(w.url)}>
                  <Copy className="h-4 w-4 mr-2" />Copiar
                </Button>
              </div>
              <p className="text-xs text-slate-400 mb-2">{w.description}</p>
              <code className="text-xs text-cyan-300 bg-black/30 p-2 rounded block break-all font-mono">
                {w.url}
              </code>
            </div>
          ))}
        </TabsContent>

        {/* Meta / WhatsApp */}
        <TabsContent value="meta" className="space-y-4 mt-6">
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cloud className="h-5 w-5 text-emerald-400" /> Configurações Globais WhatsApp
            </h2>
            <div>
              <Label className="text-slate-300">URL de Callback do Webhook</Label>
              <Input
                value={settings.whatsapp_webhook_callback_url}
                onChange={(e) => setSettings({ ...settings, whatsapp_webhook_callback_url: e.target.value })}
                placeholder="https://seu-dominio.com/webhook"
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Verify Token (Meta)</Label>
              <Input
                value={settings.whatsapp_verify_token}
                onChange={(e) => setSettings({ ...settings, whatsapp_verify_token: e.target.value })}
                placeholder="token-de-verificacao"
                className="bg-white/5 border-white/10 text-white mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Use este token ao cadastrar o webhook no Meta Developers.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Versão da API Meta</Label>
                <Input
                  value={settings.meta_api_version}
                  onChange={(e) => setSettings({ ...settings, meta_api_version: e.target.value })}
                  placeholder="v21.0"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Ambiente</Label>
                <Input
                  value={settings.environment}
                  onChange={(e) => setSettings({ ...settings, environment: e.target.value })}
                  placeholder="production | sandbox"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            </div>
            <Button onClick={saveSettings} disabled={saving} className="bg-primary">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }: any) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/20 text-red-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
  };
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br border ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8" />
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
