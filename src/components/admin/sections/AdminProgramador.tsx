import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { 
  Code2, Send, ImagePlus, Trash2, Bot, User, Loader2, 
  AlertTriangle, Bug, Lightbulb, Cpu, X, Building2, Wrench, Copy, Check,
  Zap, FileCode, CheckCircle2
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string | any[];
}

interface Company {
  id: string;
  name: string;
}

interface AgentFix {
  type: "agent-fix";
  agentId: string;
  agentName: string;
  fixes: { field: string; description: string; newValue: string }[];
}

interface CodeFix {
  type: "code-fix";
  file: string;
  description: string;
  code: string;
}

type FixBlock = AgentFix | CodeFix;

export function AdminProgramador() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [applyingFix, setApplyingFix] = useState<string | null>(null);
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load companies
  useEffect(() => {
    const loadCompanies = async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("is_active", true);
      if (data) {
        setCompanies(data);
        if (data.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(data[0].id);
        }
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // === Parse fix blocks from assistant message ===
  const parseFixBlocks = (text: string): FixBlock[] => {
    const blocks: FixBlock[] = [];
    const agentFixRegex = /```json:apply-fix\s*\n([\s\S]*?)```/g;
    const codeFixRegex = /```json:code-fix\s*\n([\s\S]*?)```/g;
    
    let match;
    while ((match = agentFixRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.type === "agent-fix") blocks.push(parsed);
      } catch { /* ignore */ }
    }
    while ((match = codeFixRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.type === "code-fix") blocks.push(parsed);
      } catch { /* ignore */ }
    }
    return blocks;
  };

  // === Remove fix blocks from displayed text ===
  const cleanMessageText = (text: string): string => {
    return text
      .replace(/```json:apply-fix\s*\n[\s\S]*?```/g, '')
      .replace(/```json:code-fix\s*\n[\s\S]*?```/g, '')
      .trim();
  };

  // === Apply agent fix ===
  const applyAgentFix = async (fix: AgentFix) => {
    const fixKey = `agent-${fix.agentId}`;
    setApplyingFix(fixKey);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      for (const f of fix.fixes) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-programmer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: "apply-fix",
              agentId: fix.agentId,
              field: f.field,
              newValue: f.newValue,
              companyId: selectedCompanyId,
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Erro ao aplicar correção");
        }
      }

      setAppliedFixes(prev => new Set(prev).add(fixKey));
      toast.success(`✅ Correção aplicada no agente "${fix.agentName}"!`);
    } catch (error: any) {
      console.error("Erro ao aplicar fix:", error);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setApplyingFix(null);
    }
  };

  // === Shared streaming function ===
  const streamFromAPI = async (apiMessages: any[], onUpdate: (text: string) => void): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-programmer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          action: "chat",
          companyId: selectedCompanyId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Sem stream");

    const decoder = new TextDecoder();
    let assistantText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantText += content;
            onUpdate(assistantText);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantText += content;
            onUpdate(assistantText);
          }
        } catch { /* ignore */ }
      }
    }

    return assistantText;
  };

  // === Image handling ===
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          setImages(prev => [...prev, base64]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // === Send message ===
  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && images.length === 0) return;
    if (isLoading) return;

    let userContent: any;
    if (images.length > 0) {
      userContent = [];
      images.forEach(img => {
        userContent.push({ type: "image_url", image_url: { url: img, detail: "high" } });
      });
      userContent.push({ type: "text", text: trimmedInput || "Analise esta imagem e identifique o problema." });
    } else {
      userContent = trimmedInput;
    }

    const userMessage: Message = { role: "user", content: userContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setImages([]);
    setIsLoading(true);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      await streamFromAPI(apiMessages, (text) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
          }
          return [...prev, { role: "assistant", content: text }];
        });
      });
    } catch (error: any) {
      console.error("Erro:", error);
      setMessages(prev => [...prev, { role: "assistant", content: `❌ **Erro:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // === Resolve Problem ===
  const handleResolveProblem = async (assistantMessageIndex: number) => {
    if (isLoading) return;
    setIsLoading(true);

    const contextMessages = messages.slice(0, assistantMessageIndex + 1);

    const resolvePrompt: Message = {
      role: "user",
      content: `Com base no diagnóstico acima, agora RESOLVA o problema. 

Se for um problema de PROMPT ou BASE DE CONHECIMENTO de um agente:
- Gere o bloco json:apply-fix com a correção completa para que eu possa aplicar automaticamente com 1 clique.

Se for um problema de CÓDIGO:
- Gere o código corrigido COMPLETO em um bloco json:code-fix.

Se for ambos, gere os dois blocos.

IMPORTANTE: Sempre inclua os blocos de correção para que eu possa aplicar automaticamente!`
    };

    const newMessages = [...contextMessages, resolvePrompt];
    setMessages(newMessages);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      await streamFromAPI(apiMessages, (text) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
          }
          return [...prev, { role: "assistant", content: text }];
        });
      });
    } catch (error: any) {
      console.error("Erro:", error);
      setMessages(prev => [...prev, { role: "assistant", content: `❌ **Erro ao gerar correção:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // === Copy code block ===
  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setImages([]);
    setAppliedFixes(new Set());
  };

  const getMessageText = (content: string | any[]): string => {
    if (typeof content === "string") return content;
    const textPart = content.find((c: any) => c.type === "text");
    return textPart?.text || "";
  };

  const getMessageImages = (content: string | any[]): string[] => {
    if (typeof content === "string") return [];
    return content
      .filter((c: any) => c.type === "image_url")
      .map((c: any) => c.image_url?.url)
      .filter(Boolean);
  };

  const isDiagnosisMessage = (content: string | any[]): boolean => {
    const text = getMessageText(content);
    const hasFixBlock = text.includes("json:apply-fix") || text.includes("json:code-fix");
    const hasDiagnosticContent = text.includes("❌") || text.includes("⚠️") || text.includes("ℹ️") || 
      text.includes("Erro") || text.includes("problema") || text.includes("Sugestão") ||
      text.includes("Verificar") || text.includes("diagnóstico") || text.length > 100;
    return hasDiagnosticContent && !hasFixBlock;
  };

  const extractCodeBlocks = (text: string): string[] => {
    const regex = /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  };

  const quickActions = [
    { label: "Diagnosticar agentes", icon: Bug, prompt: "Faça um diagnóstico completo de todos os agentes IA ativos. Verifique se os prompts estão bem estruturados, se a base de conhecimento está preenchida, e se as configurações estão corretas. Se encontrar problemas, gere os blocos json:apply-fix para correção automática." },
    { label: "Verificar fluxos", icon: Cpu, prompt: "Analise os fluxos ativos e verifique se estão configurados corretamente. Procure por problemas comuns como nós desconectados, fluxos sem bloco de início, ou configurações faltantes." },
    { label: "Status conexões", icon: AlertTriangle, prompt: "Verifique o status de todas as conexões WhatsApp. Identifique conexões desconectadas, com problemas ou inativas." },
    { label: "Dicas de melhoria", icon: Lightbulb, prompt: "Com base nos dados atuais do sistema, sugira melhorias que poderiam ser feitas nos prompts dos agentes, nos fluxos e nas configurações gerais. Gere blocos json:apply-fix para as correções de prompt sugeridas." },
  ];

  // === Render fix action cards ===
  const renderFixCards = (fixBlocks: FixBlock[], messageIndex: number) => {
    if (fixBlocks.length === 0) return null;
    
    return (
      <div className="ml-11 mt-3 space-y-3">
        {fixBlocks.map((fix, i) => {
          if (fix.type === "agent-fix") {
            const agentFix = fix as AgentFix;
            const fixKey = `agent-${agentFix.agentId}`;
            const isApplying = applyingFix === fixKey;
            const isApplied = appliedFixes.has(fixKey);
            
            return (
              <div key={`fix-${messageIndex}-${i}`} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">Correção de Agente: {agentFix.agentName}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {agentFix.fixes.map((f, fi) => (
                    <p key={fi} className="text-xs text-slate-400">
                      • <span className="text-slate-300">{f.field}</span>: {f.description}
                    </p>
                  ))}
                </div>
                {isApplied ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Correção aplicada com sucesso!
                  </div>
                ) : (
                  <Button
                    onClick={() => applyAgentFix(agentFix)}
                    disabled={isApplying}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-orange-500/20"
                    size="sm"
                  >
                    {isApplying ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Aplicando...</>
                    ) : (
                      <><Wrench className="h-4 w-4 mr-2" /> Aplicar Correção</>
                    )}
                  </Button>
                )}
              </div>
            );
          }
          
          if (fix.type === "code-fix") {
            const codeFix = fix as CodeFix;
            const copyKey = `code-${messageIndex}-${i}`;
            const isCopied = copiedIndex === messageIndex * 1000 + i;
            
            return (
              <div key={`fix-${messageIndex}-${i}`} className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Correção de Código</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">📁 {codeFix.file}</p>
                <p className="text-xs text-slate-400 mb-3">{codeFix.description}</p>
                <Button
                  onClick={() => {
                    handleCopyCode(codeFix.code, messageIndex * 1000 + i);
                    toast.success("Código copiado! Cole no editor para aplicar.");
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  {isCopied ? (
                    <><Check className="h-4 w-4 mr-2 text-emerald-400" /> Copiado!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copiar Código Corrigido</>
                  )}
                </Button>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Code2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Programador IA</h1>
            <p className="text-sm text-slate-400">GPT-4o • Diagnóstico & correção automática</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Selecione empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
            OpenAI GPT-4o
          </Badge>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearChat}
              className="text-slate-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-3">Ações rápidas:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  const fakeInput = action.prompt;
                  setInput("");
                  const userMessage: Message = { role: "user", content: fakeInput };
                  setMessages([userMessage]);
                  setIsLoading(true);
                  (async () => {
                    try {
                      await streamFromAPI(
                        [{ role: "user", content: fakeInput }],
                        (text) => {
                          setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
                            return [...prev, { role: "assistant", content: text }];
                          });
                        }
                      );
                    } catch (error: any) {
                      setMessages(prev => [...prev, { role: "assistant", content: `❌ **Erro:** ${error.message}` }]);
                    } finally {
                      setIsLoading(false);
                    }
                  })();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
              >
                <action.icon className="h-5 w-5 text-violet-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Code2 className="h-16 w-16 text-violet-500/30 mb-4" />
            <h2 className="text-lg font-medium text-slate-400 mb-2">Programador IA</h2>
            <p className="text-sm text-slate-500 max-w-md">
              Envie screenshots de erros, descreva problemas ou peça diagnósticos. 
              Eu analiso, identifico o problema e posso aplicar correções automaticamente.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              💡 Dica: Cole imagens direto com Ctrl+V • Correções de prompt são aplicadas com 1 clique
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const messageText = getMessageText(msg.content);
          const codeBlocks = msg.role === "assistant" ? extractCodeBlocks(messageText) : [];
          const fixBlocks = msg.role === "assistant" ? parseFixBlocks(messageText) : [];
          const displayText = msg.role === "assistant" ? cleanMessageText(messageText) : messageText;
          const showResolveButton = msg.role === "assistant" && !isLoading && isDiagnosisMessage(msg.content) && index === messages.length - 1;
          
          return (
            <div key={index}>
              <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  msg.role === "user" 
                    ? "bg-emerald-500/20 border border-emerald-500/20" 
                    : "bg-white/5 border border-white/10"
                }`}>
                  {/* Images */}
                  {getMessageImages(msg.content).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {getMessageImages(msg.content).map((img, i) => (
                        <img 
                          key={i} 
                          src={img} 
                          alt="Upload" 
                          className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-80"
                          onClick={() => window.open(img, "_blank")}
                        />
                      ))}
                    </div>
                  )}
                  {/* Text */}
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          code({ node, className, children, ...props }) {
                            const isInline = !className;
                            if (isInline) {
                              return <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300" {...props}>{children}</code>;
                            }
                            const codeText = String(children).replace(/\n$/, '');
                            const blockIndex = codeBlocks.indexOf(codeText);
                            return (
                              <div className="relative group my-3">
                                <div className="absolute top-2 right-2 z-10">
                                  <button
                                    onClick={() => handleCopyCode(codeText, index * 100 + (blockIndex >= 0 ? blockIndex : 0))}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-slate-300 transition-colors"
                                  >
                                    {copiedIndex === index * 100 + (blockIndex >= 0 ? blockIndex : 0) ? (
                                      <><Check className="h-3 w-3 text-emerald-400" /> Copiado!</>
                                    ) : (
                                      <><Copy className="h-3 w-3" /> Copiar</>
                                    )}
                                  </button>
                                </div>
                                <pre className="bg-black/40 rounded-lg p-4 overflow-x-auto border border-white/5">
                                  <code className={className} {...props}>{children}</code>
                                </pre>
                              </div>
                            );
                          }
                        }}
                      >
                        {displayText}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-white whitespace-pre-wrap">{getMessageText(msg.content)}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Fix Action Cards */}
              {fixBlocks.length > 0 && renderFixCards(fixBlocks, index)}

              {/* Resolve Problem Button */}
              {showResolveButton && (
                <div className="ml-11 mt-2">
                  <Button
                    onClick={() => handleResolveProblem(index)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-orange-500/20"
                    size="sm"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    🔧 Resolver Problema
                  </Button>
                  <p className="text-xs text-slate-500 mt-1 ml-1">
                    O IA vai gerar correções que você pode aplicar com 1 clique
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-400">Analisando...</p>
            </div>
          </div>
        )}
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-white/5">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-violet-400 flex-shrink-0"
          disabled={isLoading}
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Descreva o problema, cole uma imagem (Ctrl+V) ou peça um diagnóstico..."
          className="min-h-[44px] max-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
          rows={1}
          disabled={isLoading}
        />
        <Button
          onClick={sendMessage}
          disabled={isLoading || (!input.trim() && images.length === 0)}
          className="bg-violet-600 hover:bg-violet-700 flex-shrink-0"
          size="icon"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
