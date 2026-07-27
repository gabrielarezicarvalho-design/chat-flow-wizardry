import { Link } from "react-router-dom";
import logoAurora from "@/assets/logo-aurora.png.asset.json";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Bot, CreditCard, Mic, Users, TrendingUp,
  Zap, Check, Star, ArrowRight, Search, MapPin, Sparkles,
  BellRing, ShieldCheck, PlayCircle, Building2, Store, Stethoscope, PhoneCall,
  GraduationCap, Scissors, Utensils, Plus, Smile, Send, Paperclip, Image as ImageIcon, X, Square,
  Filter, Target, Calendar, Play, Clock, Bell,
  Instagram, FileText, UsersRound, Headphones, Volume2, Repeat, Wallet, Receipt, AlertCircle, Megaphone, MessageSquare, ListChecks, Ban,
  Scale, Activity, Sun, Wrench
} from "lucide-react";

type LeadItem = { name: string; phone: string; origin: string };

const EMOJIS = ["😀","😂","😍","🥳","🚀","🔥","👍","🙏","💜","✨","✅","💡","📞","📎","🎉","💬","🤖","💰","📈","🎯"];

const stats = [
  { value: "+2.1M", label: "Mensagens enviadas" },
  { value: "+8.000", label: "Empresas conectadas" },
  { value: "+450k", label: "Leads captados" },
  { value: "24/7", label: "IA em operação" },
];

const segments = [
  { icon: Building2, label: "Imobiliária" },
  { icon: Stethoscope, label: "Dentista" },
  { icon: Scale, label: "Advogado" },
  { icon: Activity, label: "Clínica" },
  { icon: Scissors, label: "Estética" },
  { icon: Sun, label: "Energia Solar" },
  { icon: Store, label: "Loja" },
  { icon: Wrench, label: "Oficina" },
  { icon: Utensils, label: "Restaurante" },
];

declare global {
  interface Window {
    initLandingMap?: () => void;
  }
}

