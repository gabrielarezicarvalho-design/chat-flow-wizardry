import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, BarChart3, Send, Star, MessageSquare, Edit, Users, PieChart, Phone, Upload, X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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

export function SatisfactionSurveys({ connections }: SatisfactionSurveysProps) {
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SatisfactionSurvey | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    connection_id: "",
    message_content: "Olá! Gostaríamos de saber sua opinião sobre nosso atendimento. Como você avalia sua experiência?",
    survey_type: "buttons",
    options: DEFAULT_OPTIONS,
    is_active: true,
  });

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

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Digite um nome para a pesquisa");
      return;
    }
    if (!formData.message_content.trim()) {
      toast.error("Digite a mensagem da pesquisa");
      return;
    }

    setSaving(true);
    try {
      // Placeholder - would save to database
      toast.success(selectedSurvey ? "Pesquisa atualizada!" : "Pesquisa criada!");
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Pesquisas de Satisfação</h3>
          <p className="text-sm text-muted-foreground">
            Crie pesquisas para medir a satisfação dos seus clientes
          </p>
        </div>
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

      {/* Empty State */}
      {surveys.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">Nenhuma pesquisa de satisfação</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua primeira pesquisa para medir a satisfação dos clientes
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
      )}

      {/* Surveys List */}
      {surveys.length > 0 && (
        <div className="grid gap-4">
          {surveys.map((survey) => (
            <Card key={survey.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{survey.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {survey.total_sent || 0} enviadas • {survey.total_responses || 0} respostas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={survey.is_active ? "default" : "secondary"}>
                    {survey.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSurvey ? "Editar Pesquisa" : "Nova Pesquisa de Satisfação"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Pesquisa *</Label>
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
            </div>

            <div>
              <Label>Mensagem da Pesquisa *</Label>
              <Textarea
                value={formData.message_content}
                onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                placeholder="Digite a mensagem que será enviada..."
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Opções de Resposta</Label>
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={option.emoji}
                      onChange={(e) => updateOption(idx, 'emoji', e.target.value)}
                      className="w-16 text-center"
                      maxLength={2}
                    />
                    <Input
                      value={option.label}
                      onChange={(e) => updateOption(idx, 'label', e.target.value)}
                      placeholder="Texto da opção"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={option.score}
                      onChange={(e) => updateOption(idx, 'score', Number(e.target.value))}
                      className="w-16"
                      min={1}
                      max={5}
                    />
                    {formData.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedSurvey ? "Salvar" : "Criar Pesquisa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}