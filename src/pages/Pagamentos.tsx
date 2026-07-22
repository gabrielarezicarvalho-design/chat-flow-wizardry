import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingDown,
  Sparkles,
  CreditCard,
  QrCode,
  Copy,
  ExternalLink,
  Trash2,
  ShieldCheck,
  MessageSquare,
  History,
  FileText,
  Wand2,
  Repeat,
} from "lucide-react";
import { RecorrentesPanel } from "@/components/pagamentos/RecorrentesPanel";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const monthsPt = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function Pagamentos() {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const qc = useQueryClient();

  const now = new Date();
  const [selMonth, setSelMonth] = useState(monthKey(now));
  const [tab, setTab] = useState("cobrancas");

  const [openCob, setOpenCob] = useState(false);
  const [openVenda, setOpenVenda] = useState(false);
  const [openCusto, setOpenCusto] = useState(false);
  const [openTemplates, setOpenTemplates] = useState(false);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = -12; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({
        value: monthKey(d),
        label: `${monthsPt[d.getMonth()]} de ${d.getFullYear()}`,
      });
    }
    return opts;
  }, []);

  const [year, month] = selMonth.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  // ============ QUERIES ============
  const { data: cobrancas = [], isLoading: loadCob } = useQuery({
    queryKey: ["cobrancas", companyId, selMonth],
    queryFn: async () => {
      let q = supabase
        .from("cobrancas")
        .select("*")
        .gte("vencimento", monthStart)
        .lte("vencimento", monthEnd)
        .order("vencimento", { ascending: true });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas", companyId, selMonth],
    queryFn: async () => {
      let q = supabase
        .from("vendas")
        .select("*")
        .gte("data", monthStart)
        .lte("data", monthEnd)
        .order("data", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: custos = [] } = useQuery({
    queryKey: ["custos", companyId, selMonth],
    queryFn: async () => {
      let q = supabase
        .from("custos")
        .select("*")
        .gte("data", monthStart)
        .lte("data", monthEnd)
        .order("data", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: mpConfig, refetch: refetchMP } = useQuery({
    queryKey: ["mp-config", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("mercado_pago_configs")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  // ============ KPIs ============
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const aReceber = cobrancas
      .filter((c: any) => c.status === "pending" && c.vencimento >= today)
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const recebido = cobrancas
      .filter((c: any) => c.status === "paid")
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const atrasado = cobrancas
      .filter(
        (c: any) => c.status === "pending" && c.vencimento < today
      )
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const totalVendas = vendas.reduce(
      (s: number, v: any) => s + Number(v.valor || 0),
      0
    );
    const totalCustos = custos.reduce(
      (s: number, c: any) => s + Number(c.valor || 0),
      0
    );
    return {
      aReceber,
      recebido,
      atrasado,
      vendas: totalVendas + recebido,
      custos: totalCustos,
      lucro: totalVendas + recebido - totalCustos,
    };
  }, [cobrancas, vendas, custos]);

  // ============ MUTATIONS ============
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["cobrancas"] });
    qc.invalidateQueries({ queryKey: ["vendas"] });
    qc.invalidateQueries({ queryKey: ["custos"] });
  };

  const deleteCobranca = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cobrancas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Cobrança removida");
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cobrancas")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Marcado como pago");
    },
  });

  const generatePix = useMutation({
    mutationFn: async (cobrancaId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "mercadopago-create-pix",
        { body: { cobrancaId } }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      invalidateAll();
      if (data?.whatsapp_sent) {
        toast.success("Pix gerado e enviado por WhatsApp!");
      } else {
        toast.success("Pix gerado com sucesso!");
      }
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar Pix"),
  });

  const sendPixWhats = useMutation({
    mutationFn: async (cobrancaId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "send-pix-whatsapp",
        { body: { cobrancaId } }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => toast.success("Pix enviado por WhatsApp!"),
    onError: (e: any) => toast.error(e.message || "Erro ao enviar Pix"),
  });


  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
      {/* HEADER */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Select value={selMonth} onValueChange={setSelMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setOpenTemplates(true)}>
            <FileText className="w-4 h-4 mr-1" /> Templates
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setOpenCob(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nova Cobrança
          </Button>
          <Button variant="outline" onClick={() => setOpenVenda(true)}>
            <Plus className="w-4 h-4 mr-1" /> Venda
          </Button>
          <Button variant="outline" onClick={() => setOpenCusto(true)}>
            <Plus className="w-4 h-4 mr-1" /> Custo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          label="A Receber"
          value={kpis.aReceber}
          tint="blue"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          label="Recebido"
          value={kpis.recebido}
          tint="emerald"
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
          label="Atrasado"
          value={kpis.atrasado}
          tint="rose"
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          label="Vendas"
          value={kpis.vendas}
          tint="emerald"
        />
        <KpiCard
          icon={<TrendingDown className="w-4 h-4 text-orange-500" />}
          label="Custos"
          value={kpis.custos}
          tint="orange"
        />
        <KpiCard
          icon={<Sparkles className="w-4 h-4 text-primary" />}
          label="Lucro"
          value={kpis.lucro}
          tint="primary"
        />
      </div>

      {/* TABS */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cobrancas">
            Cobranças ({cobrancas.length})
          </TabsTrigger>
          <TabsTrigger value="vendas">Vendas ({vendas.length})</TabsTrigger>
          <TabsTrigger value="custos">Custos ({custos.length})</TabsTrigger>
          <TabsTrigger value="recorrentes" className="gap-2">
            <Repeat className="w-4 h-4" /> Recorrências
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="w-4 h-4" /> Histórico de lembretes
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-2">
            <CreditCard className="w-4 h-4" /> Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* COBRANCAS */}
        <TabsContent value="cobrancas">
          <Card>
            <CardContent className="p-0">
              {loadCob ? (
                <EmptyState label="Carregando..." />
              ) : cobrancas.length === 0 ? (
                <EmptyState label="Nenhuma cobrança neste mês." />
              ) : (
                <div className="divide-y divide-border">
                  {cobrancas.map((c: any) => (
                    <CobrancaRow
                      key={c.id}
                      c={c}
                      onDelete={() => deleteCobranca.mutate(c.id)}
                      onPaid={() => markPaid.mutate(c.id)}
                      onGenPix={() => generatePix.mutate(c.id)}
                      onSendWhats={() => sendPixWhats.mutate(c.id)}
                      generating={generatePix.isPending}
                      sending={sendPixWhats.isPending}
                    />

                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VENDAS */}
        <TabsContent value="vendas">
          <Card>
            <CardContent className="p-0">
              {vendas.length === 0 ? (
                <EmptyState label="Nenhuma venda neste mês." />
              ) : (
                <div className="divide-y divide-border">
                  {vendas.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{v.cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.produto || "—"} •{" "}
                          {new Date(v.data).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-500">
                          {formatBRL(Number(v.valor))}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            await supabase.from("vendas").delete().eq("id", v.id);
                            invalidateAll();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOS */}
        <TabsContent value="custos">
          <Card>
            <CardContent className="p-0">
              {custos.length === 0 ? (
                <EmptyState label="Nenhum custo neste mês." />
              ) : (
                <div className="divide-y divide-border">
                  {custos.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{c.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.categoria || "—"} •{" "}
                          {new Date(c.data).toLocaleDateString("pt-BR")}
                          {c.recorrente && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              recorrente
                            </Badge>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-orange-500">
                          -{formatBRL(Number(c.valor))}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            await supabase.from("custos").delete().eq("id", c.id);
                            invalidateAll();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MERCADO PAGO */}
        <TabsContent value="pagamentos">
          <MercadoPagoPanel
            companyId={companyId}
            config={mpConfig}
            onSaved={() => refetchMP()}
          />
        </TabsContent>

        {/* HISTÓRICO DE LEMBRETES */}
        <TabsContent value="historico">
          <ReminderHistoryPanel companyId={companyId} />
        </TabsContent>

        {/* RECORRÊNCIAS */}
        <TabsContent value="recorrentes">
          <RecorrentesPanel companyId={companyId} userId={user?.id ?? null} />
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}
      <NovaCobrancaDialog
        open={openCob}
        onClose={() => setOpenCob(false)}
        companyId={companyId}
        userId={user?.id}
        onSaved={invalidateAll}
      />
      <NovaVendaDialog
        open={openVenda}
        onClose={() => setOpenVenda(false)}
        companyId={companyId}
        userId={user?.id}
        onSaved={invalidateAll}
      />
      <NovoCustoDialog
        open={openCusto}
        onClose={() => setOpenCusto(false)}
        companyId={companyId}
        userId={user?.id}
        onSaved={invalidateAll}
      />
      <TemplatesDialog
        open={openTemplates}
        onClose={() => setOpenTemplates(false)}
        companyId={companyId}
        config={mpConfig}
        onSaved={refetchMP}
      />
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function KpiCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: string;
}) {
  const tints: Record<string, string> = {
    blue: "bg-blue-500/10",
    emerald: "bg-emerald-500/10",
    rose: "bg-rose-500/10",
    orange: "bg-orange-500/10",
    primary: "bg-primary/10",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", tints[tint])}>
            {icon}
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="font-bold text-lg">{formatBRL(value)}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">{label}</div>
  );
}

function CobrancaRow({
  c,
  onDelete,
  onPaid,
  onGenPix,
  onSendWhats,
  generating,
  sending,
}: {
  c: any;
  onDelete: () => void;
  onPaid: () => void;
  onGenPix: () => void;
  onSendWhats: () => void;
  generating: boolean;
  sending: boolean;
}) {

  const [showPix, setShowPix] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = c.status === "pending" && c.vencimento < today;
  const statusInfo =
    c.status === "paid"
      ? { label: "Pago", cls: "bg-emerald-500/10 text-emerald-500" }
      : isOverdue
        ? { label: "Atrasado", cls: "bg-rose-500/10 text-rose-500" }
        : { label: "Pendente", cls: "bg-blue-500/10 text-blue-500" };

  return (
    <div className="px-4 py-3 hover:bg-muted/30">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <p className="font-medium">{c.cliente_nome}</p>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                statusInfo.cls
              )}
            >
              {statusInfo.label}
            </span>
            {c.recorrencia !== "unica" && (
              <Badge variant="outline" className="text-[10px]">
                {c.recorrencia}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {c.descricao || "—"} • Vence{" "}
            {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
            {c.telefone && ` • ${c.telefone}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">{formatBRL(Number(c.valor))}</span>
          <Button
            size="icon"
            variant="ghost"
            title="Gerar Pix (Mercado Pago)"
            onClick={onGenPix}
            disabled={generating || c.status === "paid"}
          >
            <QrCode className="w-4 h-4" />
          </Button>
          {c.pix_copia_cola && (
            <>
              <Button
                size="icon"
                variant="ghost"
                title="Ver Pix"
                onClick={() => setShowPix((s) => !s)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              {c.telefone && c.status !== "paid" && (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Enviar Pix por WhatsApp"
                  onClick={onSendWhats}
                  disabled={sending}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                </Button>
              )}
            </>
          )}
          {c.status !== "paid" && (
            <Button size="sm" variant="outline" onClick={onPaid}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Pago
            </Button>
          )}

          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showPix && c.pix_copia_cola && (
        <div className="mt-3 rounded-lg border border-border p-3 bg-muted/30 grid md:grid-cols-[auto_1fr] gap-3">
          {c.pix_qr_code && (
            <img
              src={`data:image/png;base64,${c.pix_qr_code}`}
              alt="QR Pix"
              className="w-40 h-40 rounded"
            />
          )}
          <div className="space-y-2 min-w-0">
            <p className="text-xs text-muted-foreground">Pix copia e cola:</p>
            <div className="p-2 bg-background rounded border border-border text-xs break-all font-mono">
              {c.pix_copia_cola}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(c.pix_copia_cola);
                  toast.success("Copiado!");
                }}
              >
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
              {c.checkout_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={c.checkout_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" /> Abrir checkout
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MercadoPagoPanel({
  companyId,
  config,
  onSaved,
}: {
  companyId: string | null;
  config: any;
  onSaved: () => void;
}) {
  const [apelido, setApelido] = useState("");
  const [token, setToken] = useState("");
  const [pixTemplate, setPixTemplate] = useState("");
  const [autoSend, setAutoSend] = useState(true);
  const [defaultConnId, setDefaultConnId] = useState<string>("");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [reminderIntervalHours, setReminderIntervalHours] = useState(24);
  const [remindAfterDue, setRemindAfterDue] = useState(true);
  const [reminderTemplate, setReminderTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["wa-connections-mp", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("connections")
        .select("id, name, instance_name, phone_number, status")
        .eq("company_id", companyId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (config) {
      setApelido(config.apelido || "");
      setToken("");
      setPixTemplate(config.pix_template || "");
      setAutoSend(config.auto_send !== false);
      setDefaultConnId(config.default_connection_id || "");
      setRemindersEnabled(config.reminders_enabled !== false);
      setReminderDaysBefore(config.reminder_days_before ?? 3);
      setReminderIntervalHours(config.reminder_interval_hours ?? 24);
      setRemindAfterDue(config.remind_after_due !== false);
      setReminderTemplate(config.reminder_template || "");
    }
  }, [config]);

  const save = async () => {
    if (!companyId) return toast.error("Empresa não encontrada");
    if (!token && !config) return toast.error("Informe o Access Token");
    setSaving(true);
    try {
      const payload: any = {
        company_id: companyId,
        apelido: apelido || null,
        pix_template: pixTemplate || null,
        auto_send: autoSend,
        default_connection_id: defaultConnId || null,
        reminders_enabled: remindersEnabled,
        reminder_days_before: Math.max(0, Math.min(30, reminderDaysBefore)),
        reminder_interval_hours: Math.max(1, Math.min(720, reminderIntervalHours)),
        remind_after_due: remindAfterDue,
        reminder_template: reminderTemplate || null,
      };
      if (token) payload.access_token = token;
      const { error } = await supabase
        .from("mercado_pago_configs")
        .upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
      toast.success("Configurações salvas!");
      setToken("");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!companyId) return;
    await supabase.from("mercado_pago_configs").delete().eq("company_id", companyId);
    toast.success("Desconectado");
    onSaved();
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-lg">Mercado Pago</h3>
            {config && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
                Conectado
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta para gerar Pix (QR + copia e cola) e links de
            pagamento direto nas cobranças. O valor cai na{" "}
            <strong>sua conta MP</strong>.
          </p>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium mb-2">
              Como pegar seu Access Token (1 minuto):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Entre em{" "}
                <a
                  href="https://mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-primary"
                >
                  mercadopago.com.br/developers/panel/app
                </a>
              </li>
              <li>Crie uma aplicação (ou abra uma existente)</li>
              <li>
                No menu lateral: <strong>Credenciais de produção</strong>
              </li>
              <li>
                Copie o <strong>Access Token</strong> e cole abaixo
              </li>
            </ol>
          </div>

          <div className="grid gap-3">
            <div>
              <Label>Apelido (opcional)</Label>
              <Input
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Ex.: Minha conta principal"
              />
            </div>
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={config ? "•••••••••••••••• (já salvo)" : "APP_USR-..."}
              />
              <p className="text-xs text-muted-foreground mt-1">
                O token fica criptografado e só é usado pelo backend para criar
                pagamentos em seu nome.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {config ? "Atualizar" : "Conectar Mercado Pago"}
            </Button>
            {config && (
              <Button variant="outline" onClick={disconnect}>
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-lg">Envio automático por WhatsApp</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Ao gerar o Pix de uma cobrança com telefone, o sistema envia
            automaticamente a mensagem abaixo para o cliente pelo WhatsApp.
          </p>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Enviar automaticamente após gerar o Pix</p>
              <p className="text-xs text-muted-foreground">
                Você também pode enviar manualmente clicando no ícone <MessageSquare className="w-3 h-3 inline" /> em cada cobrança.
              </p>
            </div>
            <Switch checked={autoSend} onCheckedChange={setAutoSend} />
          </div>

          <div>
            <Label>Conexão WhatsApp padrão</Label>
            <Select value={defaultConnId || "none"} onValueChange={(v) => setDefaultConnId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conexão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhuma (usar a da cobrança) —</SelectItem>
                {connections.map((cn: any) => (
                  <SelectItem key={cn.id} value={cn.id}>
                    {cn.name || cn.instance_name || cn.phone_number || cn.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Modelo da mensagem</Label>
            <Textarea
              value={pixTemplate}
              onChange={(e) => setPixTemplate(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder="Digite o texto que será enviado..."
            />
            <div className="mt-2 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-1">
                {["{cliente}", "{valor}", "{descricao}", "{vencimento}", "{pix_copia_cola}", "{link_pagamento}", "{telefone}"].map((v) => (
                  <code
                    key={v}
                    className="px-1.5 py-0.5 rounded bg-muted cursor-pointer hover:bg-muted/70"
                    onClick={() => setPixTemplate((t) => (t || "") + v)}
                  >
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            Salvar configurações de envio
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-lg">Lembretes automáticos de Pix</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            O sistema envia lembretes pelo WhatsApp começando <strong>N dias antes do vencimento</strong> e repete no intervalo definido até a cobrança ser paga (o webhook do Mercado Pago para os envios automaticamente). Roda a cada hora.
          </p>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Ativar lembretes automáticos</p>
              <p className="text-xs text-muted-foreground">Somente cobranças pendentes com Pix gerado e telefone.</p>
            </div>
            <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Começar quantos dias antes do vencimento</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Intervalo entre lembretes (horas)</Label>
              <Input
                type="number"
                min={1}
                max={720}
                value={reminderIntervalHours}
                onChange={(e) => setReminderIntervalHours(Number(e.target.value) || 24)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Continuar enviando após o vencimento</p>
              <p className="text-xs text-muted-foreground">Repete até a cobrança ser paga ou cancelada.</p>
            </div>
            <Switch checked={remindAfterDue} onCheckedChange={setRemindAfterDue} />
          </div>

          <div>
            <Label>Modelo da mensagem de lembrete</Label>
            <Textarea
              value={reminderTemplate}
              onChange={(e) => setReminderTemplate(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder="Digite o texto do lembrete..."
            />
            <div className="mt-2 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-1">
                {["{cliente}", "{valor}", "{descricao}", "{vencimento}", "{pix_copia_cola}", "{link_pagamento}", "{telefone}"].map((v) => (
                  <code
                    key={v}
                    className="px-1.5 py-0.5 rounded bg-muted cursor-pointer hover:bg-muted/70"
                    onClick={() => setReminderTemplate((t) => (t || "") + v)}
                  >
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            Salvar lembretes
          </Button>
        </CardContent>
      </Card>




      <Card>
        <CardContent className="p-6 space-y-2 text-sm">
          <h4 className="font-semibold">Como funciona</h4>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Conecte sua conta do Mercado Pago acima.</li>
            <li>
              Em cada cobrança pendente, clique no ícone{" "}
              <QrCode className="w-3 h-3 inline" /> para gerar um{" "}
              <strong>Pix (QR + copia e cola)</strong> ou{" "}
              <strong>Link de checkout</strong>.
            </li>
            <li>
              Quando o cliente paga, marque a cobrança como paga (ou aguarde o
              webhook — em breve).
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ DIALOGS ============

function NovaCobrancaDialog({
  open,
  onClose,
  companyId,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  userId?: string;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [valor, setValor] = useState("");
  const [desc, setDesc] = useState("");
  const [venc, setVenc] = useState(new Date().toISOString().slice(0, 10));
  const [rec, setRec] = useState("unica");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setNome("");
    setTel("");
    setValor("");
    setDesc("");
    setVenc(new Date().toISOString().slice(0, 10));
    setRec("unica");
  };

  const save = async () => {
    if (!nome.trim()) return toast.error("Informe o nome do cliente");
    const v = Number(String(valor).replace(",", "."));
    if (isNaN(v) || v <= 0) return toast.error("Informe um valor válido");
    setSaving(true);
    try {
      const { error } = await supabase.from("cobrancas").insert({
        company_id: companyId,
        user_id: userId,
        cliente_nome: nome.trim(),
        telefone: tel.trim() || null,
        valor: v,
        descricao: desc.trim() || null,
        vencimento: venc,
        recorrencia: rec,
      });
      if (error) throw error;
      toast.success("Cobrança criada");
      onSaved();
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cobrança</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do cliente</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone (com DDD)</Label>
              <Input
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="11999999999"
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Mensalidade outubro"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={venc}
                onChange={(e) => setVenc(e.target.value)}
              />
            </div>
            <div>
              <Label>Recorrência</Label>
              <Select value={rec} onValueChange={setRec}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaVendaDialog({
  open,
  onClose,
  companyId,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  userId?: string;
  onSaved: () => void;
}) {
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!cliente.trim()) return toast.error("Informe o cliente");
    const v = Number(String(valor).replace(",", "."));
    if (isNaN(v) || v <= 0) return toast.error("Informe um valor válido");
    setSaving(true);
    try {
      const { error } = await supabase.from("vendas").insert({
        company_id: companyId,
        user_id: userId,
        cliente: cliente.trim(),
        produto: produto.trim() || null,
        valor: v,
        data,
        observacoes: obs.trim() || null,
      });
      if (error) throw error;
      toast.success("Venda registrada");
      onSaved();
      setCliente("");
      setProduto("");
      setValor("");
      setObs("");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova venda</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div>
              <Label>Produto</Label>
              <Input value={produto} onChange={(e) => setProduto(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoCustoDialog({
  open,
  onClose,
  companyId,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  userId?: string;
  onSaved: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [valor, setValor] = useState("");
  const [recor, setRecor] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!desc.trim()) return toast.error("Informe a descrição");
    const v = Number(String(valor).replace(",", "."));
    if (isNaN(v) || v <= 0) return toast.error("Informe um valor válido");
    setSaving(true);
    try {
      const { error } = await supabase.from("custos").insert({
        company_id: companyId,
        user_id: userId,
        descricao: desc.trim(),
        categoria: cat.trim() || null,
        valor: v,
        recorrente: recor,
        data,
        observacoes: obs.trim() || null,
      });
      if (error) throw error;
      toast.success("Custo registrado");
      onSaved();
      setDesc("");
      setCat("");
      setValor("");
      setRecor(false);
      setObs("");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo custo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                placeholder="Ex: Marketing, Aluguel..."
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={recor} onCheckedChange={setRecor} />
            <Label className="cursor-pointer" onClick={() => setRecor(!recor)}>
              Custo recorrente (mensal)
            </Label>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================ */
/*                 HISTÓRICO DE LEMBRETES                        */
/* ============================================================ */

function ReminderHistoryPanel({ companyId }: { companyId?: string | null }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [cobrancaFilter, setCobrancaFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pix-reminder-history", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pix_reminder_history")
        .select("*, cobrancas(descricao, cliente_nome)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Opções únicas para os selects
  const cobrancaOptions = useMemo(() => {
    const map = new Map<string, string>();
    (items as any[]).forEach((r) => {
      if (r.cobranca_id) {
        const label =
          r.cobrancas?.descricao ||
          r.cobrancas?.cliente_nome ||
          r.cliente_nome ||
          r.cobranca_id.slice(0, 8);
        map.set(r.cobranca_id, label);
      }
    });
    return Array.from(map.entries());
  }, [items]);

  const clienteOptions = useMemo(() => {
    const set = new Set<string>();
    (items as any[]).forEach((r) => {
      if (r.cliente_nome) set.add(r.cliente_nome);
    });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return (items as any[]).filter((r) => {
      if (statusFilter === "success" && !r.success) return false;
      if (statusFilter === "error" && r.success) return false;
      if (cobrancaFilter !== "all" && r.cobranca_id !== cobrancaFilter) return false;
      if (clienteFilter !== "all" && r.cliente_nome !== clienteFilter) return false;

      const ts = new Date(r.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;

      if (!s) return true;
      return (
        (r.cliente_nome || "").toLowerCase().includes(s) ||
        (r.telefone || "").toLowerCase().includes(s) ||
        (r.message_text || "").toLowerCase().includes(s) ||
        (r.pix_copia_cola || "").toLowerCase().includes(s) ||
        (r.link_pagamento || "").toLowerCase().includes(s)
      );
    });
  }, [items, search, statusFilter, cobrancaFilter, clienteFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCobrancaFilter("all");
    setClienteFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    !!search ||
    statusFilter !== "all" ||
    cobrancaFilter !== "all" ||
    clienteFilter !== "all" ||
    !!dateFrom ||
    !!dateTo;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Histórico de lembretes de Pix</p>
              <p className="text-xs text-muted-foreground">
                {filtered.length} de {items.length} registros
              </p>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
            <Input
              placeholder="Buscar cliente, telefone, mensagem, pix ou link…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lg:col-span-2"
            />
            <Select value={cobrancaFilter} onValueChange={setCobrancaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cobrança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cobranças</SelectItem>
                {cobrancaOptions.map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clienteFilter} onValueChange={setClienteFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos clientes</SelectItem>
                {clienteOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Falhas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="De"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="Até"
              />
            </div>
          </div>
        </div>


        {isLoading ? (
          <EmptyState label="Carregando..." />
        ) : filtered.length === 0 ? (
          <EmptyState label="Nenhum lembrete registrado." />
        ) : (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {filtered.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left px-4 py-3 hover:bg-muted/30 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {r.cliente_nome || r.telefone || "Sem cliente"}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        r.success
                          ? "border-emerald-500/40 text-emerald-500"
                          : "border-red-500/40 text-red-500"
                      )}
                    >
                      {r.success ? "Enviado" : "Falha"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {r.source === "manual" ? "manual" : "auto"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.telefone || "—"} • {r.message_text?.slice(0, 80) || ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </p>
                  {r.valor != null && (
                    <p className="text-xs font-semibold">
                      {formatBRL(Number(r.valor))}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do lembrete</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Data/hora" value={new Date(selected.created_at).toLocaleString("pt-BR")} />
                <Info label="Status" value={selected.success ? "Enviado" : "Falha"} />
                <Info label="Origem" value={selected.source === "manual" ? "Manual" : "Cron automático"} />
                <Info label="Cliente" value={selected.cliente_nome || "—"} />
                <Info label="Telefone" value={selected.telefone || "—"} />
                <Info label="Valor" value={selected.valor != null ? formatBRL(Number(selected.valor)) : "—"} />
                <Info
                  label="Vencimento"
                  value={selected.vencimento ? new Date(selected.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                />
              </div>

              <div>
                <Label className="text-xs">Template usado</Label>
                <Textarea readOnly value={selected.template || ""} className="font-mono text-xs" rows={4} />
              </div>

              <div>
                <Label className="text-xs">Mensagem enviada</Label>
                <Textarea readOnly value={selected.message_text || ""} rows={5} />
              </div>

              {selected.pix_copia_cola && (
                <div>
                  <Label className="text-xs">Pix copia e cola</Label>
                  <Textarea readOnly value={selected.pix_copia_cola} className="font-mono text-xs" rows={3} />
                </div>
              )}

              {selected.link_pagamento && (
                <div>
                  <Label className="text-xs">Link de pagamento</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={selected.link_pagamento} />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(selected.link_pagamento, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!selected.success && selected.error_message && (
                <div>
                  <Label className="text-xs text-red-500">Erro</Label>
                  <Textarea readOnly value={selected.error_message} rows={2} className="text-red-500" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

// ============ TEMPLATES DIALOG ============

type TplKey = "before_3" | "before_1" | "on_day" | "overdue";
const TPL_META: { key: TplKey; label: string }[] = [
  { key: "before_3", label: "3 dias antes" },
  { key: "before_1", label: "1 dia antes" },
  { key: "on_day", label: "No dia" },
  { key: "overdue", label: "Em atraso" },
];
const DEFAULT_TEMPLATES: Record<TplKey, { tone: string; text: string }> = {
  before_3: { tone: "Cordial", text: "Oi {cliente}! 👋 Passando só pra lembrar que sua cobrança de *R$ {valor}* ({descricao}) vence em *{vencimento}*. Qualquer dúvida é só me chamar. 🙌" },
  before_1: { tone: "Cordial", text: "Oi {cliente}! Só um lembrete rápido: amanhã ({vencimento}) vence sua cobrança de *R$ {valor}*. Já está tudo certo por aí? 😊" },
  on_day: { tone: "Cordial", text: "Olá {cliente}! Hoje é o dia do vencimento da sua cobrança de *R$ {valor}* ({descricao}). Quando puder, confirma o pagamento por aqui pra eu dar baixa, beleza? 🙏" },
  overdue: { tone: "Firme", text: "Oi {cliente}, tudo bem? Sua cobrança de *R$ {valor}* venceu há {dias_atraso} dias. Conseguimos acertar essa pendência hoje? Qualquer coisa me chama. 😉" },
};

function TemplatesDialog({
  open,
  onClose,
  companyId,
  config,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  config: any;
  onSaved: () => void;
}) {
  const [tpls, setTpls] = useState<Record<TplKey, { tone: string; text: string }>>(DEFAULT_TEMPLATES);
  const [saving, setSaving] = useState(false);
  const [genKey, setGenKey] = useState<TplKey | null>(null);
  const [odEnabled, setOdEnabled] = useState(true);
  const [odDeadline, setOdDeadline] = useState(24);
  const [odInterval, setOdInterval] = useState(12);
  const [odMax, setOdMax] = useState(3);
  const [odMinValor, setOdMinValor] = useState<string>("");
  const [odMaxValor, setOdMaxValor] = useState<string>("");
  const [odTemplate, setOdTemplate] = useState(
    "Oi {cliente}! 👋 Notei que o PIX de *R$ {valor}* ({descricao} — ref: {referencia}) ainda não foi pago. Envio novamente para facilitar: {pix_copia_cola} — Qualquer dúvida é só me chamar. 🙌"
  );
  const [confEnabled, setConfEnabled] = useState(true);
  const DEFAULT_CONF_TPL = `✅ *Pagamento confirmado!*\n\nOlá {nome}, recebemos seu pagamento de *R$ {valor}* referente a *{descricao}*.\n\nMuito obrigado! 🙌`;
  const [confTemplate, setConfTemplate] = useState(DEFAULT_CONF_TPL);
  const confPreview = confTemplate
    .replace(/\{nome\}/g, "Maria Silva")
    .replace(/\{valor\}/g, "149,90")
    .replace(/\{descricao\}/g, "Mensalidade Novembro");

  useEffect(() => {
    if (open) {
      const stored = config?.reminder_templates as Record<TplKey, { tone: string; text: string }> | undefined;
      setTpls({
        before_3: stored?.before_3 || DEFAULT_TEMPLATES.before_3,
        before_1: stored?.before_1 || DEFAULT_TEMPLATES.before_1,
        on_day: stored?.on_day || DEFAULT_TEMPLATES.on_day,
        overdue: stored?.overdue || DEFAULT_TEMPLATES.overdue,
      });
      if (config) {
        setOdEnabled(config.ondemand_reminders_enabled ?? true);
        setOdDeadline(config.ondemand_deadline_hours ?? 24);
        setOdInterval(config.ondemand_interval_hours ?? 12);
        setOdMax(config.ondemand_max_reminders ?? 3);
        setOdMinValor(config.ondemand_min_valor != null ? String(config.ondemand_min_valor) : "");
        setOdMaxValor(config.ondemand_max_valor != null ? String(config.ondemand_max_valor) : "");
        if (config.ondemand_template) setOdTemplate(config.ondemand_template);
      }
    }
  }, [open, config]);

  const update = (k: TplKey, patch: Partial<{ tone: string; text: string }>) =>
    setTpls((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const generateAI = async (k: TplKey) => {
    setGenKey(k);
    try {
      const { data, error } = await supabase.functions.invoke("pix-template-generate", {
        body: { windowKey: k, tone: tpls[k].tone },
      });
      if (error) throw error;
      if (data?.text) {
        update(k, { text: data.text });
        toast.success("Template gerado pela IA");
      } else {
        throw new Error(data?.error || "Sem resposta da IA");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar com IA");
    } finally {
      setGenKey(null);
    }
  };

  const save = async () => {
    if (!companyId) return toast.error("Empresa não encontrada");
    setSaving(true);
    try {
      const parseNum = (v: string) => {
        const n = parseFloat(String(v).replace(",", "."));
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const minN = parseNum(odMinValor);
      const maxN = parseNum(odMaxValor);
      if (minN != null && maxN != null && minN > maxN) {
        setSaving(false);
        return toast.error("Valor mínimo não pode ser maior que o máximo");
      }
      const payload: any = {
        reminder_templates: tpls,
        ondemand_reminders_enabled: odEnabled,
        ondemand_deadline_hours: Number(odDeadline) || 24,
        ondemand_interval_hours: Number(odInterval) || 12,
        ondemand_max_reminders: Number(odMax) || 3,
        ondemand_min_valor: minN,
        ondemand_max_valor: maxN,
        ondemand_template: odTemplate,
      };
      if (config) {
        const { error } = await supabase
          .from("mercado_pago_configs")
          .update(payload)
          .eq("company_id", companyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mercado_pago_configs")
          .insert({ company_id: companyId, access_token: "", ...payload });
        if (error) throw error;
      }
      toast.success("Templates salvos!");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates de cobrança</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">
            Variáveis: {"{cliente} {valor} {vencimento} {descricao} {dias_atraso}"}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {TPL_META.map(({ key, label }) => (
            <Card key={key}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">{label}</h4>
                  <div className="flex items-center gap-2">
                    <Select
                      value={tpls[key].tone}
                      onValueChange={(v) => update(key, { tone: v })}
                    >
                      <SelectTrigger className="w-[110px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cordial">Cordial</SelectItem>
                        <SelectItem value="Firme">Firme</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={genKey === key}
                      onClick={() => generateAI(key)}
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1" />
                      {genKey === key ? "Gerando..." : "IA"}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={tpls[key].text}
                  onChange={(e) => update(key, { text: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          ))}

          {/* On-demand (avulsa) reminders */}
          <Card className="border-primary/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">PIX sob demanda (avulso)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Lembretes automáticos para PIX gerado pela IA/atendente que não foi pago no prazo.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Ativo</Label>
                  <Switch checked={odEnabled} onCheckedChange={setOdEnabled} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Prazo (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={odDeadline}
                    onChange={(e) => setOdDeadline(Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Intervalo (h)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={odInterval}
                    onChange={(e) => setOdInterval(Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Máx. lembretes</Label>
                  <Input
                    type="number"
                    min={1}
                    value={odMax}
                    onChange={(e) => setOdMax(Number(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Valor mínimo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Sem limite"
                    value={odMinValor}
                    onChange={(e) => setOdMinValor(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Valor máximo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Sem limite"
                    value={odMaxValor}
                    onChange={(e) => setOdMaxValor(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">
                A IA bloqueia PIX fora desta faixa e pede um novo valor ao cliente. Deixe em branco para não limitar.
              </p>


              <div>
                <Label className="text-[11px]">Mensagem</Label>
                <Textarea
                  value={odTemplate}
                  onChange={(e) => setOdTemplate(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  Variáveis: {"{cliente} {valor} {descricao} {referencia} {pix_copia_cola} {link_pagamento}"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar templates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
