import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bug, Lightbulb, MessageSquare, Plus, Send, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackReport {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  admin_notes: string | null;
}

const FeedbackReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
  });

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
      console.error("Erro ao buscar reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      const { error } = await supabase.from("feedback_reports").insert({
        user_id: user?.id,
        company_id: profile?.company_id,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        user_email: user?.email,
      });

      if (error) throw error;

      toast.success("Feedback enviado com sucesso! Obrigado pela colaboração.");
      setDialogOpen(false);
      setFormData({ type: "bug", title: "", description: "" });
      fetchReports();
    } catch (error: any) {
      console.error("Erro ao enviar feedback:", error);
      toast.error("Erro ao enviar feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="w-4 h-4" />;
      case "improvement":
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      bug: "bg-red-500/20 text-red-500 border-red-500/30",
      improvement: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      suggestion: "bg-purple-500/20 text-purple-500 border-purple-500/30",
      other: "bg-gray-500/20 text-gray-500 border-gray-500/30",
    };
    const labels: Record<string, string> = {
      bug: "Bug",
      improvement: "Melhoria",
      suggestion: "Sugestão",
      other: "Outro",
    };
    return (
      <Badge className={styles[type] || styles.other}>
        {getTypeIcon(type)}
        <span className="ml-1">{labels[type] || type}</span>
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
      pending: { icon: <Clock className="w-3 h-3" />, label: "Pendente", class: "bg-yellow-500/20 text-yellow-500" },
      in_progress: { icon: <AlertCircle className="w-3 h-3" />, label: "Em Análise", class: "bg-blue-500/20 text-blue-500" },
      resolved: { icon: <CheckCircle2 className="w-3 h-3" />, label: "Resolvido", class: "bg-green-500/20 text-green-500" },
      rejected: { icon: <AlertCircle className="w-3 h-3" />, label: "Rejeitado", class: "bg-red-500/20 text-red-500" },
    };
    const { icon, label, class: className } = config[status] || config.pending;
    return (
      <Badge className={className}>
        {icon}
        <span className="ml-1">{label}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bugs & Melhorias</h1>
          <p className="text-muted-foreground mt-1">
            Ajude-nos a melhorar o MarketFlow reportando bugs ou sugerindo melhorias
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Feedback</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">
                      <span className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        Bug / Erro
                      </span>
                    </SelectItem>
                    <SelectItem value="improvement">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-500" />
                        Melhoria
                      </span>
                    </SelectItem>
                    <SelectItem value="suggestion">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        Sugestão
                      </span>
                    </SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Resumo do problema ou sugestão"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva em detalhes o bug encontrado ou a melhoria sugerida..."
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Bug className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Como funciona?</h3>
              <p className="text-muted-foreground text-sm">
                Seu feedback é enviado diretamente para nossa equipe de desenvolvimento. 
                Analisamos cada sugestão e bug reportado para melhorar continuamente o MarketFlow.
                Você pode acompanhar o status dos seus feedbacks aqui.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Meus Feedbacks</h2>
        
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Você ainda não enviou nenhum feedback.
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              Enviar primeiro feedback
            </Button>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeBadge(report.type)}
                          {getStatusBadge(report.status)}
                        </div>
                        <h3 className="font-medium text-foreground">{report.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                          {report.description}
                        </p>
                        {report.admin_notes && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium text-foreground">Resposta da equipe:</p>
                            <p className="text-sm text-muted-foreground mt-1">{report.admin_notes}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(report.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default FeedbackReports;
