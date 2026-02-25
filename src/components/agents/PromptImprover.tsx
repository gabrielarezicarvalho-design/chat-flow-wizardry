import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2, BookOpen, Lightbulb, Loader2, Copy, Check, ChevronDown, ChevronUp, MessageCircle, Send, AlertTriangle, Image, Mic, Square, Volume2, VolumeX, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromptImproverProps {
  systemPrompt: string;
  knowledgeText: string;
  agentName: string;
  agentId?: string | null;
  onApplyPrompt: (newPrompt: string) => void;
  onApplyKnowledge: (newKnowledge: string) => void;
}

type Mode = "improve_prompt" | "improve_knowledge" | "suggest_additions" | "diagnostic_chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  diagnosis?: string;
  imageUrl?: string;
  audioUrl?: string;
  isAudio?: boolean;
}

export const PromptImprover = ({
  systemPrompt,
  knowledgeText,
  agentName,
  agentId,
  onApplyPrompt,
  onApplyKnowledge,
}: PromptImproverProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(true);
  
  // Diagnostic chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Media state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Audio playback state
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Cleanup image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são suportadas");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendAudioMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Erro ao acessar o microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    setChatMessages(prev => [...prev, { role: "user", content: "🎤 Mensagem de áudio", audioUrl, isAudio: true }]);
    setLoading(true);

    try {
      // Convert audio to base64 to send to the API
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });
      const audioBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke("improve-agent-prompt", {
        body: {
          systemPrompt,
          knowledgeText,
          agentName,
          mode: "diagnostic_chat",
          testMessage: "[O cliente enviou um áudio. Transcrição simulada: O cliente está fazendo uma pergunta por áudio. Responda normalmente como se tivesse entendido a mensagem.]",
          chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fullResponse = data.result || "";
      const parts = fullResponse.split("---DIAGNÓSTICO---");
      const agentResponse = parts[0]?.trim() || fullResponse;
      const diagnosis = parts[1]?.trim() || null;

      // Generate TTS for the response
      let responseAudioUrl: string | undefined;
      try {
        const ttsResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: agentResponse, voiceId: "pFZP5JQG7iQjIQuC4Bku" }),
          }
        );
        if (ttsResponse.ok) {
          const audioBlob = await ttsResponse.blob();
          responseAudioUrl = URL.createObjectURL(audioBlob);
        }
      } catch (ttsErr) {
        console.warn("TTS não disponível:", ttsErr);
      }

      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: agentResponse, diagnosis: diagnosis || undefined, audioUrl: responseAudioUrl },
      ]);
    } catch (err: any) {
      console.error("Erro no chat diagnóstico:", err);
      toast.error(err.message || "Erro ao testar com IA");
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Erro ao processar. Verifique suas chaves de IA." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendDiagnosticMessage = async () => {
    if ((!chatInput.trim() && !selectedImage) || loading) return;

    const userMsg = chatInput.trim();
    const hasImage = !!selectedImage;
    let imageDataUrl: string | undefined;

    if (selectedImage) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedImage);
      });
      imageDataUrl = await base64Promise;
    }

    setChatInput("");
    setChatMessages(prev => [
      ...prev,
      { role: "user", content: userMsg || "📷 Imagem enviada", imageUrl: imagePreview || undefined },
    ]);
    
    clearImage();
    setLoading(true);

    try {
      const messageToSend = hasImage
        ? `${userMsg || "O cliente enviou uma imagem."}\n\n[O cliente anexou uma imagem. Responda considerando que pode haver conteúdo visual relevante.]`
        : userMsg;

      const { data, error } = await supabase.functions.invoke("improve-agent-prompt", {
        body: {
          systemPrompt,
          knowledgeText,
          agentName,
          mode: "diagnostic_chat",
          testMessage: messageToSend,
          chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
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

  const playAudio = (audioUrl: string, idx: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingAudioIdx(idx);
    audio.onended = () => setPlayingAudioIdx(null);
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudioIdx(null);
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Converse com o agente como se fosse um cliente real. Envie texto, imagem ou áudio.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-6 px-2"
                onClick={() => setShowDiagnosis(!showDiagnosis)}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {showDiagnosis ? "Ocultar diagnóstico" : "Mostrar diagnóstico"}
              </Button>
            </div>

            {/* Chat area */}
            <div className="max-h-[500px] overflow-y-auto rounded-xl bg-background border shadow-inner p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Envie uma mensagem para testar como <strong>{agentName}</strong> responderia.
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Ex: "Olá", "quais os planos?", "meu rastreador não funciona"
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className="space-y-1.5">
                  {/* Message bubble */}
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold mb-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-primary"}`}>
                        {msg.role === "user" ? "👤 Você (cliente)" : `🤖 ${agentName}`}
                      </p>
                      
                      {/* Image attachment */}
                      {msg.imageUrl && (
                        <img 
                          src={msg.imageUrl} 
                          alt="Imagem enviada" 
                          className="rounded-lg mb-2 max-h-48 object-cover w-full"
                        />
                      )}

                      {/* Audio message */}
                      {msg.isAudio && msg.audioUrl && (
                        <div className="mb-1">
                          <audio src={msg.audioUrl} controls className="h-8 w-full max-w-[200px]" />
                        </div>
                      )}

                      {/* Text content */}
                      {msg.content && !msg.isAudio && (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                      {msg.isAudio && msg.content !== "🎤 Mensagem de áudio" && (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}

                      {/* Audio playback button for assistant responses */}
                      {msg.role === "assistant" && msg.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-6 px-2 text-[10px]"
                          onClick={() => playingAudioIdx === i ? stopAudio() : playAudio(msg.audioUrl!, i)}
                        >
                          {playingAudioIdx === i ? (
                            <><VolumeX className="w-3 h-3 mr-1" /> Parar</>
                          ) : (
                            <><Volume2 className="w-3 h-3 mr-1" /> Ouvir</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* System diagnosis card */}
                  {showDiagnosis && msg.diagnosis && (
                    <div className="mx-auto max-w-[95%] rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Diagnóstico interno</span>
                      </div>
                      <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{msg.diagnosis}</p>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span>{agentName} está digitando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-16 rounded-lg border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                  onClick={clearImage}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-2">
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Enviar imagem"
              >
                <Image className="w-4 h-4" />
              </Button>

              {/* Audio recording */}
              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                className={`h-9 w-9 flex-shrink-0 ${isRecording ? "animate-pulse" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                title={isRecording ? "Parar gravação" : "Gravar áudio"}
              >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
              </Button>

              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendDiagnosticMessage()}
                placeholder="Digite como cliente..."
                disabled={loading || isRecording}
                className="text-sm"
              />
              <Button
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={sendDiagnosticMessage}
                disabled={loading || (!chatInput.trim() && !selectedImage) || isRecording}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 text-xs text-destructive animate-pulse">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                Gravando áudio... Clique no botão para parar.
              </div>
            )}
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
            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/30 p-4 text-sm whitespace-pre-wrap border leading-relaxed">
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
