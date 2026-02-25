import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2, BookOpen, Lightbulb, Loader2, Copy, Check, ChevronDown, ChevronUp, MessageCircle, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromptImproverProps {
  systemPrompt: string;
  knowledgeText: string;
  agentName: string;
  onApplyPrompt: (newPrompt: string) => void;
  onApplyKnowledge: (newKnowledge: string) => void;
}

type Mode = "improve_prompt" | "improve_knowledge" | "suggest_additions" | "diagnostic_chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  diagnosis?: string;
}

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
  
  // Diagnostic chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const analyze = async (mode: Mode) => {
    if (mode === "diagnostic_chat") {
      setActiveMode(mode);
      setResult(null);
      setExpanded(true);
      setChatMessages([]);
      return;
    }

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

  const sendDiagnosticMessage = async () => {
    if (!chatInput.trim() || loading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("improve-agent-prompt", {
        body: {
          systemPrompt,
          knowledgeText,
          agentName,
          mode: "diagnostic_chat",
          testMessage: userMsg,
          chatHistory: chatMessages,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fullResponse = data.result || "";
      const parts = fullResponse.split("---DIAGNÓSTICO---");
      const agentResponse = parts[0]?.trim() || fullResponse;
      const diagnosis = parts[1]?.trim() || null;

      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: agentResponse, diagnosis: diagnosis || undefined },
      ]);
    } catch (err: any) {
      console.error("Erro no chat diagnóstico:", err);
      toast.error(err.message || "Erro ao testar com IA");
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Erro ao processar. Verifique suas chaves de IA em Configurações → IA." },
      ]);
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
      disabled: !systemPrompt?.trim(),
    },
    {
      mode: "improve_knowledge" as Mode,
      icon: BookOpen,
      label: "Melhorar Base",
      disabled: !knowledgeText?.trim(),
    },
    {
      mode: "suggest_additions" as Mode,
      icon: Lightbulb,
      label: "Sugerir Conteúdo",
      disabled: !systemPrompt?.trim() && !knowledgeText?.trim(),
    },
    {
      mode: "diagnostic_chat" as Mode,
      icon: MessageCircle,
      label: "Testar Chat",
      disabled: !systemPrompt?.trim(),
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
          {(result || activeMode === "diagnostic_chat") && (
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
              {loading && activeMode === action.mode && action.mode !== "diagnostic_chat" ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <action.icon className="w-3 h-3 mr-1.5" />
              )}
              {action.label}
            </Button>
          ))}
        </div>

        {/* Diagnostic Chat Mode */}
        {activeMode === "diagnostic_chat" && expanded && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Simule uma conversa com o agente para testar o prompt. A IA vai responder como o agente e mostrar um diagnóstico de cada resposta.
            </p>

            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-background border p-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Envie uma mensagem para testar como o agente "{agentName}" responderia.
                  <br />
                  Ex: "Olá", "quais os planos?", "meu rastreador não funciona"
                </p>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className="space-y-1">
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-[10px] font-medium opacity-70 mb-0.5">
                        {msg.role === "user" ? "Cliente (teste)" : agentName}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>

                  {msg.diagnosis && (
                    <div className="ml-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Diagnóstico
                      </div>
                      <p className="text-foreground/80 whitespace-pre-wrap">{msg.diagnosis}</p>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analisando resposta...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendDiagnosticMessage()}
                placeholder="Digite uma mensagem de teste..."
                disabled={loading}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={sendDiagnosticMessage}
                disabled={loading || !chatInput.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Analysis modes */}
        {loading && activeMode !== "diagnostic_chat" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando com IA...
          </div>
        )}

        {result && expanded && !loading && activeMode !== "diagnostic_chat" && (
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
