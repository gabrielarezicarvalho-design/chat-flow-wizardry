import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare, Plug, CheckCircle, XCircle, AlertTriangle,
  Loader2, RefreshCw, Send, QrCode, Copy, Eye, EyeOff, ArrowLeft, Trash2
} from "lucide-react";

interface WhatsAppConnection {
  id: string;
  company_id: string;
  provider: "meta" | "qr";
  status: "connected" | "disconnected" | "error";
  meta_phone_number_id: string | null;
  meta_waba_id: string | null;
  meta_access_token: string | null;
  meta_verify_token: string | null;
  qr_api_url: string | null;
  qr_instance_id: string | null;
  qr_api_token: string | null;
  last_error: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  companyId: string;
  companyName: string;
  onBack: () => void;
}

export function CompanyWhatsAppConnections({ companyId, companyName, onBack }: Props) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const [provider, setProvider] = useState<"meta" | "qr">("meta");
  const [form, setForm] = useState({
    meta_phone_number_id: "",
    meta_waba_id: "",
    meta_access_token: "",
    meta_verify_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    qr_api_url: "",
    qr_instance_id: "",
    qr_api_token: "",
  });

  useEffect(() => {
    fetchConnection();
  }, [companyId]);

  const fetchConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_connections" as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) throw error;
      setConnection(data as any);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        company_id: companyId,
        provider,
        status: "disconnected",
      };

      if (provider === "meta") {
        if (!form.meta_phone_number_id || !form.meta_access_token) {
          toast.error("Preencha Phone Number ID e Access Token");
          setSaving(false);
          return;
        }
        payload.meta_phone_number_id = form.meta_phone_number_id;
        payload.meta_waba_id = form.meta_waba_id;
        payload.meta_access_token = form.meta_access_token;
        payload.meta_verify_token = form.meta_verify_token;
        payload.qr_api_url = null;
        payload.qr_instance_id = null;
        payload.qr_api_token = null;
      } else {
        if (!form.qr_api_url || !form.qr_instance_id || !form.qr_api_token) {
          toast.error("Preencha todos os campos do provedor QR");
          setSaving(false);
          return;
        }
        payload.qr_api_url = form.qr_api_url;
        payload.qr_instance_id = form.qr_instance_id;
        payload.qr_api_token = form.qr_api_token;
        payload.meta_phone_number_id = null;
        payload.meta_waba_id = null;
        payload.meta_access_token = null;
        payload.meta_verify_token = null;
      }

      if (connection) {
        const { error } = await supabase
          .from("whatsapp_connections" as any)
          .update(payload)
          .eq("id", connection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_connections" as any)
          .insert(payload);
        if (error) throw error;
      }

      toast.success("Conexão salva com sucesso!");
      setShowWizard(false);
      fetchConnection();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone) {
      toast.error("Informe o número de teste");
      return;
    }
    setTesting(true);
    try {
      const fnName = connection?.provider === "meta" ? "whatsapp-send" : "qr-send";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { company_id: companyId, to: testPhone, text: "Teste MarketFlow ✅" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update status to connected
      await supabase
        .from("whatsapp_connections" as any)
        .update({ status: "connected", last_error: null, last_tested_at: new Date().toISOString() })
        .eq("company_id", companyId);

      toast.success("Mensagem de teste enviada com sucesso!");
      setShowTestDialog(false);
      setTestPhone("");
      fetchConnection();
    } catch (error: any) {
      console.error("Test error:", error);
      toast.error("Erro no envio: " + (error.message || "Falha"));
    } finally {
      setTesting(false);
    }
  };

  const handleGetQrCode = async () => {
    setLoadingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke("qr-get-qrcode", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      if (data?.qrcode) {
        setQrCodeData(typeof data.qrcode === "string" ? data.qrcode : JSON.stringify(data.qrcode));
      } else {
        toast.error("QR Code não disponível");
      }
    } catch (error: any) {
      toast.error("Erro ao obter QR: " + (error.message || "Falha"));
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    if (!confirm("Desativar esta conexão WhatsApp?")) return;
    try {
      await supabase
        .from("whatsapp_connections" as any)
        .update({ status: "disconnected" })
        .eq("id", connection.id);
      toast.success("Conexão desativada");
      fetchConnection();
    } catch (error) {
      toast.error("Erro ao desativar");
    }
  };

  const handleDelete = async () => {
    if (!connection) return;
    if (!confirm("Excluir permanentemente esta conexão?")) return;
    try {
      await supabase
        .from("whatsapp_connections" as any)
        .delete()
        .eq("id", connection.id);
      toast.success("Conexão excluída");
      setConnection(null);
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const openEdit = () => {
    if (connection) {
      setProvider(connection.provider);
      setForm({
        meta_phone_number_id: connection.meta_phone_number_id || "",
        meta_waba_id: connection.meta_waba_id || "",
        meta_access_token: connection.meta_access_token || "",
        meta_verify_token: connection.meta_verify_token || crypto.randomUUID().replace(/-/g, "").slice(0, 16),
        qr_api_url: connection.qr_api_url || "",
        qr_instance_id: connection.qr_instance_id || "",
        qr_api_token: connection.qr_api_token || "",
      });
    } else {
      setProvider("meta");
      setForm({
        meta_phone_number_id: "",
        meta_waba_id: "",
        meta_access_token: "",
        meta_verify_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
        qr_api_url: "",
        qr_instance_id: "",
        qr_api_token: "",
      });
    }
    setShowWizard(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const toggleTokenVisibility = (field: string) => {
    setShowTokens(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const statusConfig = {
    connected: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Conectado" },
    disconnected: { icon: XCircle, color: "text-slate-400", bg: "bg-slate-500/20", label: "Desconectado" },
    error: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20", label: "Erro" },
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Conexões WhatsApp</h1>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Conexões WhatsApp</h1>
            <p className="text-slate-400">{companyName}</p>
          </div>
        </div>
        <Button onClick={fetchConnection} variant="outline" className="border-white/10 text-slate-300">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Connection Card */}
      {connection ? (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">WhatsApp</h2>
                  <p className="text-sm text-slate-400">
                    Provedor: {connection.provider === "meta" ? "API Oficial Meta (Cloud API)" : "QR Code (Z-API/UAzapi)"}
                  </p>
                </div>
              </div>
              <Badge className={`${statusConfig[connection.status].bg} ${statusConfig[connection.status].color}`}>
                {(() => { const Icon = statusConfig[connection.status].icon; return <Icon className="h-3 w-3 mr-1" />; })()}
                {statusConfig[connection.status].label}
              </Badge>
            </div>

            {connection.last_error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-sm text-red-400"><AlertTriangle className="h-4 w-4 inline mr-1" />Último erro: {connection.last_error}</p>
              </div>
            )}

            {/* Meta webhook info */}
            {connection.provider === "meta" && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                <p className="text-sm font-medium text-amber-300 mb-2">⚠️ Configure o Webhook na Meta:</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-400">Callback URL</Label>
                    <div className="flex items-center gap-2">
                      <Input value={webhookUrl} readOnly className="bg-white/5 border-white/10 text-white text-xs" />
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(webhookUrl)}>
                        <Copy className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Verify Token</Label>
                    <div className="flex items-center gap-2">
                      <Input value={connection.meta_verify_token || ""} readOnly className="bg-white/5 border-white/10 text-white text-xs" />
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(connection.meta_verify_token || "")}>
                        <Copy className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code section */}
            {connection.provider === "qr" && (
              <div className="mb-4">
                <Button onClick={handleGetQrCode} disabled={loadingQr} variant="outline" className="border-white/10 text-white">
                  {loadingQr ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Gerar QR Code
                </Button>
                {qrCodeData && (
                  <div className="mt-4 p-4 bg-white rounded-xl inline-block">
                    <img src={qrCodeData.startsWith("data:") ? qrCodeData : `data:image/png;base64,${qrCodeData}`} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <Button onClick={openEdit} variant="outline" className="border-white/10 text-white">
                <Plug className="h-4 w-4 mr-2" />
                Alterar
              </Button>
              <Button onClick={() => setShowTestDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="h-4 w-4 mr-2" />
                Testar Envio
              </Button>
              <Button onClick={handleDisconnect} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                Desativar
              </Button>
              <Button onClick={handleDelete} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>

          {/* Connection Details */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Detalhes da Conexão</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {connection.provider === "meta" ? (
                <>
                  <div><span className="text-slate-500">Phone Number ID:</span> <span className="text-white ml-2">{connection.meta_phone_number_id}</span></div>
                  <div><span className="text-slate-500">WABA ID:</span> <span className="text-white ml-2">{connection.meta_waba_id || "—"}</span></div>
                  <div><span className="text-slate-500">Access Token:</span> <span className="text-white ml-2">••••••••</span></div>
                </>
              ) : (
                <>
                  <div><span className="text-slate-500">API URL:</span> <span className="text-white ml-2">{connection.qr_api_url}</span></div>
                  <div><span className="text-slate-500">Instance ID:</span> <span className="text-white ml-2">{connection.qr_instance_id}</span></div>
                  <div><span className="text-slate-500">API Token:</span> <span className="text-white ml-2">••••••••</span></div>
                </>
              )}
              <div><span className="text-slate-500">Último teste:</span> <span className="text-white ml-2">{connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleString("pt-BR") : "Nunca"}</span></div>
            </div>
          </div>
        </div>
      ) : (
        /* No connection - show CTA */
        <div className="p-12 text-center rounded-xl bg-white/5 border border-white/10">
          <div className="h-16 w-16 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Nenhuma conexão configurada</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Configure a conexão WhatsApp desta empresa para começar a enviar e receber mensagens.
          </p>
          <Button onClick={openEdit} className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
            <Plug className="h-4 w-4 mr-2" />
            Conectar WhatsApp
          </Button>
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{connection ? "Alterar Conexão" : "Conectar WhatsApp"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Escolha o provedor:</Label>
              <RadioGroup value={provider} onValueChange={(v) => setProvider(v as "meta" | "qr")} className="space-y-3">
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${provider === "meta" ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <RadioGroupItem value="meta" />
                  <div>
                    <p className="font-medium text-white">API Oficial Meta (Cloud API)</p>
                    <p className="text-xs text-slate-400">Conexão oficial via Meta Business Platform</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${provider === "qr" ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <RadioGroupItem value="qr" />
                  <div>
                    <p className="font-medium text-white">QR Code (Z-API/UAzapi)</p>
                    <p className="text-xs text-slate-400">Conexão via escaneamento de QR Code</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Meta Form */}
            {provider === "meta" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Phone Number ID *</Label>
                  <Input value={form.meta_phone_number_id} onChange={(e) => setForm({ ...form, meta_phone_number_id: e.target.value })} className="bg-white/5 border-white/10" placeholder="Ex: 123456789012345" />
                </div>
                <div className="space-y-2">
                  <Label>WABA ID</Label>
                  <Input value={form.meta_waba_id} onChange={(e) => setForm({ ...form, meta_waba_id: e.target.value })} className="bg-white/5 border-white/10" placeholder="Ex: 987654321098765" />
                </div>
                <div className="space-y-2">
                  <Label>Access Token *</Label>
                  <div className="relative">
                    <Input type={showTokens.meta_access_token ? "text" : "password"} value={form.meta_access_token} onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })} className="bg-white/5 border-white/10 pr-10" placeholder="Token de acesso da Meta" />
                    <button type="button" onClick={() => toggleTokenVisibility("meta_access_token")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showTokens.meta_access_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Verify Token (gerado automaticamente)</Label>
                  <div className="flex items-center gap-2">
                    <Input value={form.meta_verify_token} readOnly className="bg-white/5 border-white/10" />
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(form.meta_verify_token)}>
                      <Copy className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300">
                    💡 Após salvar, configure o Webhook na Meta com a Callback URL e o Verify Token exibidos na tela de detalhes.
                  </p>
                </div>
              </div>
            )}

            {/* QR Form */}
            {provider === "qr" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>API URL *</Label>
                  <Input value={form.qr_api_url} onChange={(e) => setForm({ ...form, qr_api_url: e.target.value })} className="bg-white/5 border-white/10" placeholder="https://api.seuprovedor.com" />
                </div>
                <div className="space-y-2">
                  <Label>Instance ID *</Label>
                  <Input value={form.qr_instance_id} onChange={(e) => setForm({ ...form, qr_instance_id: e.target.value })} className="bg-white/5 border-white/10" placeholder="ID da instância" />
                </div>
                <div className="space-y-2">
                  <Label>API Token *</Label>
                  <div className="relative">
                    <Input type={showTokens.qr_api_token ? "text" : "password"} value={form.qr_api_token} onChange={(e) => setForm({ ...form, qr_api_token: e.target.value })} className="bg-white/5 border-white/10 pr-10" placeholder="Token da API" />
                    <button type="button" onClick={() => toggleTokenVisibility("qr_api_token")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showTokens.qr_api_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowWizard(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Salvar Conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Testar Envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número de destino</Label>
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="bg-white/5 border-white/10" placeholder="5511999999999" />
              <p className="text-xs text-slate-500">Formato: código do país + DDD + número</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTestDialog(false)} className="text-slate-400">Cancelar</Button>
            <Button onClick={handleTest} disabled={testing} className="bg-emerald-600 hover:bg-emerald-700">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
