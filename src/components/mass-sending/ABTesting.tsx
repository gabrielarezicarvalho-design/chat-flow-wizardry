import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  BarChart3,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  MousePointer,
  Send,
  Check,
  X,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Variant {
  id: string;
  name: string;
  content: string;
  mediaUrl?: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
}

interface ABTest {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "paused";
  variants: Variant[];
  winnerId?: string;
  totalContacts: number;
  splitPercentage: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultVariant = (): Variant => ({
  id: generateId(),
  name: "Variante A",
  content: "",
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  converted: 0,
});

export function ABTesting() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);

  // Create form state
  const [testName, setTestName] = useState("");
  const [variants, setVariants] = useState<Variant[]>([
    { ...defaultVariant(), name: "Variante A" },
    { ...defaultVariant(), id: generateId(), name: "Variante B" },
  ]);
  const [splitPercentage, setSplitPercentage] = useState(50);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    // Simulated data for demonstration
    const mockTests: ABTest[] = [
      {
        id: "1",
        name: "Teste de Emoji vs Sem Emoji",
        status: "completed",
        variants: [
          {
            id: "a",
            name: "Com Emoji 🎉",
            content: "🎉 Aproveite nossa promoção exclusiva! Até 50% OFF em produtos selecionados.",
            sent: 500,
            delivered: 485,
            opened: 320,
            clicked: 89,
            converted: 34,
          },
          {
            id: "b",
            name: "Sem Emoji",
            content: "Aproveite nossa promoção exclusiva! Até 50% OFF em produtos selecionados.",
            sent: 500,
            delivered: 478,
            opened: 245,
            clicked: 52,
            converted: 18,
          },
        ],
        winnerId: "a",
        totalContacts: 1000,
        splitPercentage: 50,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: "2",
        name: "Teste CTA Urgência",
        status: "running",
        variants: [
          {
            id: "a",
            name: "CTA Padrão",
            content: "Confira nossas ofertas! Clique aqui para ver.",
            sent: 300,
            delivered: 290,
            opened: 156,
            clicked: 45,
            converted: 12,
          },
          {
            id: "b",
            name: "CTA Urgente",
            content: "⚡ ÚLTIMAS HORAS! Ofertas acabando, clique AGORA!",
            sent: 300,
            delivered: 287,
            opened: 198,
            clicked: 78,
            converted: 28,
          },
        ],
        totalContacts: 600,
        splitPercentage: 50,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ];
    setTests(mockTests);
    setLoading(false);
  };

  const addVariant = () => {
    if (variants.length >= 4) {
      toast.error("Máximo de 4 variantes permitido");
      return;
    }
    const letter = String.fromCharCode(65 + variants.length);
    setVariants([...variants, { ...defaultVariant(), id: generateId(), name: `Variante ${letter}` }]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 2) {
      toast.error("Mínimo de 2 variantes necessário");
      return;
    }
    setVariants(variants.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof Variant, value: string) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const createTest = async () => {
    if (!testName.trim()) {
      toast.error("Digite um nome para o teste");
      return;
    }
    if (variants.some((v) => !v.content.trim())) {
      toast.error("Preencha o conteúdo de todas as variantes");
      return;
    }

    const newTest: ABTest = {
      id: generateId(),
      name: testName,
      status: "draft",
      variants: variants.map((v) => ({ ...v, sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 })),
      totalContacts: 0,
      splitPercentage,
      createdAt: new Date(),
    };

    setTests([newTest, ...tests]);
    setShowCreateDialog(false);
    resetForm();
    toast.success("Teste A/B criado com sucesso!");
  };

  const resetForm = () => {
    setTestName("");
    setVariants([
      { ...defaultVariant(), name: "Variante A" },
      { ...defaultVariant(), id: generateId(), name: "Variante B" },
    ]);
    setSplitPercentage(50);
  };

  const startTest = (test: ABTest) => {
    setTests(tests.map((t) => (t.id === test.id ? { ...t, status: "running", startedAt: new Date() } : t)));
    toast.success("Teste iniciado!");
  };

  const pauseTest = (test: ABTest) => {
    setTests(tests.map((t) => (t.id === test.id ? { ...t, status: "paused" } : t)));
    toast.info("Teste pausado");
  };

  const getWinnerVariant = (test: ABTest): Variant | undefined => {
    if (test.winnerId) {
      return test.variants.find((v) => v.id === test.winnerId);
    }
    return test.variants.reduce((prev, curr) =>
      (curr.clicked / (curr.delivered || 1)) > (prev.clicked / (prev.delivered || 1)) ? curr : prev
    );
  };

  const getMetricComparison = (v1: number, v2: number): { diff: number; trend: "up" | "down" | "equal" } => {
    const diff = ((v1 - v2) / (v2 || 1)) * 100;
    return {
      diff: Math.abs(Math.round(diff)),
      trend: diff > 0 ? "up" : diff < 0 ? "down" : "equal",
    };
  };

  const getStatusBadge = (status: ABTest["status"]) => {
    const statusConfig = {
      draft: { label: "Rascunho", variant: "secondary" as const },
      running: { label: "Em execução", variant: "default" as const },
      paused: { label: "Pausado", variant: "outline" as const },
      completed: { label: "Concluído", variant: "secondary" as const },
    };
    return statusConfig[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            Testes A/B
          </h2>
          <p className="text-muted-foreground mt-1">
            Compare diferentes versões de mensagens para otimizar suas campanhas
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Teste
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                Criar Novo Teste A/B
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <Label>Nome do Teste</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Ex: Teste Emoji vs Texto Simples"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Divisão de Tráfego</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Select value={splitPercentage.toString()} onValueChange={(v) => setSplitPercentage(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50/50</SelectItem>
                      <SelectItem value="70">70/30</SelectItem>
                      <SelectItem value="80">80/20</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {splitPercentage}% / {100 - splitPercentage}% (para 2 variantes)
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Variantes ({variants.length}/4)</Label>
                  <Button variant="outline" size="sm" onClick={addVariant} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>

                <AnimatePresence>
                  {variants.map((variant, index) => (
                    <motion.div
                      key={variant.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card className="p-4 border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                              style={{
                                backgroundColor: `hsl(${(index * 360) / variants.length}, 70%, 50%)`,
                              }}
                            >
                              {String.fromCharCode(65 + index)}
                            </div>
                            <Input
                              value={variant.name}
                              onChange={(e) => updateVariant(variant.id, "name", e.target.value)}
                              className="w-40 h-8"
                            />
                          </div>
                          {variants.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVariant(variant.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <Textarea
                          value={variant.content}
                          onChange={(e) => updateVariant(variant.id, "content", e.target.value)}
                          placeholder="Digite o conteúdo da mensagem..."
                          rows={3}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Sparkles className="w-4 h-4" />
                            Sugerir com IA
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createTest}>Criar Teste</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum teste A/B criado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro teste para comparar diferentes versões de mensagens
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Teste A/B
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const winner = getWinnerVariant(test);
            const statusBadge = getStatusBadge(test.status);

            return (
              <motion.div key={test.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-6 border-border/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground">{test.name}</h3>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                        {test.status === "completed" && winner && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Trophy className="w-3 h-3 mr-1" />
                            Vencedor: {winner.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criado em {test.createdAt.toLocaleDateString("pt-BR")} •{" "}
                        {test.variants.length} variantes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.status === "draft" && (
                        <Button size="sm" onClick={() => startTest(test)} className="gap-1">
                          <Play className="w-4 h-4" />
                          Iniciar
                        </Button>
                      )}
                      {test.status === "running" && (
                        <Button size="sm" variant="outline" onClick={() => pauseTest(test)} className="gap-1">
                          <Pause className="w-4 h-4" />
                          Pausar
                        </Button>
                      )}
                      {test.status === "paused" && (
                        <Button size="sm" onClick={() => startTest(test)} className="gap-1">
                          <Play className="w-4 h-4" />
                          Retomar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTest(selectedTest?.id === test.id ? null : test)}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Variants Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {test.variants.map((variant, index) => {
                      const openRate = variant.delivered > 0 ? (variant.opened / variant.delivered) * 100 : 0;
                      const clickRate = variant.delivered > 0 ? (variant.clicked / variant.delivered) * 100 : 0;
                      const isWinner = winner?.id === variant.id;

                      return (
                        <Card
                          key={variant.id}
                          className={`p-4 border-2 ${
                            isWinner && test.status === "completed"
                              ? "border-amber-500/50 bg-amber-500/5"
                              : "border-border/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{
                                  backgroundColor: `hsl(${(index * 360) / test.variants.length}, 70%, 50%)`,
                                }}
                              >
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span className="font-medium text-foreground">{variant.name}</span>
                              {isWinner && test.status === "completed" && (
                                <Trophy className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{variant.content}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold text-foreground">{variant.sent}</p>
                              <p className="text-xs text-muted-foreground">Enviados</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-foreground">{openRate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">Abertura</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-foreground">{clickRate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">Cliques</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Detailed Stats */}
                  <AnimatePresence>
                    {selectedTest?.id === test.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-border">
                          <h4 className="text-sm font-medium text-foreground mb-4">Comparação Detalhada</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={test.variants.map((v) => ({
                                  name: v.name,
                                  "Taxa de Abertura": v.delivered > 0 ? ((v.opened / v.delivered) * 100).toFixed(1) : 0,
                                  "Taxa de Cliques": v.delivered > 0 ? ((v.clicked / v.delivered) * 100).toFixed(1) : 0,
                                  "Taxa de Conversão": v.delivered > 0 ? ((v.converted / v.delivered) * 100).toFixed(1) : 0,
                                }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                  }}
                                />
                                <Bar dataKey="Taxa de Abertura" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Taxa de Cliques" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Taxa de Conversão" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
