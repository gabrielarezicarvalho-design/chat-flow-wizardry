import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, PauseCircle, PlayCircle, Repeat, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

interface Props {
  companyId: string | null;
  userId: string | null;
}

export function RecorrentesPanel({ companyId, userId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cobrancas_recorrentes", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cobrancas_recorrentes")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const toggle = useMutation({
    mutationFn: async (row: any) => {
      const next = row.status === "ativa" ? "pausada" : "ativa";
      const { error } = await supabase
        .from("cobrancas_recorrentes")
        .update({ status: next })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobrancas_recorrentes", companyId] });
      toast.success("Status atualizado");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cobrancas_recorrentes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobrancas_recorrentes", companyId] });
      toast.success("Recorrência removida");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Cobranças Recorrentes
          </h3>
          <p className="text-sm text-muted-foreground">
            A cobrança é gerada e enviada automaticamente no dia 5 ou 15 de cada mês.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nova recorrência
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma recorrência cadastrada. Clique em "Nova recorrência" para começar.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{r.cliente_nome}</p>
                      <Badge variant={r.status === "ativa" ? "default" : "secondary"} className="text-[10px]">
                        {r.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Calendar className="w-3 h-3" /> Dia {r.dia_vencimento}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.telefone} {r.descricao ? `• ${r.descricao}` : ""}
                      {r.total_geradas > 0 && ` • ${r.total_geradas} cobrança(s) gerada(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-500">{formatBRL(Number(r.valor))}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggle.mutate(r)}
                      title={r.status === "ativa" ? "Pausar" : "Ativar"}
                    >
                      {r.status === "ativa" ? (
                        <PauseCircle className="w-4 h-4" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditing(r); setOpen(true); }}
                    >
                      ✎
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover recorrência de ${r.cliente_nome}?`)) remove.mutate(r.id);
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

      <RecorrenteDialog
        open={open}
        onClose={() => setOpen(false)}
        companyId={companyId}
        userId={userId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["cobrancas_recorrentes", companyId] })}
      />
    </div>
  );
}

function RecorrenteDialog({
  open,
  onClose,
  companyId,
  userId,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  userId: string | null;
  editing: any;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    cliente_nome: "",
    telefone: "",
    cpf_cnpj: "",
    email: "",
    valor: "",
    dia_vencimento: "5",
    descricao: "",
    connection_id: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["connections_for_recorrentes", companyId],
    enabled: !!companyId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("connections")
        .select("id, name, status")
        .eq("company_id", companyId!)
        .order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        cliente_nome: editing.cliente_nome || "",
        telefone: editing.telefone || "",
        cpf_cnpj: editing.cpf_cnpj || "",
        email: editing.email || "",
        valor: String(editing.valor || ""),
        dia_vencimento: String(editing.dia_vencimento || "5"),
        descricao: editing.descricao || "",
        connection_id: editing.connection_id || "",
      });
    } else {
      setForm({
        cliente_nome: "",
        telefone: "",
        cpf_cnpj: "",
        email: "",
        valor: "",
        dia_vencimento: "5",
        descricao: "",
        connection_id: "",
      });
    }
  }, [open, editing]);

  const submit = async () => {
    if (!companyId) return toast.error("Empresa não identificada");
    if (!form.cliente_nome || !form.telefone || !form.valor) {
      return toast.error("Preencha cliente, telefone e valor");
    }
    const valorNum = Number(form.valor.replace(",", "."));
    if (!(valorNum > 0)) return toast.error("Valor inválido");

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        user_id: userId,
        cliente_nome: form.cliente_nome.trim(),
        telefone: form.telefone.trim(),
        cpf_cnpj: form.cpf_cnpj.trim() || null,
        email: form.email.trim() || null,
        valor: valorNum,
        dia_vencimento: Number(form.dia_vencimento),
        descricao: form.descricao.trim() || null,
        connection_id: form.connection_id || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("cobrancas_recorrentes")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Recorrência atualizada");
      } else {
        const { error } = await (supabase as any).from("cobrancas_recorrentes").insert(payload);
        if (error) throw error;
        toast.success("Recorrência criada");
      }
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar recorrência" : "Nova recorrência mensal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Cliente *</Label>
            <Input
              value={form.cliente_nome}
              onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone (WhatsApp) *</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="5511999998888"
              />
            </div>
            <div>
              <Label>Valor mensal *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="150.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia do vencimento *</Label>
              <Select
                value={form.dia_vencimento}
                onValueChange={(v) => setForm({ ...form, dia_vencimento: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Dia 5</SelectItem>
                  <SelectItem value="15">Dia 15</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conexão WhatsApp</Label>
              <Select
                value={form.connection_id || "default"}
                onValueChange={(v) => setForm({ ...form, connection_id: v === "default" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão da empresa</SelectItem>
                  {connections.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF/CNPJ (opcional)</Label>
              <Input
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail (opcional)</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Mensalidade Plano Premium"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar recorrência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
