import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bug, Lightbulb, MessageSquare, CheckCircle2, Clock, AlertCircle, Search, Filter, Eye, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeedbackReport {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  user_email: string | null;
  created_at: string;
  admin_notes: string | null;
  company_id: string | null;
}

const AdminFeedback = () => {
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ status: "all", type: "all" });
  const [search, setSearch] = useState("");
  const [editData, setEditData] = useState({ status: "", priority: "", admin_notes: "" });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Erro ao buscar feedbacks:", error);
      toast.error("Erro ao carregar feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = (report: FeedbackReport) => {
    setSelectedReport(report);
    setEditData({
      status: report.status,
      priority: report.priority,
      admin_notes: report.admin_notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedReport) return;

    setSaving(true);
    try {
      const updateData: any = {
        status: editData.status,
        priority: editData.priority,
        admin_notes: editData.admin_notes || null,
      };

      if (editData.status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("feedback_reports")
        .update(updateData)
        .eq("id", selectedReport.id);

      if (error) throw error;

      toast.success("Feedback atualizado com sucesso!");
      setDialogOpen(false);
      fetchReports();
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar feedback");
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="w-4 h-4 text-red-500" />;
      case "improvement":
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string }> = {
      pending: { label: "Pendente", class: "bg-yellow-500/20 text-yellow-500" },
      in_progress: { label: "Em Análise", class: "bg-blue-500/20 text-blue-500" },
      resolved: { label: "Resolvido", class: "bg-green-500/20 text-green-500" },
      rejected: { label: "Rejeitado", class: "bg-red-500/20 text-red-500" },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; class: string }> = {
      low: { label: "Baixa", class: "bg-gray-500/20 text-gray-500" },
      medium: { label: "Média", class: "bg-blue-500/20 text-blue-500" },
      high: { label: "Alta", class: "bg-orange-500/20 text-orange-500" },
      critical: { label: "Crítica", class: "bg-red-500/20 text-red-500" },
    };
    const { label, class: className } = config[priority] || config.medium;
    return <Badge className={className}>{label}</Badge>;
  };

  const filteredReports = reports.filter((report) => {
    const matchesStatus = filter.status === "all" || report.status === filter.status;
    const matchesType = filter.type === "all" || report.type === filter.type;
    const matchesSearch =
      search === "" ||
      report.title.toLowerCase().includes(search.toLowerCase()) ||
      report.description.toLowerCase().includes(search.toLowerCase()) ||
      report.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    inProgress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feedbacks dos Usuários</h2>
        <p className="text-muted-foreground">Gerencie bugs e sugestões de melhorias</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4 border-yellow-500/30">
          <p className="text-sm text-yellow-500">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-blue-500/30">
          <p className="text-sm text-blue-500">Em Análise</p>
          <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
        </Card>
        <Card className="p-4 border-green-500/30">
          <p className="text-sm text-green-500">Resolvidos</p>
          <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, descrição ou email..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select value={filter.status} onValueChange={(v) => setFilter((p) => ({ ...p, status: v }))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Análise</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.type} onValueChange={(v) => setFilter((p) => ({ ...p, type: v }))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="improvement">Melhoria</SelectItem>
              <SelectItem value="suggestion">Sugestão</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum feedback encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{getTypeIcon(report.type)}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{report.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{report.user_email || "-"}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleOpenReport(report)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport && getTypeIcon(selectedReport.type)}
              Detalhes do Feedback
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Título</Label>
                <p className="font-medium">{selectedReport.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg mt-1">
                  {selectedReport.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Usuário</Label>
                  <p className="text-sm">{selectedReport.user_email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="text-sm">
                    {new Date(selectedReport.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editData.status} onValueChange={(v) => setEditData((p) => ({ ...p, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Análise</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={editData.priority} onValueChange={(v) => setEditData((p) => ({ ...p, priority: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas do Admin (visível para o usuário)</Label>
                  <Textarea
                    placeholder="Escreva uma resposta ou observação..."
                    rows={3}
                    value={editData.admin_notes}
                    onChange={(e) => setEditData((p) => ({ ...p, admin_notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFeedback;
