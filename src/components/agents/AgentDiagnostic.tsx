import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Stethoscope, Loader2, AlertTriangle, AlertCircle, Info,
  Check, Wrench, RefreshCw, FileText, BookOpen, Settings, Code,
  ChevronDown, ChevronUp, Zap, CheckCircle, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiagnosticIssue {
  category: "prompt" | "conhecimento" | "configuracao" | "sistema";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  fix_type: "prompt" | "knowledge" | "config" | "manual";
  fix_content: string;
  fix_description: string;
  fixed?: boolean;
  testing?: boolean;
  testResult?: { before: string; after: string; improved: boolean };
}

interface DiagnosticResult {
  issues: DiagnosticIssue[];
  score: number;
  summary: string;
}

interface AgentDiagnosticProps {
  systemPrompt: string;
  knowledgeText: string;
  agentName: string;
  agentConfig: {
    model?: string;
    temperature?: number;
    can_understand_images?: boolean;
    can_understand_audio?: boolean;
    can_send_images?: boolean;
    can_process_pdf?: boolean;
    signature?: string;
    output_markers?: string;
  };
  onApplyPrompt: (newPrompt: string) => void;
  onApplyKnowledge: (newKnowledge: string) => void;
  onApplyConfig?: (config: Record<string, any>) => void;
}

const categoryIcons: Record<string, any> = {
  prompt: FileText,
  conhecimento: BookOpen,
  configuracao: Settings,
  sistema: Code,
};

const categoryLabels: Record<string, string> = {
  prompt: "Prompt",
  conhecimento: "Base de Conhecimento",
  configuracao: "Configuração",
  sistema: "Sistema",
};

const severityConfig = {
  critical: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertCircle, label: "Crítico" },
  warning: { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: AlertTriangle, label: "Atenção" },
  info: { color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: Info, label: "Info" },
};

