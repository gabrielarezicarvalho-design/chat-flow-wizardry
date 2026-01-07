import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, BarChart3, Send, Star, MessageSquare, Edit, Users, PieChart, FileSpreadsheet, Phone, Upload, UserCheck, X, Check, AlertTriangle, Settings, Database, Zap, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SatisfactionDashboard } from "./SatisfactionDashboard";

interface Connection {
  id: string;
  name: string;
}

interface SurveyOption {
  label: string;
  emoji: string;
  score: number;
}

interface SatisfactionSurvey {
  id: string;
  name: string;
  connection_id: string | null;
  message_content: string;
  survey_type: string;
  options: SurveyOption[];
  is_active: boolean;
  total_sent: number;
  total_responses: number;
  created_at: string;
}

interface SatisfactionResponse {
  id: string;
  survey_id: string;
  contact_phone: string;
  contact_name: string | null;
  response_value: string;
  response_score: number | null;
  feedback_text: string | null;
  responded_at: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
}

interface SendContact {
  name: string;
  phone: string;
  isValid: boolean;
  errors: string[];
}

interface SatisfactionSurveysProps {
  connections: Connection[];
}

const DEFAULT_OPTIONS: SurveyOption[] = [
  { label: "Muito Satisfeito", emoji: "😀", score: 5 },
  { label: "Satisfeito", emoji: "🙂", score: 4 },
  { label: "Neutro", emoji: "😐", score: 3 },
  { label: "Insatisfeito", emoji: "🙁", score: 2 },
  { label: "Muito Insatisfeito", emoji: "😞", score: 1 },
];

const EMOJI_OPTIONS = ["😀", "🙂", "😐", "🙁", "😞", "👍", "👎", "❤️", "⭐", "🎉", "🔥", "💯", "✅", "❌"];

