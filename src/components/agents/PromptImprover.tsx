import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Wand2, BookOpen, Lightbulb, Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromptImproverProps {
  systemPrompt: string;
  knowledgeText: string;
  agentName: string;
  onApplyPrompt: (newPrompt: string) => void;
  onApplyKnowledge: (newKnowledge: string) => void;
}

type Mode = "improve_prompt" | "improve_knowledge" | "suggest_additions";

export const PromptImprover = ({
  systemPrompt,
  knowledgeText,
  agentName,
  onApplyPrompt,
  onApplyKnowledge,
}: PromptImproverProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const analyze = async (mode: Mode) => {
    setLoading(true);
    setActiveMode(mode);
    setResult(null);
    setExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke("improve-agent-prompt", {
        body: { systemPrompt, knowledgeText, agentName, mode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.result);
    } catch (err: any) {
      console.error("Erro ao analisar:", err);
      toast.error(err.message || "Erro ao analisar com IA");
    } finally {
      setLoading(false);
    }
  };

  const extractCodeBlock = (tag: string): string | null => {
    if (!result) return null;
    const regex = new RegExp("```" + tag + "\\n([\\s\\S]*?)```", "i");
    const match = result.match(regex);
    return match ? match[1].trim() : null;
  };

  const handleApply = () => {
    if (activeMode === "improve_prompt") {
      const improved = extractCodeBlock("prompt");
      if (improved) {
        onApplyPrompt(improved);
        toast.success("Prompt atualizado!");
      } else {
        toast.error("Não foi possível extrair o prompt melhorado");
      }
    } else if (activeMode === "improve_knowledge") {
      const improved = extractCodeBlock("knowledge");
      if (improved) {
        onApplyKnowledge(improved);
        toast.success("Base de conhecimento atualizada!");
      } else {
        toast.error("Não foi possível extrair a base melhorada");
      }
    } else if (activeMode === "suggest_additions") {
      const faq = extractCodeBlock("faq");
      if (faq) {
        const current = knowledgeText ? knowledgeText + "\n\n" : "";
        onApplyKnowledge(current + faq);
        toast.success("FAQ adicionado à base de conhecimento!");
      } else {
        toast.error("Não foi possível extrair o FAQ sugerido");
      }
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canApply = result && (
    (activeMode === "improve_prompt" && extractCodeBlock("prompt")) ||
    (activeMode === "improve_knowledge" && extractCodeBlock("knowledge")) ||
    (activeMode === "suggest_additions" && extractCodeBlock("faq"))
  );

  const actions = [
    {
      mode: "improve_prompt" as Mode,
      icon: Wand2,
      label: "Melhorar Prompt",
      description: "Analisa e sugere melhorias no contexto base",
      disabled: !systemPrompt?.trim(),
    },
    {
      mode: "improve_knowledge" as Mode,
      icon: BookOpen,
      label: "Melhorar Base",
      description: "Organiza e melhora a base de conhecimento",
      disabled: !knowledgeText?.trim(),
    },
    {
      mode: "suggest_additions" as Mode,
      icon: Lightbulb,
      label: "Sugerir Conteúdo",
      description: "Identifica gaps e sugere novos conteúdos",
      disabled: !systemPrompt?.trim() && !knowledgeText?.trim(),
    },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Assistente de Prompt</h3>
          </div>
          {result && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {actions.map((action) => (
            <Button
              key={action.mode}
              variant={activeMode === action.mode ? "default" : "outline"}
              size="sm"
              onClick={() => analyze(action.mode)}
              disabled={loading || action.disabled}
              className="text-xs"
            >
              {loading && activeMode === action.mode ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <action.icon className="w-3 h-3 mr-1.5" />
              )}
              {action.label}
            </Button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando com IA...
          </div>
        )}

        {result && expanded && !loading && (
          <div className="space-y-3">
            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-background p-4 text-sm whitespace-pre-wrap border">
              {result}
            </div>

            <div className="flex items-center gap-2">
              {canApply && (
                <Button size="sm" onClick={handleApply} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Check className="w-3 h-3 mr-1.5" />
                  Aplicar Sugestão
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-3 h-3 mr-1.5" />
                ) : (
                  <Copy className="w-3 h-3 mr-1.5" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
