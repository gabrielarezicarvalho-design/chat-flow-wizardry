import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Wand2, BookOpen, Lightbulb, Loader2, Copy, Check, ChevronDown, ChevronUp, Send, Image, Mic, Square, Volume2, VolumeX, X, UserCog, CheckCircle, FileText, Zap } from "lucide-react";
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

interface ImprovementSuggestion {
  destination: "prompt" | "conhecimento";
  content: string;
  explanation: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  isAudio?: boolean;
  improvement?: ImprovementSuggestion;
  improvementApplied?: boolean;
}

function parseImprovement(text: string): { cleanText: string; improvement?: ImprovementSuggestion } {
  const improvementRegex = /---MELHORIA---\s*\nDESTINO:\s*(prompt|conhecimento)\s*\nCONTEÚDO:\s*\n```\n?([\s\S]*?)\n?```\s*\nEXPLICAÇÃO:\s*([\s\S]*?)\n---FIM-MELHORIA---/i;
  const match = text.match(improvementRegex);

  if (match) {
    const cleanText = text.replace(improvementRegex, "").trim();
    return {
      cleanText,
      improvement: {
        destination: match[1].toLowerCase().trim() as "prompt" | "conhecimento",
        content: match[2].trim(),
        explanation: match[3].trim(),
      },
    };
  }

  return { cleanText: text };
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

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Media state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Audio playback
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
      toast.error(err.message || "Erro ao analisar com IA");
    } finally {
      setLoading(false);
    }
  };

  // --- Image ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Audio Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleAudioMessage(audioBlob);
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

  // --- Transcribe audio and send ---
  const handleAudioMessage = async (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    setChatMessages(prev => [...prev, { role: "user", content: "🎤 Mensagem de áudio", audioUrl, isAudio: true }]);
    setLoading(true);

    try {
      // Convert to base64 for transcription
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe the audio
      let transcribedText = "";
      try {
        const { data: transcribeData } = await supabase.functions.invoke("elevenlabs-transcribe", {
          body: { audioBase64: base64 },
        });
        transcribedText = transcribeData?.text || "";
      } catch {
        console.warn("Transcrição falhou, usando mensagem genérica");
      }

      if (!transcribedText) {
        transcribedText = "[áudio não transcrito]";
      }

      // Update the user message with transcription
      setChatMessages(prev => {
        const updated = [...prev];
        const lastUserIdx = updated.length - 1;
        if (updated[lastUserIdx]?.role === "user") {
          updated[lastUserIdx] = { ...updated[lastUserIdx], content: `🎤 "${transcribedText}"` };
        }
        return updated;
      });

      // Send to AI
      const aiResponse = await sendToAI(transcribedText);
      
      // Generate TTS for the response
      let responseAudioUrl: string | undefined;
      try {
        const { data: ttsData } = await supabase.functions.invoke("elevenlabs-tts", {
          body: { text: aiResponse.cleanText },
        });
        if (ttsData?.success && ttsData?.audioContent) {
          const audioDataUrl = `data:audio/mpeg;base64,${ttsData.audioContent}`;
          responseAudioUrl = audioDataUrl;
        }
      } catch {
        console.warn("TTS não disponível");
      }

      setChatMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse.cleanText,
          audioUrl: responseAudioUrl,
          improvement: aiResponse.improvement,
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar áudio");
      setChatMessages(prev => [...prev, { role: "assistant", content: "❌ Erro ao processar o áudio." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Core AI call ---
  const sendToAI = async (message: string): Promise<{ cleanText: string; improvement?: ImprovementSuggestion }> => {
    const { data, error } = await supabase.functions.invoke("improve-agent-prompt", {
      body: {
        systemPrompt,
        knowledgeText,
        agentName,
        mode: "diagnostic_chat",
        testMessage: message,
        chatHistory: chatMessages
          .filter(m => !m.isAudio || m.content !== "🎤 Mensagem de áudio")
          .map(m => ({ role: m.role, content: m.content })),
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return parseImprovement(data.result || "");
  };

  // --- Send text message ---
  const sendMessage = async () => {
    if ((!chatInput.trim() && !selectedImage) || loading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [
      ...prev,
      { role: "user", content: userMsg || "📷 Imagem enviada", imageUrl: imagePreview || undefined },
    ]);
    clearImage();
    setLoading(true);

    try {
      const msgToSend = selectedImage
        ? `${userMsg || "Enviou uma imagem."}\n[O gerente anexou uma imagem.]`
        : userMsg;

      const aiResponse = await sendToAI(msgToSend);

      setChatMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse.cleanText,
          improvement: aiResponse.improvement,
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
      setChatMessages(prev => [...prev, { role: "assistant", content: "❌ Erro ao processar. Verifique suas chaves de IA." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Apply improvement ---
  const applyImprovement = (msgIndex: number, forceDestination?: "prompt" | "conhecimento") => {
    const msg = chatMessages[msgIndex];
    if (!msg?.improvement) return;

    const dest = forceDestination || msg.improvement.destination;
    const content = msg.improvement.content;

    if (dest === "prompt") {
      const newPrompt = systemPrompt ? `${systemPrompt}\n\n${content}` : content;
      onApplyPrompt(newPrompt);
      toast.success("✅ Melhoria aplicada ao Prompt!");
    } else {
      const newKnowledge = knowledgeText ? `${knowledgeText}\n\n${content}` : content;
      onApplyKnowledge(newKnowledge);
      toast.success("✅ Melhoria aplicada à Base de Conhecimento!");
    }

    setChatMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = { ...updated[msgIndex], improvementApplied: true };
      return updated;
    });
  };

  // --- Audio playback ---
  const playAudio = (url: string, idx: number) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioIdx(idx);
    audio.onended = () => setPlayingAudioIdx(null);
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingAudioIdx(null);
  };

  // --- Analysis helpers ---
  const extractCodeBlock = (tag: string): string | null => {
    if (!result) return null;
    const regex = new RegExp("```" + tag + "\\n([\\s\\S]*?)```", "i");
    const match = result.match(regex);
    return match ? match[1].trim() : null;
  };

  const handleApply = () => {
    if (activeMode === "improve_prompt") {
      const improved = extractCodeBlock("prompt");
      if (improved) { onApplyPrompt(improved); toast.success("Prompt atualizado!"); }
      else toast.error("Não foi possível extrair o prompt melhorado");
    } else if (activeMode === "improve_knowledge") {
      const improved = extractCodeBlock("knowledge");
      if (improved) { onApplyKnowledge(improved); toast.success("Base atualizada!"); }
      else toast.error("Não foi possível extrair a base melhorada");
    } else if (activeMode === "suggest_additions") {
      const faq = extractCodeBlock("faq");
      if (faq) { onApplyKnowledge((knowledgeText ? knowledgeText + "\n\n" : "") + faq); toast.success("FAQ adicionado!"); }
      else toast.error("Não foi possível extrair o FAQ");
    }
  };

  const handleCopy = () => {
    if (result) { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const canApply = result && (
    (activeMode === "improve_prompt" && extractCodeBlock("prompt")) ||
    (activeMode === "improve_knowledge" && extractCodeBlock("knowledge")) ||
    (activeMode === "suggest_additions" && extractCodeBlock("faq"))
  );

  const actions = [
    { mode: "improve_prompt" as Mode, icon: Wand2, label: "Melhorar Prompt", disabled: !systemPrompt?.trim() },
    { mode: "improve_knowledge" as Mode, icon: BookOpen, label: "Melhorar Base", disabled: !knowledgeText?.trim() },
    { mode: "suggest_additions" as Mode, icon: Lightbulb, label: "Sugerir Conteúdo", disabled: !systemPrompt?.trim() && !knowledgeText?.trim() },
    { mode: "diagnostic_chat" as Mode, icon: UserCog, label: "Conversar com Funcionário", disabled: !systemPrompt?.trim() },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div className="p-4">
        {/* Header */}
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

        {/* Action buttons */}
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

        {/* ========== EMPLOYEE CONVERSATION MODE ========== */}
        {activeMode === "diagnostic_chat" && expanded && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Converse com <strong>{agentName}</strong> como se fosse seu(a) gerente. Dê feedback, corrija erros, ensine novas respostas — ela aprende e sugere melhorias automaticamente.
            </p>

            {/* Chat area */}
            <div className="max-h-[500px] overflow-y-auto rounded-xl bg-background border shadow-inner p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <UserCog className="w-10 h-10 mx-auto text-muted-foreground/30" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Converse com {agentName}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 max-w-xs mx-auto">
                      Simule um cliente, dê advertências, ensine como responder, peça para melhorar em algo específico. As melhorias são aplicadas automaticamente.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                    {["Olá, quais os planos?", "Melhore sua saudação", "Quando perguntarem preço, responda assim..."].map(suggestion => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={() => { setChatInput(suggestion); }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className="space-y-2">
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
                        {msg.role === "user" ? "👔 Você (gerente)" : `🤖 ${agentName}`}
                      </p>

                      {/* Image */}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Imagem" className="rounded-lg mb-2 max-h-48 object-cover w-full" />
                      )}

                      {/* Audio player for user */}
                      {msg.isAudio && msg.audioUrl && (
                        <div className="mb-1.5">
                          <audio src={msg.audioUrl} controls className="h-8 w-full max-w-[220px]" />
                        </div>
                      )}

                      {/* Text */}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Audio play button for assistant */}
                      {msg.role === "assistant" && msg.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1.5 h-7 px-2 text-[11px] gap-1"
                          onClick={() => playingAudioIdx === i ? stopAudio() : playAudio(msg.audioUrl!, i)}
                        >
                          {playingAudioIdx === i ? (
                            <><VolumeX className="w-3.5 h-3.5" /> Parar áudio</>
                          ) : (
                            <><Volume2 className="w-3.5 h-3.5" /> Ouvir resposta</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Improvement suggestion card */}
                  {msg.improvement && (
                    <div className={`mx-auto max-w-[95%] rounded-xl border p-3 text-xs space-y-2 ${
                      msg.improvementApplied 
                        ? "border-emerald-500/30 bg-emerald-500/5" 
                        : "border-primary/30 bg-primary/5"
                    }`}>
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Sugestão de melhoria</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          msg.improvement.destination === "prompt" 
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}>
                          {msg.improvement.destination === "prompt" ? "📋 Prompt" : "📚 Conhecimento"}
                        </span>
                      </div>
                      
                      <div className="bg-background/80 rounded-lg p-2 border text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {msg.improvement.content}
                      </div>
                      
                      <p className="text-muted-foreground">{msg.improvement.explanation}</p>

                      {msg.improvementApplied ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Melhoria aplicada!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
                            onClick={() => applyImprovement(i)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Aplicar em {msg.improvement.destination === "prompt" ? "Prompt" : "Conhecimento"}
                          </Button>
                          {/* Offer to apply to the other destination */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => applyImprovement(i, msg.improvement!.destination === "prompt" ? "conhecimento" : "prompt")}
                          >
                            Aplicar em {msg.improvement.destination === "prompt" ? "Conhecimento" : "Prompt"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
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
                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={clearImage}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => fileInputRef.current?.click()} disabled={loading} title="Enviar imagem">
                <Image className="w-4 h-4" />
              </Button>
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
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Fale com sua funcionária..."
                disabled={loading || isRecording}
                className="text-sm"
              />
              <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={sendMessage} disabled={loading || (!chatInput.trim() && !selectedImage) || isRecording}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 text-xs text-destructive animate-pulse">
                <div className="w-2 h-2 bg-destructive rounded-full" />
                Gravando áudio... Clique no botão para parar e enviar.
              </div>
            )}
          </div>
        )}

        {/* ========== ANALYSIS MODES ========== */}
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
                {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