export function SatisfactionSurveys({ connections }: SatisfactionSurveysProps) {
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [responses, setResponses] = useState<SatisfactionResponse[]>([]);
  const [allResponses, setAllResponses] = useState<SatisfactionResponse[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SatisfactionSurvey | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Send dialog state
  const [sendTab, setSendTab] = useState<"manual" | "csv" | "contacts" | "rules">("manual");
  const [manualNumbers, setManualNumbers] = useState("");
  const [parsedContacts, setParsedContacts] = useState<SendContact[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    connection_id: "",
    message_content: "Olá! Gostaríamos de saber sua opinião sobre nosso atendimento. Como você avalia sua experiência?",
    survey_type: "buttons",
    options: DEFAULT_OPTIONS,
    is_active: true,
  });

  useEffect(() => {
    loadSurveys();
    loadAllResponses();
    loadLeads();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("satisfaction_surveys")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const surveysWithParsedOptions = (data || []).map((s: any) => ({
        ...s,
        options: s.options || DEFAULT_OPTIONS,
      }));

      setSurveys(surveysWithParsedOptions);
    } catch (err) {
      console.error("Error loading surveys:", err);
      toast.error("Erro ao carregar pesquisas");
    }
    setLoading(false);
  };

  const loadAllResponses = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("satisfaction_responses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("responded_at", { ascending: false });

      if (error) throw error;
      setAllResponses(data || []);
    } catch (err) {
      console.error("Error loading all responses:", err);
    }
  };

  const loadLeads = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone")
        .eq("user_id", userData.user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Error loading leads:", err);
    }
  };

  const loadResponses = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from("satisfaction_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .order("responded_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (err) {
      console.error("Error loading responses:", err);
      toast.error("Erro ao carregar respostas");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Digite um nome para a pesquisa");
      return;
    }
    if (!formData.message_content.trim()) {
      toast.error("Digite a mensagem da pesquisa");
      return;
    }

    // Validate options
    const validOptions = formData.options.filter(opt => opt.label.trim());
    if (validOptions.length < 2) {
      toast.error("Adicione pelo menos 2 opções de resposta");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const dataToSave = {
        name: formData.name,
        connection_id: formData.connection_id || null,
        message_content: formData.message_content,
        survey_type: formData.survey_type,
        options: JSON.parse(JSON.stringify(validOptions)),
        is_active: formData.is_active,
      };

      if (selectedSurvey) {
        await (supabase.from("satisfaction_surveys") as any)
          .update(dataToSave)
          .eq("id", selectedSurvey.id);
        toast.success("Pesquisa atualizada!");
      } else {
        await (supabase.from("satisfaction_surveys") as any).insert({
          ...dataToSave,
          user_id: userData.user.id,
        });
        toast.success("Pesquisa criada!");
      }

      loadSurveys();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      connection_id: "",
      message_content: "Olá! Gostaríamos de saber sua opinião sobre nosso atendimento. Como você avalia sua experiência?",
      survey_type: "buttons",
      options: DEFAULT_OPTIONS,
      is_active: true,
    });
    setSelectedSurvey(null);
  };

  const editSurvey = (survey: SatisfactionSurvey) => {
    setSelectedSurvey(survey);
    setFormData({
      name: survey.name,
      connection_id: survey.connection_id || "",
      message_content: survey.message_content,
      survey_type: survey.survey_type,
      options: survey.options,
      is_active: survey.is_active,
    });
    setShowForm(true);
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta pesquisa?")) return;

    try {
      await supabase.from("satisfaction_surveys").delete().eq("id", id);
      toast.success("Pesquisa excluída!");
      loadSurveys();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateOption = (index: number, field: keyof SurveyOption, value: string | number) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if (formData.options.length >= 5) {
      toast.error("Máximo de 5 opções");
      return;
    }
    setFormData({
      ...formData,
      options: [...formData.options, { label: "", emoji: "⭐", score: formData.options.length + 1 }]
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.error("Mínimo de 2 opções");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  // Send dialog functions
  const openSendDialog = (survey: SatisfactionSurvey) => {
    setSelectedSurvey(survey);
    setSendTab("manual");
    setManualNumbers("");
    setParsedContacts([]);
    setSelectedLeads([]);
    setShowSendDialog(true);
  };

  const parseManualNumbers = () => {
    const lines = manualNumbers.split(/[\n,;]/).filter(l => l.trim());
    const contacts: SendContact[] = lines.map(line => {
      const cleaned = line.trim().replace(/\D/g, "");
      const errors: string[] = [];
      
      if (cleaned.length < 10) errors.push("Número muito curto");
      if (cleaned.length > 13) errors.push("Número muito longo");
      
      return {
        name: "",
        phone: cleaned,
        isValid: errors.length === 0,
        errors
      };
    });
    
    setParsedContacts(contacts);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(line => line.trim());
      
      const firstLine = lines[0]?.toLowerCase() || "";
      const hasHeader = firstLine.includes("nome") || firstLine.includes("name") || 
                       firstLine.includes("telefone") || firstLine.includes("phone");
      
      const startIndex = hasHeader ? 1 : 0;
      const contacts: SendContact[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
        const errors: string[] = [];
        
        const name = parts[0] || "";
        const phoneRaw = parts[1] || parts[0] || "";
        const cleaned = phoneRaw.replace(/\D/g, "");
        
        if (cleaned.length < 10) errors.push("Número curto");
        if (cleaned.length > 13) errors.push("Número longo");

        contacts.push({
          name: parts.length > 1 ? name : "",
          phone: cleaned,
          isValid: errors.length === 0,
          errors
        });
      }

      setParsedContacts(contacts);
      setSendTab("csv");
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAllLeads = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const getContactsToSend = (): { name: string; phone: string }[] => {
    if (sendTab === "manual" || sendTab === "csv") {
      return parsedContacts
        .filter(c => c.isValid)
        .map(c => ({ name: c.name, phone: c.phone }));
    } else {
      return leads
        .filter(l => selectedLeads.includes(l.id))
        .map(l => ({ name: l.name, phone: l.phone }));
    }
  };

  const handleSendSurvey = async () => {
    const contacts = getContactsToSend();
    
    if (contacts.length === 0) {
      toast.error("Nenhum contato válido para enviar");
      return;
    }

    if (!selectedSurvey?.connection_id) {
      toast.error("Configure uma conexão WhatsApp na pesquisa");
      return;
    }

    setSending(true);
    try {
      let sentCount = 0;

      for (const contact of contacts) {
        try {
          // Build button choices for UZAPI menu format - array of strings
          const choices = selectedSurvey.options.slice(0, 3).map((opt) => 
            `${opt.emoji} ${opt.label}`.substring(0, 20)
          );

          // Use wa-send-media edge function with correct format
          const { data, error } = await supabase.functions.invoke("wa-send-media", {
            body: {
              connectionId: selectedSurvey.connection_id,
              phone: contact.phone,
              type: "button",
              text: selectedSurvey.message_content,
              choices
            }
          });

          if (error) {
            console.error("Error sending to:", contact.phone, error);
          } else if (data?.success) {
            sentCount++;
          } else {
            console.error("Send failed:", contact.phone, data);
          }
          
          // Small delay between messages
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error("Error sending to:", contact.phone, err);
        }
      }

      // Update sent count
      await supabase
        .from("satisfaction_surveys")
        .update({ total_sent: (selectedSurvey.total_sent || 0) + sentCount })
        .eq("id", selectedSurvey.id);

      toast.success(`Pesquisa enviada para ${sentCount} contatos!`);
      setShowSendDialog(false);
      loadSurveys();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
  };

  const getScoreStats = (surveyResponses: SatisfactionResponse[]) => {
    if (surveyResponses.length === 0) {
      return { average: 0, satisfied: 0, neutral: 0, dissatisfied: 0 };
    }

    const scores = surveyResponses.filter((r) => r.response_score !== null).map((r) => r.response_score!);
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    const satisfied = surveyResponses.filter((r) => (r.response_score || 0) >= 4).length;
    const neutral = surveyResponses.filter((r) => r.response_score === 3).length;
    const dissatisfied = surveyResponses.filter((r) => (r.response_score || 0) <= 2).length;

    return { average, satisfied, neutral, dissatisfied };
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return cleaned;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Pesquisas de Satisfação</h3>
          <p className="text-sm text-muted-foreground">
            Colete feedback dos seus clientes com botões interativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDashboard(true)}
            disabled={surveys.length === 0}
          >
            <PieChart className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Pesquisa
          </Button>
        </div>
      </div>

      {/* Surveys List */}
      {surveys.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">Nenhuma pesquisa criada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua primeira pesquisa de satisfação
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Pesquisa
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {surveys.map((survey) => {
            const responseRate = survey.total_sent > 0 
              ? Math.round((survey.total_responses / survey.total_sent) * 100) 
              : 0;
            
            return (
              <Card key={survey.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{survey.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          {survey.total_sent} enviados
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {survey.total_responses} respostas
                        </span>
                        {survey.total_sent > 0 && (
                          <Badge variant="outline">{responseRate}% taxa</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openSendDialog(survey)}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Enviar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSurvey(survey);
                        loadResponses(survey.id);
                        setShowResults(true);
                      }}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Resultados
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editSurvey(survey)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSurvey(survey.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Survey Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSurvey ? "Editar Pesquisa" : "Nova Pesquisa de Satisfação"}
            </DialogTitle>
            <DialogDescription>
              Configure os botões interativos e a mensagem da pesquisa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Pesquisa</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Avaliação de Atendimento"
              />
            </div>
            <div>
              <Label>Conexão WhatsApp</Label>
              <Select
                value={formData.connection_id}
                onValueChange={(v) => setFormData({ ...formData, connection_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={formData.message_content}
                onChange={(e) =>
                  setFormData({ ...formData, message_content: e.target.value })
                }
                placeholder="Mensagem que será enviada junto com a pesquisa"
                className="h-20"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Opções de Resposta (Botões)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={formData.options.length >= 5}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Select
                      value={opt.emoji}
                      onValueChange={(v) => updateOption(idx, "emoji", v)}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMOJI_OPTIONS.map((emoji) => (
                          <SelectItem key={emoji} value={emoji}>
                            {emoji}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                      placeholder="Texto do botão"
                      className="flex-1"
                      maxLength={20}
                    />
                    <Input
                      type="number"
                      value={opt.score}
                      onChange={(e) => updateOption(idx, "score", parseInt(e.target.value) || 0)}
                      className="w-16"
                      min={1}
                      max={5}
                    />
                    {formData.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(idx)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Máximo 20 caracteres por botão. O WhatsApp aceita até 3 botões.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {selectedSurvey ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Survey Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar Pesquisa</DialogTitle>
            <DialogDescription>
              Selecione os contatos que receberão a pesquisa "{selectedSurvey?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={sendTab} onValueChange={(v) => setSendTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manual" className="gap-2">
                <Phone className="w-4 h-4" />
                Números
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Planilha
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-2">
                <Users className="w-4 h-4" />
                Contatos
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2">
                <Settings className="w-4 h-4" />
                Regras
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label>Digite os números (um por linha)</Label>
                <Textarea
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  placeholder="11999999999&#10;21988888888&#10;31977777777"
                  className="h-32 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas números, com DDD. Separe por linha, vírgula ou ponto-e-vírgula.
                </p>
              </div>
              <Button onClick={parseManualNumbers} variant="outline" className="w-full">
                Validar Números
              </Button>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <input
                type="file"
                accept=".csv,.txt"
                ref={csvInputRef}
                onChange={handleCsvUpload}
                className="hidden"
              />
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => csvInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Clique para enviar planilha</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CSV com colunas: Nome, Telefone
                </p>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              {leads.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum contato salvo</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={selectAllLeads}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      {selectedLeads.length === leads.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                    <Badge variant="secondary">
                      {selectedLeads.length} selecionados
                    </Badge>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow 
                            key={lead.id} 
                            className="cursor-pointer"
                            onClick={() => toggleLeadSelection(lead.id)}
                          >
                            <TableCell>
                              <Checkbox 
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => toggleLeadSelection(lead.id)}
                              />
                            </TableCell>
                            <TableCell>{lead.name}</TableCell>
                            <TableCell className="font-mono text-sm">{lead.phone}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Integração com ERP/CRM</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Conecte seu sistema ERP ou CRM para enviar pesquisas automaticamente baseado em regras como:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="p-4 border-dashed opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-sm">Após Compra</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviar pesquisa X dias após finalização de pedido
                    </p>
                  </Card>

                  <Card className="p-4 border-dashed opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm">Após Atendimento</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviar após encerrar conversa de suporte
                    </p>
                  </Card>

                  <Card className="p-4 border-dashed opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-sm">Após Entrega</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviar quando status mudar para "Entregue"
                    </p>
                  </Card>

                  <Card className="p-4 border-dashed opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-sm">Periódico</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviar para clientes ativos a cada X meses
                    </p>
                  </Card>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm text-orange-700">Integração Personalizada</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Para configurar regras automáticas de envio integradas ao seu ERP, CRM ou outros sistemas, 
                        entre em contato com nossa equipe de implementação.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 border-orange-500/50 text-orange-700 hover:bg-orange-500/10"
                        onClick={() => {
                          window.open("https://wa.me/5511999999999?text=Olá! Gostaria de configurar regras automáticas de pesquisa de satisfação integradas ao meu ERP.", "_blank");
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Falar com a Equipe
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Parsed contacts preview */}
          {(sendTab === "manual" || sendTab === "csv") && parsedContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-4">
                <Card className="flex-1 p-3 text-center">
                  <p className="text-xl font-bold text-green-600">
                    {parsedContacts.filter(c => c.isValid).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Válidos</p>
                </Card>
                <Card className="flex-1 p-3 text-center">
                  <p className="text-xl font-bold text-red-600">
                    {parsedContacts.filter(c => !c.isValid).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Inválidos</p>
                </Card>
              </div>
              
              {parsedContacts.some(c => !c.isValid) && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Números inválidos serão ignorados
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendSurvey} 
              disabled={sending || getContactsToSend().length === 0}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar para {getContactsToSend().length} contatos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultados - {selectedSurvey?.name}</DialogTitle>
          </DialogHeader>
          {selectedSurvey && (
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="responses">Respostas ({responses.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="p-3 text-center">
                      <p className="text-2xl font-bold">{selectedSurvey.total_sent}</p>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-2xl font-bold">{responses.length}</p>
                      <p className="text-xs text-muted-foreground">Respostas</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {getScoreStats(responses).satisfied}
                      </p>
                      <p className="text-xs text-muted-foreground">Satisfeitos</p>
                    </Card>
                    <Card className="p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {getScoreStats(responses).dissatisfied}
                      </p>
                      <p className="text-xs text-muted-foreground">Insatisfeitos</p>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h4 className="font-medium mb-4">Distribuição de Respostas</h4>
                    <div className="space-y-3">
                      {selectedSurvey.options.map((opt) => {
                        const count = responses.filter(
                          (r) => r.response_value === opt.label
                        ).length;
                        const percentage = responses.length > 0 
                          ? Math.round((count / responses.length) * 100) 
                          : 0;
                        
                        return (
                          <div key={opt.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-2 text-sm">
                                <span>{opt.emoji}</span>
                                {opt.label}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {responses.length > 0 && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Nota Média</h4>
                          <p className="text-sm text-muted-foreground">
                            Baseado em {responses.length} respostas
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold">
                            {getScoreStats(responses).average.toFixed(1)}
                          </p>
                          <p className="text-sm text-muted-foreground">de 5.0</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="responses">
                {responses.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma resposta ainda</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {responses.map((r) => {
                        const option = selectedSurvey.options.find(
                          (o) => o.label === r.response_value
                        );
                        return (
                          <Card key={r.id} className="p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{option?.emoji || "📝"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {r.contact_name || formatPhone(r.contact_phone)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {r.response_value}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                {format(new Date(r.responded_at), "dd/MM HH:mm", {
                                  locale: ptBR,
                                })}
                              </div>
                            </div>
                            {r.feedback_text && (
                              <p className="text-sm text-muted-foreground mt-2 pl-10">
                                "{r.feedback_text}"
                              </p>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Dashboard Dialog */}
      <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dashboard de Satisfação</DialogTitle>
          </DialogHeader>
          <SatisfactionDashboard surveys={surveys} allResponses={allResponses} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
