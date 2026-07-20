import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe, Copy, Save, RefreshCw, Loader2, CheckCircle, AlertCircle,
  Webhook, Shield, Server
} from "lucide-react";

export default function AdminWhatsAppMeta() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [apiVersion, setApiVersion] = useState("v22.0");
  const [environment, setEnvironment] = useState("PROD");

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings" as any)
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setVerifyToken((data as any).whatsapp_verify_token || "");
        setApiVersion((data as any).meta_api_version || "v22.0");
        setEnvironment((data as any).environment || "PROD");
      }
    } catch (err) {
      console.error("Error fetching app_settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings" as any)
        .update({
          whatsapp_verify_token: verifyToken,
          meta_api_version: apiVersion,
          environment,
          whatsapp_webhook_callback_url: webhookUrl,
        } as any)
        .eq("id", 1);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      const testUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=test_challenge_123`;
      const res = await fetch(testUrl);
      if (res.ok) {
        const text = await res.text();
        if (text === "test_challenge_123") {
          toast.success("Webhook validado com sucesso! ✅");
        } else {
          toast.warning(`Webhook respondeu, mas challenge diferente: ${text}`);
        }
      } else {
        toast.error(`Webhook retornou status ${res.status}`);
      }
    } catch (err: any) {
      toast.error("Erro ao testar webhook: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <Globe className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">WhatsApp API Oficial Meta</h1>
            <p className="text-slate-400">Configuração global do webhook e API</p>
          </div>
        </div>
        <Badge className="bg-amber-500/20 text-amber-400 mt-2">
          Configuração Master — afeta todas as empresas
        </Badge>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-8">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-cyan-400 mb-1">Como configurar</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Defina o <strong>Verify Token</strong> abaixo e salve</li>
              <li>Copie a <strong>Callback URL</strong> e o <strong>Verify Token</strong></li>
              <li>No <strong>Meta Developers → WhatsApp → Configuração → Webhook</strong>, cole os valores</li>
              <li>Clique em <strong>Testar Webhook</strong> para validar</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Webhook Callback URL */}
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Webhook className="h-4 w-4 text-emerald-400" />
            <label className="text-sm font-medium text-white">Webhook Callback URL</label>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">read-only</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="bg-slate-800/50 border-white/10 text-slate-300 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl, "Callback URL")}
              className="border-white/10 text-slate-300 hover:text-white flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Verify Token */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-purple-400" />
            <label className="text-sm font-medium text-white">Webhook Verify Token</label>
          </div>
          <div className="flex gap-2">
            <Input
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Digite um token de verificação seguro..."
              className="bg-slate-800/50 border-white/10 text-white"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(verifyToken, "Verify Token")}
              className="border-white/10 text-slate-300 hover:text-white flex-shrink-0"
              disabled={!verifyToken}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* API Version & Environment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-cyan-400" />
              <label className="text-sm font-medium text-white">Meta API Version</label>
            </div>
            <Input
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              placeholder="v22.0"
              className="bg-slate-800/50 border-white/10 text-white"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-amber-400" />
              <label className="text-sm font-medium text-white">Ambiente</label>
            </div>
            <div className="flex gap-2">
              {["DEV", "PROD"].map((env) => (
                <Button
                  key={env}
                  variant={environment === env ? "default" : "outline"}
                  onClick={() => setEnvironment(env)}
                  className={
                    environment === env
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-white/10 text-slate-300 hover:text-white"
                  }
                >
                  {env}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>

          <Button
            onClick={handleTestWebhook}
            disabled={testing || !verifyToken}
            variant="outline"
            className="border-white/10 text-slate-300 hover:text-white"
          >
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Testar Webhook
          </Button>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mt-4">
          <h3 className="text-sm font-medium text-white mb-3">Status da Configuração</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {verifyToken ? (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-400" />
              )}
              <span className={verifyToken ? "text-emerald-400" : "text-amber-400"}>
                Verify Token: {verifyToken ? "Configurado" : "Pendente"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400">Callback URL: Configurada</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-400">API Version: {apiVersion}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className={environment === "PROD" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>
                {environment}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
