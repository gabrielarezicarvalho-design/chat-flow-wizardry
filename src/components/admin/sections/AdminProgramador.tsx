import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { 
  Code2, Send, ImagePlus, Trash2, Bot, User, Loader2, 
  AlertTriangle, Bug, Lightbulb, Cpu, Paperclip, X, Building2
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string | any[];
}

interface Company {
  id: string;
  name: string;
}

export function AdminProgramador() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load companies
  useEffect(() => {
    const loadCompanies = async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("is_active", true);
      if (data) {
        setCompanies(data);
        // Default to first company with OpenAI key
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

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && images.length === 0) return;
    if (isLoading) return;

    // Build user message content
    let userContent: any;
    if (images.length > 0) {
      userContent = [];
      images.forEach(img => {
        userContent.push({
          type: "image_url",
          image_url: { url: img, detail: "high" }
        });
      });
      if (trimmedInput) {
        userContent.push({ type: "text", text: trimmedInput });
      } else {
        userContent.push({ type: "text", text: "Analise esta imagem e identifique o problema." });
      }
    } else {
      userContent = trimmedInput;
    }

    const userMessage: Message = { role: "user", content: userContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setImages([]);
    setIsLoading(true);

    // Build messages for API (include history)
    const apiMessages = newMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
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

      // Stream response
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
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantText } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantText }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantText } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantText }];
              });
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error: any) {
      console.error("Erro:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ **Erro:** ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
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

  const quickActions = [
    { label: "Diagnosticar agentes", icon: Bug, prompt: "Faça um diagnóstico completo de todos os agentes IA ativos. Verifique se os prompts estão bem estruturados, se a base de conhecimento está preenchida, e se as configurações estão corretas." },
    { label: "Verificar fluxos", icon: Cpu, prompt: "Analise os fluxos ativos e verifique se estão configurados corretamente. Procure por problemas comuns como nós desconectados, fluxos sem bloco de início, ou configurações faltantes." },
    { label: "Status conexões", icon: AlertTriangle, prompt: "Verifique o status de todas as conexões WhatsApp. Identifique conexões desconectadas, com problemas ou inativas." },
    { label: "Dicas de melhoria", icon: Lightbulb, prompt: "Com base nos dados atuais do sistema, sugira melhorias que poderiam ser feitas nos prompts dos agentes, nos fluxos e nas configurações gerais." },
  ];

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
            <p className="text-sm text-slate-400">GPT-4o • Diagnóstico de sistema & prompts</p>
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
                  // Set input and trigger send directly
                  const fakeInput = action.prompt;
                  setInput("");
                  // Send directly with prompt
                  const userMessage: Message = { role: "user", content: fakeInput };
                  setMessages([userMessage]);
                  setIsLoading(true);
                  (async () => {
                    try {
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
                          body: JSON.stringify({ messages: [{ role: "user", content: fakeInput }], action: "chat", companyId: selectedCompanyId }),
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
                        let ni: number;
                        while ((ni = buffer.indexOf("\n")) !== -1) {
                          let line = buffer.slice(0, ni);
                          buffer = buffer.slice(ni + 1);
                          if (line.endsWith("\r")) line = line.slice(0, -1);
                          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
                          const js = line.slice(6).trim();
                          if (js === "[DONE]") break;
                          try {
                            const p = JSON.parse(js);
                            const c = p.choices?.[0]?.delta?.content;
                            if (c) {
                              assistantText += c;
                              setMessages(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                                return [...prev, { role: "assistant", content: assistantText }];
                              });
                            }
                          } catch { buffer = line + "\n" + buffer; break; }
                        }
                      }
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
              Eu analiso se o problema é no prompt, no código ou na configuração.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              💡 Dica: Cole imagens direto com Ctrl+V
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  <ReactMarkdown>{getMessageText(msg.content)}</ReactMarkdown>
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
        ))}

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