export default function Landing() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [searchQuery, setSearchQuery] = useState("dentistas em São Paulo");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [userMessages, setUserMessages] = useState<Array<{ id: string; kind: "text" | "audio" | "file"; content: string; fileName?: string; previewUrl?: string; duration?: number; audioUrl?: string }>>([]);
  const [interacted, setInteracted] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [savedLeads, setSavedLeads] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const chatMessages = [
    { id: 1, sender: "client", content: "Vi sua mensagem, do que se trata?", delay: 0 },
    { id: 2, sender: "ai", content: "Oi! Achei sua clínica no Google Maps e queria te apresentar uma IA que prospecta e atende no WhatsApp por você 🚀", delay: 1400, typingDelay: 400 },
    { id: 3, sender: "client", content: "Interessante, como funciona?", delay: 3200 },
    { id: 4, sender: "ai", content: "Posso te mostrar em 5 min numa demo? Amanhã 14h tá bom?", delay: 4600, typingDelay: 500 },
    { id: 5, sender: "status", content: "✦ respondeu em 2s", delay: 6400 },
  ];

  useEffect(() => {
    if (interacted) return;
    let timers: number[] = [];

    const clearTimers = () => {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    };

    const reset = () => {
      clearTimers();
      setVisibleCount(0);
      setShowTyping(false);
      runSequence();
    };

    const runSequence = () => {
      chatMessages.forEach((msg) => {
        if (msg.typingDelay !== undefined) {
          timers.push(window.setTimeout(() => setShowTyping(true), msg.delay - msg.typingDelay));
        }
        timers.push(window.setTimeout(() => {
          setShowTyping(false);
          setVisibleCount((c) => c + 1);
        }, msg.delay));
      });
      timers.push(window.setTimeout(reset, 9000));
    };

    runSequence();
    return () => clearTimers();
  }, [interacted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, userMessages, showTyping]);

  useEffect(() => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key || !mapRef.current) return;

    const initMap = () => {
      const mapDiv = mapRef.current;
      if (!mapDiv) return;
      const g = (window as any).google;
      const map = new g.maps.Map(mapDiv, {
        center: { lat: -23.55052, lng: -46.633308 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        draggable: true,
        scrollwheel: true,
        gestureHandling: "greedy",
        disableDoubleClickZoom: false,
        zoomControl: true,
      });
      mapInstanceRef.current = map;
      const places = [
        { lat: -23.548, lng: -46.636, title: "Padaria do João" },
        { lat: -23.553, lng: -46.628, title: "Clínica Bem Estar" },
        { lat: -23.545, lng: -46.642, title: "Studio de Beleza" },
        { lat: -23.558, lng: -46.62, title: "Auto Escola Rápida" },
        { lat: -23.552, lng: -46.638, title: "Restaurante Sabor" },
      ];
      places.forEach((p) => new g.maps.Marker({ position: p, map, title: p.title }));
      setMapLoaded(true);
    };

    if ((window as any).google?.maps) {
      initMap();
      return;
    }

    (window as any).initLandingMap = initMap;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initLandingMap&channel=${channel}`;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  const stopDemo = () => {
    if (!interacted) {
      setInteracted(true);
      setVisibleCount(chatMessages.length);
      setShowTyping(false);
    }
  };

  const simulateAIReply = (text: string) => {
    setShowTyping(true);
    window.setTimeout(() => {
      setShowTyping(false);
      setUserMessages((prev) => [...prev, { id: `ai-${Date.now()}`, kind: "text", content: text }]);
    }, 1200);
  };

  const callAurora = async (payload: { message?: string; audio?: string; audioMime?: string }): Promise<{ text: string; audio?: string | null; transcript?: string | null } | null> => {
    const hasMessage = !!payload.message && payload.message.trim().length > 0;
    const hasAudio = !!payload.audio && payload.audio.length > 0;
    if (!hasMessage && !hasAudio) return null;
    try {
      const { data, error } = await supabase.functions.invoke("landing-aurora-chat", {
        body: { ...payload, history: conversationRef.current.slice(-10) },
      });
      if (error) throw error;
      return data as any;
    } catch (e) {
      console.error("Aurora error:", e);
      return null;
    }
  };

  const sendText = async () => {
    const v = inputValue.trim();
    if (!v) return;
    stopDemo();
    setUserMessages((prev) => [...prev, { id: `u-${Date.now()}`, kind: "text", content: v }]);
    conversationRef.current.push({ role: "user", content: v });
    setInputValue("");
    setShowEmoji(false);
    setShowTyping(true);
    const res = await callAurora({ message: v });
    setShowTyping(false);
    const replyText = res?.text || "Desculpe, tive um problema pra responder agora 🙈";
    conversationRef.current.push({ role: "assistant", content: replyText });
    setUserMessages((prev) => [...prev, { id: `ai-${Date.now()}`, kind: "text", content: replyText }]);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopDemo();
    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    setUserMessages((prev) => [...prev, {
      id: `f-${Date.now()}`,
      kind: "file",
      content: isImage ? "image" : "file",
      fileName: file.name,
      previewUrl,
    }]);
    e.target.value = "";
    simulateAIReply(isImage ? "Recebi sua imagem! 📎 Já anotei aqui." : "Arquivo recebido, obrigado! 📎");
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const getAudioDuration = async (blob: Blob): Promise<number> => {
    try {
      const audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const duration = decoded.duration;
      await audioContext.close();
      if (Number.isFinite(duration) && duration > 0) return duration;
    } catch (error) {
      console.warn("Não foi possível decodificar a duração do áudio:", error);
    }

    // ElevenLabs retorna MP3 a 128 kbps; o tamanho fornece uma duração confiável
    // quando o navegador não disponibiliza os metadados do arquivo.
    return Math.max(1, (blob.size * 8) / 128_000);
  };

  const startRecording = async () => {
    stopDemo();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length === 0) return;
        const duration = recordSeconds || 1;
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const audioUrl = URL.createObjectURL(blob);
        setUserMessages((prev) => [...prev, { id: `a-${Date.now()}`, kind: "audio", content: "audio", duration, audioUrl }]);
        setShowTyping(true);
        const base64 = await blobToBase64(blob);
        const res = await callAurora({ audio: base64, audioMime: mime });
        setShowTyping(false);
        if (res?.transcript) conversationRef.current.push({ role: "user", content: res.transcript });
        const replyText = res?.text || "Não consegui escutar direito, pode repetir? 🙏";
        conversationRef.current.push({ role: "assistant", content: replyText });
        if (res?.audio) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(res.audio), (c) => c.charCodeAt(0))],
            { type: "audio/mpeg" },
          );
          const replyUrl = URL.createObjectURL(audioBlob);
          const replyAudio = new Audio(replyUrl);
          const msgId = `ai-a-${Date.now()}`;
          const duration = await getAudioDuration(audioBlob);
          setUserMessages((prev) => [...prev, {
            id: msgId,
            kind: "audio",
            content: replyText,
            duration: Math.max(1, Math.ceil(duration)),
            audioUrl: replyUrl,
          }]);
          replyAudio.play().catch(() => {});
        } else {
          setUserMessages((prev) => [...prev, { id: `ai-${Date.now()}`, kind: "text", content: replyText }]);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error("Mic error:", e);
      alert("Não consegui acessar o microfone. Autoriza o acesso no navegador 🎙️");
    }
  };

  const stopRecording = (send = true) => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    setIsRecording(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      if (!send) recorder.ondataavailable = null as any;
      recorder.stop();
    }
    if (!send) {
      setRecordSeconds(0);
      audioChunksRef.current = [];
    }
  };

  const toggleRecording = () => {
    if (!isRecording) startRecording();
    else stopRecording(true);
  };

  const insertEmoji = (emoji: string) => {
    setInputValue((v) => v + emoji);
  };


  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold text-lg font-space-grotesk">
            <img
              src={logoAurora.url}
              alt="NEXT PRO"
              className="h-8 w-8 rounded-full object-cover"
            />
            NEXT <span className="text-[#004DFF]">PRO</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex items-center gap-8 text-sm text-slate-600">
              <a href="#recursos" className="hover:text-slate-900">Recursos</a>
              <a href="#ia" className="hover:text-slate-900">IA</a>
              <a href="#pagamentos" className="hover:text-slate-900">Pagamentos</a>
              <a href="#segmentos" className="hover:text-slate-900">Segmentos</a>
              <a href="#depoimentos" className="hover:text-slate-900">Clientes</a>
            </nav>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary-dark rounded-full px-5">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-white to-white">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Prospecção · Atendimento · Cobrança
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Encontra clientes.
              <br />
              <span className="text-[#004DFF]">
                Vende sozinho.
              </span>
              <br />
              No seu WhatsApp.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600 md:mx-0 mx-auto">
              Uma plataforma completa que prospecta, atende, vende e cobra automaticamente pelo WhatsApp — com IA treinada pro seu negócio.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center md:justify-start justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-primary hover:bg-primary-dark rounded-full px-8 h-12">
                  Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-12 border-slate-300">
                <PlayCircle className="mr-2 h-4 w-4" /> Ver demonstração
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg md:mx-0 mx-auto">
              {stats.slice(0, 3).map((s) => (
                <div key={s.label} className="text-center md:text-left">
                  <div className="text-2xl md:text-3xl font-bold text-[#004DFF]">
                    {s.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 to-primary/10 blur-3xl opacity-60 rounded-full" />
            <div className="relative rounded-3xl bg-white shadow-2xl p-6 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Aurora AI</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <span>digitando</span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                </div>
                <PhoneCall className="h-4 w-4 text-slate-400" />
              </div>

              <div ref={scrollRef} className="mt-6 h-[260px] space-y-3 overflow-y-auto flex flex-col">
                <div className="mt-auto space-y-3">
                {chatMessages.slice(0, visibleCount).map((msg, idx) => {
                  if (msg.sender === "status") {
                    return (
                      <div
                        key={msg.id}
                        className="text-[11px] text-primary flex items-center gap-1 animate-fade-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {msg.content}
                      </div>
                    );
                  }
                  if (msg.sender === "client") {
                    return (
                      <div
                        key={msg.id}
                        className="max-w-[75%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700 animate-fade-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {msg.content}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-sm text-white shadow-md animate-fade-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="text-[11px] font-semibold opacity-90 mb-1">✦ Aurora AI</div>
                      {msg.content}
                    </div>
                  );
                })}

                {userMessages.map((m) => {
                  const isAI = m.id.startsWith("ai-");
                  if (m.kind === "text") {
                    return isAI ? (
                      <div key={m.id} className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-sm text-white shadow-md animate-fade-in">
                        <div className="text-[11px] font-semibold opacity-90 mb-1">✦ Aurora AI</div>
                        {m.content}
                      </div>
                    ) : (
                      <div key={m.id} className="max-w-[75%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700 animate-fade-in">
                        {m.content}
                      </div>
                    );
                  }
                  if (m.kind === "file") {
                    return (
                      <div key={m.id} className="max-w-[75%] rounded-2xl bg-slate-100 p-2 text-sm text-slate-700 animate-fade-in">
                        {m.previewUrl ? (
                          <img src={m.previewUrl} alt={m.fileName} className="rounded-lg max-h-32 object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-1">
                            <Paperclip className="h-4 w-4 text-slate-500" />
                            <span className="truncate max-w-[160px]">{m.fileName}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  // audio
                  const dur = Math.max(1, Math.round(m.duration ?? 1));
                  const durationLabel = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}`;
                  return (
                    <div key={m.id} className={`${isAI ? "ml-auto bg-primary text-white" : "bg-slate-100 text-slate-700"} max-w-[75%] rounded-2xl px-3 py-2 text-sm flex items-center gap-2 animate-fade-in`}>
                      <button
                        type="button"
                        onClick={() => { if (m.audioUrl) new Audio(m.audioUrl).play().catch(() => {}); }}
                        className={`h-7 w-7 flex items-center justify-center rounded-full ${isAI ? "bg-white text-primary" : "bg-primary text-white"}`}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </button>
                      <div className="flex items-end gap-0.5 h-5">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <span key={i} className={`w-0.5 rounded-full ${isAI ? "bg-white/70" : "bg-primary/60"}`} style={{ height: `${20 + (i * 37) % 80}%` }} />
                        ))}
                      </div>
                      <span className={`text-[11px] ${isAI ? "text-white/80" : "text-slate-500"}`}>{durationLabel}</span>
                    </div>
                  );
                })}

                {showTyping && (
                  <div className="max-w-[55%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 animate-fade-in">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                </div>
              </div>

              {showEmoji && (
                <div className="mt-3 grid grid-cols-10 gap-1 rounded-2xl bg-slate-50 border border-slate-200 p-2 animate-fade-in">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-200 text-base"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              {isRecording ? (
                <div className="mt-6 flex items-center gap-3 rounded-full bg-red-50 px-3 py-2 text-red-600 border border-red-200">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="flex-1 text-sm font-medium">Gravando… 0:{String(recordSeconds).padStart(2, "0")}</span>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-100"
                    aria-label="Cancelar gravação"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                    aria-label="Parar e enviar"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-500">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,audio/*,video/*"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
                    aria-label="Anexar arquivo"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 ${showEmoji ? "text-primary" : ""}`}
                    aria-label="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
                    onFocus={stopDemo}
                    placeholder="Digite uma mensagem"
                    className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none min-w-0"
                  />
                  {inputValue.trim() ? (
                    <button
                      type="button"
                      onClick={sendText}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark"
                      aria-label="Enviar"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
                      aria-label="Gravar áudio"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Cities strip */}
        <div className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-2">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Usado por times no</span>
            {["Rio de Janeiro", "São Paulo", "Distrito Federal", "Mato Grosso", "Santa Catarina", "Rio Grande do Sul"].map((c) => (
              <span key={c} className="text-sm text-slate-600">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROSPECÇÃO */}
      <section id="recursos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Prospecção automática</span>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Encontre clientes{" "}
            <span className="text-[#004DFF]">automaticamente.</span>
          </h2>
          <p className="mt-5 text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Pesquisa no Google Maps, extrai contatos e dispara o primeiro "oi" no WhatsApp.
            O sistema acha clientes enquanto você dorme.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {/* Card do mapa estilo macOS */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="flex gap-1.5 group">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57] animate-pulse shadow-[0_0_6px_#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e] animate-pulse delay-75 shadow-[0_0_6px_#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840] animate-pulse delay-150 shadow-[0_0_6px_#28c840]" />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const g = (window as any).google;
                  if (g?.maps && mapInstanceRef.current && searchQuery.trim()) {
                    new g.maps.Geocoder().geocode({ address: searchQuery }, (results: any, status: string) => {
                      if (status === "OK" && results?.[0]) {
                        mapInstanceRef.current.setCenter(results[0].geometry.location);
                        mapInstanceRef.current.setZoom(13);
                      }
                    });
                  }
                }}
                className="flex-1 flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-500 cursor-text hover:border-slate-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar no Google Maps..."
                  className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
              </form>
            </div>
            <div className="p-3 grid grid-cols-[1fr_180px] gap-3">
              <div className="relative h-80 bg-slate-100 rounded-xl overflow-hidden">
                <div ref={mapRef} className="absolute inset-0" />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {([
                  { name: "Clínica Sorriso+", phone: "(11) 9 9876-***", origin: "Google Maps" },
                  { name: "OdontoCenter Jardins", phone: "(11) 9 4421-***", origin: "Google Maps" },
                  { name: "Dr. Renato Dental", phone: "(11) 9 7766-***", origin: "Google Maps" },
                  { name: "Odonto Vila Mariana", phone: "(11) 9 3312-***", origin: "Google Maps" },
                  { name: "Sorriso Perfeito SP", phone: "(11) 9 8821-***", origin: "Google Maps" },
                  { name: "Implantes Paulista", phone: "(11) 9 5540-***", origin: "Google Maps" },
                ] as LeadItem[]).map((lead) => (
                  <button
                    type="button"
                    key={lead.name}
                    onClick={() => setSelectedLead(lead)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-primary/40 hover:shadow-sm transition"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 truncate leading-tight">{lead.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{lead.phone}</div>
                    </div>
                    <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">novo</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fluxo automatizado */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-5">
              Fluxo automatizado
            </div>
            <div className="space-y-3">
              {[
                { icon: Search, title: "Buscar no Maps", desc: "Nicho + cidade" },
                { icon: Filter, title: "Limpar lista", desc: "Remove duplicados/inválidos" },
                { icon: Send, title: "Primeira mensagem", desc: "Ritmo humano no WhatsApp" },
                { icon: Bot, title: "IA conduz a conversa", desc: "Responde, qualifica, agenda" },
              ].map((step) => (
                <div key={step.title} className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-slate-50 transition">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{step.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{step.desc}</div>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quatro cards de recursos */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MapPin, title: "Google Maps", desc: "Extração por nicho + cidade" },
            { icon: Filter, title: "Filtros inteligentes", desc: "Tira duplicados e inválidos" },
            { icon: Send, title: "Disparo no WhatsApp", desc: "Ritmo humano, anti-bloqueio" },
            { icon: Bot, title: "IA assume a conversa", desc: "Responde, agenda, recupera" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-primary/40 hover:shadow-sm transition">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold text-slate-900 text-sm">{f.title}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>


      {/* IA */}
      <section id="ia" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Tudo que você precisa</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold text-slate-900">
              Uma IA que{" "}
              <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                vende sozinha
              </span>
              .
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
              Do primeiro "oi" até o fechamento. Tudo automático, tudo natural.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {/* Chat bento — 2 cols wide, 2 rows tall */}
            <div className="md:col-span-2 md:row-span-2 rounded-2xl bg-white p-6 border border-slate-200">
              <MessageCircle className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Atende como um humano</div>
              <div className="text-sm text-slate-500 mt-1">
                Responde texto e áudio, entende contexto, lembra do cliente. Conversa de verdade.
              </div>

              <div className="mt-8 space-y-3">
                <div className="max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                  Oi, vi o anúncio. Tem disponível?
                </div>
                <div className="ml-auto max-w-[75%] rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-sm text-white">
                  <div className="text-[10px] font-semibold opacity-80 mb-0.5">✦ IA Next Pro</div>
                  Tenho sim! Pra quando você precisa? Posso já reservar 😊
                </div>
                <div className="max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                  Pode ser amanhã 14h?
                </div>
                <div className="ml-auto max-w-[75%] rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-sm text-white">
                  <div className="text-[10px] font-semibold opacity-80 mb-0.5">✦ IA Next Pro</div>
                  Agendado! Te mando um lembrete 1h antes ✅
                </div>
              </div>
            </div>

            {/* Transcreve áudio */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <Mic className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Transcreve áudio</div>
              <div className="text-sm text-slate-500 mt-1">
                Cliente mandou áudio? A IA escuta, entende e responde na hora.
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white">
                  <Play className="h-4 w-4 ml-0.5" />
                </div>
                <div className="flex-1 flex gap-0.5 h-6 items-center">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full bg-primary/70"
                      style={{ height: `${25 + Math.abs(Math.sin(i * 0.9)) * 75}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">0:12</span>
              </div>
            </div>

            {/* Recupera leads frios */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <Clock className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Recupera leads frios</div>
              <div className="text-sm text-slate-500 mt-1">
                Follow-up automático até o cliente responder.
              </div>
            </div>

            {/* Agenda automático */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <Calendar className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Agenda automático</div>
              <div className="text-sm text-slate-500 mt-1">
                Marca reuniões e visitas sem você abrir a agenda.
              </div>
            </div>

            {/* Aviso de lead quente */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Aviso de lead quente</div>
              <div className="text-sm text-slate-500 mt-1">
                Quando o cliente tá pronto, você recebe no WhatsApp.
              </div>
            </div>

            {/* Anti-bloqueio */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-slate-900">Anti-bloqueio</div>
              <div className="text-sm text-slate-500 mt-1">
                Disparos seguros, ritmo natural, simulação humana.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAGAMENTOS */}
      <section id="pagamentos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Recuperação financeira</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Receba pagamentos{" "}
            <span style={{ color: "#004DFF" }}>sem levantar um dedo</span>
            <span className="text-slate-900">.</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Cobrança automática no WhatsApp. PIX, boleto, lembretes e recuperação de inadimplentes — tudo a IA faz por você.
          </p>
        </div>

        {/* Top row: chat + timeline */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {/* Chat mockup */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" />
                Cobrança automática · WhatsApp
              </div>
            </div>
            <div className="flex-1 p-5 space-y-3 bg-white">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500 text-white px-4 py-3 text-sm">
                <div className="text-[10px] opacity-90 font-semibold mb-1">✦ IA Next Pro</div>
                Olá 👋 Seu pagamento vence hoje. Segue novamente o link para pagamento.
              </div>
              <div className="max-w-[60%] rounded-2xl rounded-tl-sm bg-slate-100 text-slate-800 px-4 py-2 text-sm">
                Pode mandar
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500 text-white px-4 py-3 text-sm space-y-2">
                <div className="text-[10px] opacity-90 font-semibold">✦ IA Next Pro</div>
                <div className="font-semibold">Aqui está 👇</div>
                <div className="rounded-lg bg-emerald-600/40 px-2 py-1.5 text-xs">
                  💳 Link de pagamento:<br />pix.nextpro.ai/p/abc123
                </div>
                <div className="rounded-lg bg-emerald-600/40 px-2 py-1.5 text-xs">
                  📄 Boleto também disponível
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-6">
              Recuperação automática
            </div>
            <ul className="space-y-5">
              {[
                { icon: "💵", title: "Cobrança enviada", sub: "Dia do vencimento", dot: "bg-emerald-500" },
                { icon: "🔔", title: "Lembrete automático", sub: "24h antes do vencimento", dot: "bg-amber-400" },
                { icon: "⚠️", title: "Aviso de atraso", sub: "1 dia após vencimento", dot: "bg-orange-400" },
                { icon: "💬", title: "Follow-up humanizado", sub: "3 dias depois · tom suave", dot: "bg-violet-500", highlight: true },
                { icon: "📈", title: "Cliente pagou", sub: "Confirmação automática", dot: "bg-emerald-500" },
              ].map((s) => (
                <li key={s.title} className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-lg ${s.highlight ? "bg-violet-500 text-white" : "bg-slate-100"}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-900">{s.title}</div>
                    <div className="text-xs text-slate-500">{s.sub}</div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Middle row: payment methods + stat */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 flex items-center justify-around">
            {[
              { icon: <CreditCard className="h-6 w-6" />, label: "PIX" },
              { icon: <CreditCard className="h-6 w-6" />, label: "Boleto" },
              { icon: <CreditCard className="h-6 w-6" />, label: "Link" },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-2 text-slate-600">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  {m.icon}
                </div>
                <span className="text-sm">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-8 flex flex-col justify-center">
            <div className="text-4xl font-bold text-emerald-600">+40%</div>
            <p className="mt-2 text-sm text-slate-600">
              de clientes inadimplentes pagam com follow-up automático
            </p>
          </div>
        </div>

        {/* Bottom features */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <CreditCard className="h-5 w-5" />, title: "Cobrança no WhatsApp", sub: "Envio automático com link de pagamento" },
            { icon: <Bell className="h-5 w-5" />, title: "Lembrete inteligente", sub: "Aviso antes e no dia do vencimento" },
            { icon: <CreditCard className="h-5 w-5" />, title: "PIX + Boleto", sub: "Links de pagamento direto no chat" },
            { icon: <TrendingUp className="h-5 w-5" />, title: "Recuperação ativa", sub: "Follow-up até o cliente pagar" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                {f.icon}
              </div>
              <div className="font-semibold text-sm text-slate-900">{f.title}</div>
              <div className="text-xs text-slate-500 mt-1">{f.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#004DFF" }}>
              Planos para cada fase
            </span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight text-slate-900">
              Escolha o plano{" "}
              <span style={{ color: "#004DFF" }}>ideal pra você</span>
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Comece grátis por 3 dias. Sem cartão, sem fidelidade — mude de plano quando quiser.
            </p>

            <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition ${billing === "monthly" ? "text-white" : "text-slate-600"}`}
                style={billing === "monthly" ? { backgroundColor: "#004DFF" } : undefined}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${billing === "annual" ? "text-white" : "text-slate-600"}`}
                style={billing === "annual" ? { backgroundColor: "#004DFF" } : undefined}
              >
                Anual
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${billing === "annual" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                  -2 meses
                </span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Start */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
              <div className="text-xl font-bold text-slate-900">Start</div>
              <p className="mt-1 text-sm text-slate-500">Para autônomos e pequenos times.</p>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-slate-900">R$ 97</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">ou R$ 80,83/mês no anual</div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#004DFF" }}>
                <Sparkles className="h-3.5 w-3.5" /> 3 dias grátis
              </div>

              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                {[
                  "3 atendentes",
                  "1 conexão WhatsApp",
                  "IA completa",
                  "Campanhas em massa",
                  "Contatos ilimitados",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button className="mt-6 w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 transition">
                Assinar Start
              </button>

            </div>

            {/* Business */}
            <div className="relative rounded-3xl bg-white border-2 p-8" style={{ borderColor: "#004DFF", boxShadow: "0 20px 60px -25px rgba(0, 77, 255, 0.4)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: "#004DFF" }}>
                Mais popular
              </div>
              <div className="text-xl font-bold text-slate-900">Business</div>
              <p className="mt-1 text-sm text-slate-500">Para equipes em crescimento.</p>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-slate-900">R$ 197</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">ou R$ 164,17/mês no anual</div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#004DFF" }}>
                <Sparkles className="h-3.5 w-3.5" /> 3 dias grátis
              </div>

              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                {[
                  "10 atendentes",
                  "3 conexões WhatsApp",
                  "IA completa",
                  "Campanhas ilimitadas",
                  "Relatórios avançados",
                  "Suporte prioritário",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button className="mt-6 w-full rounded-xl text-white font-semibold py-3 transition hover:opacity-90" style={{ backgroundColor: "#004DFF" }}>
                Assinar Business
              </button>

            </div>
          </div>

          {/* TABELA COMPARATIVA */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h3 className="text-center text-2xl font-bold text-slate-900">Compare os planos</h3>
            <p className="mt-2 text-center text-sm text-slate-500">Veja lado a lado o que cada plano entrega.</p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left font-semibold text-slate-700 px-6 py-4">Recurso</th>
                    <th className="text-center font-semibold text-slate-700 px-6 py-4">Start</th>
                    <th className="text-center font-semibold px-6 py-4" style={{ color: "#004DFF" }}>Business</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {[
                    ["Atendentes", "3", "10"],
                    ["Conexões WhatsApp", "1", "3"],
                    ["Contatos", "Ilimitados", "Ilimitados"],
                    ["IA completa (Aurora)", true, true],
                    ["Campanhas em massa", "Básicas", "Ilimitadas"],
                    ["Recuperação financeira", true, true],
                    ["Fluxos automatizados", true, true],
                    ["Relatórios avançados", false, true],
                    ["Voz clonada (ElevenLabs)", false, true],
                    ["API + Webhooks", false, true],
                    ["Suporte", "E-mail", "Prioritário"],
                    ["Teste grátis", "3 dias", "3 dias"],
                  ].map(([label, start, business], idx) => (
                    <tr key={label as string} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                      <td className="px-6 py-3.5 font-medium text-slate-800">{label as string}</td>
                      <td className="px-6 py-3.5 text-center">
                        {typeof start === "boolean" ? (
                          start ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">—</span>
                          )
                        ) : (
                          <span>{start}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {typeof business === "boolean" ? (
                          business ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">—</span>
                          )
                        ) : (
                          <span className="font-semibold" style={{ color: "#004DFF" }}>{business}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>


      {/* VOZ CLONADA */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#004DFF" }} />
              Tecnologia exclusiva
            </span>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              Sua <span style={{ color: "#004DFF" }}>voz clonada</span>,<br />
              respondendo por você.
            </h2>
            <p className="mt-5 text-slate-600 text-base leading-relaxed">
              Grave 60 segundos da sua voz. A IA clona e envia áudios automáticos no WhatsApp — tão naturais que o cliente jura que é você.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {["Áudios ultra naturais em português", "Atendimento humanizado em escala", "Mais retenção, mais conversão", "Cliente sente que está falando com gente"].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300">
                    <Check className="h-3 w-3 text-slate-500" />
                  </span>
                  {i}
                </li>
              ))}
            </ul>
            <Link to="/auth">
              <Button className="mt-8 rounded-full px-6 py-6 text-white shadow-lg hover:opacity-90" style={{ backgroundColor: "#004DFF" }}>
                Clonar minha voz <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#004DFF" }}>
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">Sua voz · IA Next Pro</div>
                <div className="text-xs text-slate-500">Clonada com 60s de áudio</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="h-14 w-14 rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity flex-shrink-0" style={{ backgroundColor: "#004DFF" }}>
                <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
              </button>
              <div className="flex gap-[3px] h-12 items-center flex-1">
                {[...Array(48)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${25 + Math.abs(Math.sin(i * 0.7)) * 70 + Math.abs(Math.cos(i * 1.3)) * 20}%`,
                      backgroundColor: "#004DFF",
                      opacity: 0.75,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">0:18</span>
            </div>
            <p className="text-center text-xs text-slate-500 mt-4">Clique no play e ouça uma amostra agora.</p>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
              {[
                { v: "60s", l: "pra clonar" },
                { v: "100%", l: "natural" },
                { v: "pt-BR", l: "nativo" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-xl font-bold" style={{ color: "#004DFF" }}>{s.v}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEGMENTOS */}
      <section id="segmentos" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#004DFF" }}>
            Pra qualquer negócio
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold font-space-grotesk">
            Funciona pro{" "}
            <span style={{ color: "#004DFF" }}>seu segmento.</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            A IA se adapta ao seu nicho. Prospecção e atendimento ajustados ao seu mercado.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-5">
          {segments.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center hover:border-primary/40 hover:shadow-sm transition-all">
              <s.icon className="h-7 w-7 mx-auto" style={{ color: "#004DFF" }} strokeWidth={1.75} />
              <div className="mt-4 text-sm font-medium text-slate-700">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CENTRAL COMPLETA */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#004DFF" }} />
              Tudo em um único painel
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold">
              Sua central comercial <span style={{ color: "#004DFF" }}>completa.</span>
            </h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
              Prospecção, IA, CRM, cobrança e campanhas — organizados, sem complicação.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {[
              {
                icon: Target, title: "Prospecção",
                items: [
                  { i: MapPin, l: "Google Maps" },
                  { i: Instagram, l: "Instagram" },
                  { i: FileText, l: "Base CNPJ" },
                  { i: UsersRound, l: "Grupos WhatsApp" },
                ],
              },
              {
                icon: Bot, title: "IA & Automação",
                items: [
                  { i: Headphones, l: "Atendimento IA" },
                  { i: Volume2, l: "Áudio IA" },
                  { i: Mic, l: "Clonagem de voz" },
                  { i: Repeat, l: "Follow-up automático" },
                ],
              },
              {
                icon: Wallet, title: "Comercial & Cobrança",
                items: [
                  { i: TrendingUp, l: "CRM / Funil" },
                  { i: Receipt, l: "Cobranças automáticas" },
                  { i: CreditCard, l: "PIX e boleto" },
                  { i: AlertCircle, l: "Recuperação de inadimplentes" },
                ],
              },
              {
                icon: Megaphone, title: "Comunicação",
                items: [
                  { i: Send, l: "Campanhas em massa" },
                  { i: MessageSquare, l: "Múltiplos WhatsApps" },
                  { i: ListChecks, l: "Respostas rápidas" },
                  { i: Ban, l: "Listas e blacklist" },
                ],
              },
            ].map((group) => (
              <div key={group.title} className="rounded-2xl bg-white border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <group.icon className="h-5 w-5" style={{ color: "#004DFF" }} />
                  </div>
                  <div className="font-semibold text-lg">{group.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.items.map((it) => (
                    <div key={it.l} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                      <it.i className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{it.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTO */}
      <section id="depoimentos" className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="flex justify-center gap-1 mb-6">
          {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
        </div>
        <blockquote className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed">
          “Em 30 dias, a MarketFlow respondeu mais clientes do que minha equipe inteira em 6 meses. Triplicamos o faturamento.”
        </blockquote>
        <div className="mt-6 text-sm text-slate-500">Carla Mendes — CEO, Studio Bella</div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-12 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-5xl font-bold">Quero vender no automático.</h2>
          <p className="mt-4 opacity-90 max-w-xl mx-auto">
            Prospecção + WhatsApp + IA + cobrança automática — em uma única plataforma.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-8 bg-white text-primary-dark hover:bg-slate-100 rounded-full px-8 h-12 font-semibold">
              Começar Teste Grátis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white">
              <Zap className="h-3.5 w-3.5" />
            </div>
            MarketFlow
          </div>
          <div className="flex gap-6">
            <Link to="/politica-de-privacidade" className="hover:text-slate-900">Privacidade</Link>
            <Link to="/termos-de-servico" className="hover:text-slate-900">Termos</Link>
            <Link to="/auth" className="hover:text-slate-900">Entrar</Link>
          </div>
          <div>© {new Date().getFullYear()} MarketFlow. Todos os direitos reservados.</div>
        </div>
      </footer>

      <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base">{selectedLead?.name}</DialogTitle>
                <DialogDescription className="text-xs">Lead capturado automaticamente</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <PhoneCall className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-900">{selectedLead?.phone}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span className="text-slate-700">Origem: <span className="font-medium text-slate-900">{selectedLead?.origin}</span></span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                if (selectedLead) window.open(`tel:${selectedLead.phone.replace(/\D/g, "")}`);
              }}
            >
              <PhoneCall className="h-4 w-4 mr-2" /> Chamar agora
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (selectedLead) setSavedLeads((s) => Array.from(new Set([...s, selectedLead.name])));
                setSelectedLead(null);
              }}
            >
              <Target className="h-4 w-4 mr-2" />
              {selectedLead && savedLeads.includes(selectedLead.name) ? "Já no funil" : "Salvar no funil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