export const AgentDiagnostic = ({
  systemPrompt,
  knowledgeText,
  agentName,
  agentConfig,
  onApplyPrompt,
  onApplyKnowledge,
  onApplyConfig,
}: AgentDiagnosticProps) => {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [fixingAll, setFixingAll] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    setDiagnostic(null);
    try {
      const { data, error } = await supabase.functions.invoke("improve-agent-prompt", {
        body: { systemPrompt, knowledgeText, agentName, mode: "full_diagnostic", agentConfig },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let parsed: DiagnosticResult;
      const resultStr = (data.result || "").trim();
      // Remove markdown fences if present
      const cleaned = resultStr.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error("A IA retornou um formato inválido. Tente novamente.");
      }

      setDiagnostic(parsed);
    } catch (err: any) {
      toast.error(err.message || "Erro ao diagnosticar");
    } finally {
      setLoading(false);
    }
  };

  const testFix = async (issueIdx: number) => {
    if (!diagnostic) return;
    const issue = diagnostic.issues[issueIdx];

    setDiagnostic(prev => {
      if (!prev) return prev;
      const updated = { ...prev, issues: [...prev.issues] };
      updated.issues[issueIdx] = { ...issue, testing: true };
      return updated;
    });

    try {
      // Generate a test question based on the issue
      const testQuestion = issue.category === "conhecimento"
        ? `Me diga sobre: ${issue.title}`
        : issue.category === "prompt"
        ? "Olá, preciso de ajuda"
        : "Quais são seus serviços?";

      // Test BEFORE fix
      const { data: beforeData } = await supabase.functions.invoke("improve-agent-prompt", {
        body: {
          systemPrompt,
          knowledgeText,
          agentName,
          mode: "diagnostic_test",
          testMessage: testQuestion,
        },
      });

      // Apply fix temporarily and test AFTER
      let newPrompt = systemPrompt;
      let newKnowledge = knowledgeText;
      if (issue.fix_type === "prompt") {
        newPrompt = systemPrompt ? `${systemPrompt}\n\n${issue.fix_content}` : issue.fix_content;
      } else if (issue.fix_type === "knowledge") {
        newKnowledge = knowledgeText ? `${knowledgeText}\n\n${issue.fix_content}` : issue.fix_content;
      }

      const { data: afterData } = await supabase.functions.invoke("improve-agent-prompt", {
        body: {
          systemPrompt: newPrompt,
          knowledgeText: newKnowledge,
          agentName,
          mode: "diagnostic_test",
          testMessage: testQuestion,
        },
      });

      setDiagnostic(prev => {
        if (!prev) return prev;
        const updated = { ...prev, issues: [...prev.issues] };
        updated.issues[issueIdx] = {
          ...issue,
          testing: false,
          testResult: {
            before: beforeData?.result || "(sem resposta)",
            after: afterData?.result || "(sem resposta)",
            improved: true,
          },
        };
        return updated;
      });
    } catch {
      toast.error("Erro ao testar correção");
      setDiagnostic(prev => {
        if (!prev) return prev;
        const updated = { ...prev, issues: [...prev.issues] };
        updated.issues[issueIdx] = { ...issue, testing: false };
        return updated;
      });
    }
  };

  const applyFix = (issueIdx: number) => {
    if (!diagnostic) return;
    const issue = diagnostic.issues[issueIdx];

    if (issue.fix_type === "prompt") {
      const newPrompt = systemPrompt ? `${systemPrompt}\n\n${issue.fix_content}` : issue.fix_content;
      onApplyPrompt(newPrompt);
    } else if (issue.fix_type === "knowledge") {
      const newKnowledge = knowledgeText ? `${knowledgeText}\n\n${issue.fix_content}` : issue.fix_content;
      onApplyKnowledge(newKnowledge);
    } else if (issue.fix_type === "config" && onApplyConfig) {
      try {
        const configChanges = JSON.parse(issue.fix_content);
        onApplyConfig(configChanges);
      } catch {
        toast.error("Formato de configuração inválido");
        return;
      }
    } else if (issue.fix_type === "manual") {
      toast.info("⚙️ Correção manual necessária: " + issue.fix_content, { duration: 8000 });
      setDiagnostic(prev => {
        if (!prev) return prev;
        const updated = { ...prev, issues: [...prev.issues] };
        updated.issues[issueIdx] = { ...issue, fixed: true };
        return updated;
      });
      return;
    }

    toast.success(`✅ Correção aplicada: ${issue.title}`);
    setDiagnostic(prev => {
      if (!prev) return prev;
      const updated = { ...prev, issues: [...prev.issues] };
      updated.issues[issueIdx] = { ...issue, fixed: true };
      return updated;
    });
  };

  const fixAllAutomatic = async () => {
    if (!diagnostic) return;
    setFixingAll(true);

    const autoFixable = diagnostic.issues
      .map((issue, idx) => ({ issue, idx }))
      .filter(({ issue }) => !issue.fixed && issue.fix_type !== "manual");

    for (const { issue, idx } of autoFixable) {
      applyFix(idx);
      await new Promise(r => setTimeout(r, 300)); // small delay for UI
    }

    // Now test one by one
    for (const { issue, idx } of autoFixable) {
      if (issue.fix_type === "prompt" || issue.fix_type === "knowledge") {
        await testFix(idx);
      }
    }

    setFixingAll(false);
    toast.success("🎉 Todas as correções automáticas foram aplicadas e testadas!");
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const fixableCount = diagnostic?.issues.filter(i => !i.fixed && i.fix_type !== "manual").length || 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Diagnóstico do Agente</h3>
          </div>
          <div className="flex items-center gap-2">
            {diagnostic && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Analisa prompt, base de conhecimento, configurações e sistema. Detecta problemas e corrige automaticamente com teste antes/depois.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <Button
            onClick={runDiagnostic}
            disabled={loading || fixingAll}
            size="sm"
            className="text-xs"
          >
            {loading ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Analisando...</>
            ) : (
              <><Stethoscope className="w-3 h-3 mr-1.5" /> Executar Diagnóstico</>
            )}
          </Button>

          {diagnostic && fixableCount > 0 && (
            <Button
              onClick={fixAllAutomatic}
              disabled={fixingAll || loading}
              size="sm"
              variant="default"
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {fixingAll ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Corrigindo...</>
              ) : (
                <><Zap className="w-3 h-3 mr-1.5" /> Corrigir {fixableCount} problemas automaticamente</>
              )}
            </Button>
          )}
        </div>

        {diagnostic && expanded && (
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background border">
              <div className="text-center">
                <span className={`text-3xl font-bold ${scoreColor(diagnostic.score)}`}>
                  {diagnostic.score}
                </span>
                <p className="text-[10px] text-muted-foreground">/100</p>
              </div>
              <div className="flex-1">
                <Progress value={diagnostic.score} className="h-2 mb-1.5" />
                <p className="text-xs text-muted-foreground">{diagnostic.summary}</p>
              </div>
            </div>

            {/* Issues grouped by category */}
            {["prompt", "conhecimento", "configuracao", "sistema"].map(cat => {
              const catIssues = diagnostic.issues.filter(i => i.category === cat);
              if (catIssues.length === 0) return null;
              const CatIcon = categoryIcons[cat];

              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CatIcon className="w-3.5 h-3.5" />
                    {categoryLabels[cat]}
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {catIssues.length}
                    </Badge>
                  </div>

                  {catIssues.map((issue, i) => {
                    const globalIdx = diagnostic.issues.indexOf(issue);
                    const sev = severityConfig[issue.severity];
                    const SevIcon = sev.icon;

                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 text-xs space-y-2 ${
                          issue.fixed ? "border-emerald-500/30 bg-emerald-500/5" : sev.color
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <SevIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{issue.title}</span>
                              <Badge variant="outline" className="text-[9px] h-4">
                                {sev.label}
                              </Badge>
                              {issue.fixed && (
                                <Badge className="text-[9px] h-4 bg-emerald-500 text-white">
                                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Corrigido
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-1">{issue.description}</p>
                          </div>
                        </div>

                        {/* Fix content preview */}
                        <div className="bg-background/80 rounded-md p-2 border text-[11px] font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
                          {issue.fix_type === "manual" ? (
                            <span className="text-amber-600">⚙️ {issue.fix_content}</span>
                          ) : (
                            issue.fix_content
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{issue.fix_description}</p>

                        {/* Test result - before/after */}
                        {issue.testResult && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                              <p className="text-[10px] font-semibold text-destructive mb-1">❌ Antes</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-4">{issue.testResult.before}</p>
                            </div>
                            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                              <p className="text-[10px] font-semibold text-emerald-600 mb-1">✅ Depois</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-4">{issue.testResult.after}</p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {!issue.fixed && (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => applyFix(globalIdx)}
                              disabled={fixingAll}
                            >
                              <Wrench className="w-2.5 h-2.5 mr-1" />
                              Corrigir
                            </Button>
                            {(issue.fix_type === "prompt" || issue.fix_type === "knowledge") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px]"
                                onClick={() => testFix(globalIdx)}
                                disabled={issue.testing || fixingAll}
                              >
                                {issue.testing ? (
                                  <><Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> Testando...</>
                                ) : (
                                  <><RefreshCw className="w-2.5 h-2.5 mr-1" /> Testar antes/depois</>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {diagnostic.issues.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600">Nenhum problema encontrado!</p>
                <p className="text-xs text-muted-foreground">Seu agente está bem configurado.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
