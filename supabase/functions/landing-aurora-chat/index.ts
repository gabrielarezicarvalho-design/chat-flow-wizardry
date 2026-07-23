import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const SYSTEM_PROMPT = `Você é a Aurora AI, consultora comercial inteligente da MarketFlow. Responda como uma pessoa brasileira, acolhedora, clara e segura, usando o contexto da conversa.

Sobre a MarketFlow:
- É uma plataforma de prospecção, atendimento, vendas e cobrança automatizada pelo WhatsApp com inteligência artificial.
- Capta e organiza leads de fontes como Google Maps, Instagram, TikTok e pesquisa de anúncios.
- Centraliza conversas, contatos, funil/CRM, formulários e acompanhamento comercial.
- Permite criar agentes de IA e fluxos automatizados para responder clientes, qualificar leads, fazer follow-up, enviar textos, arquivos e áudios e encaminhar para atendentes.
- Oferece recursos de pagamentos e cobranças, incluindo automações de cobrança recorrente.
- Ajuda empresas a atender e prospectar 24 horas por dia, mantendo a equipe humana no controle.

Como responder:
- Entenda a intenção real da pergunta e dê uma resposta útil, específica e completa.
- Para perguntas amplas, como produtos, recursos ou funcionamento, explique os pontos principais em 3 a 6 frases naturais, com começo, desenvolvimento e conclusão.
- Para perguntas simples, responda de forma mais curta, mas nunca com uma frase incompleta ou genérica.
- Escreva para ser falado em voz alta: frases fluidas, sem listas, títulos, markdown, links ou emojis.
- Termine toda resposta de forma natural. Nunca interrompa uma explicação no meio.
- Não invente recursos, condições ou preços. Se não souber algo, diga que vai confirmar com um especialista e ofereça atendimento humano.
- Quando fizer sentido, finalize com apenas uma pergunta objetiva para avançar a conversa.`;

async function transcribeAudio(base64Audio: string, mimeType: string, apiKey: string): Promise<string> {
  const binary = Uint8Array.from(atob(base64Audio), (c) => c.charCodeAt(0));
  const blob = new Blob([binary], { type: mimeType || "audio/webm" });

  const form = new FormData();
  form.append("file", blob, "audio.webm");
  form.append("model_id", "scribe_v2");
  form.append("language_code", "por");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`STT falhou: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return String(json.text || "").trim();
}

async function askAI(userText: string, history: Array<{ role: string; content: string }>, lovableKey: string, openaiKey?: string): Promise<string> {
  const normalizedHistory = history
    .filter((m) => typeof m?.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.trim() }));

  // O frontend pode incluir a mensagem atual no histórico. Remova a duplicata para
  // evitar que o modelo interprete a mesma pergunta como dois turnos diferentes.
  const lastMessage = normalizedHistory.at(-1);
  if (lastMessage?.role === "user" && lastMessage.content === userText.trim()) {
    normalizedHistory.pop();
  }

  const input = [
    ...normalizedHistory,
    { role: "user", content: userText },
  ];

  // OpenAI GPT via Lovable AI Gateway. Esta implantação do Gateway expõe a
  // compatibilidade de chat; um limite amplo evita cortar o texto antes do TTS.
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...input,
        ],
        max_completion_tokens: 1200,
      }),
    });
    if (!res.ok) throw new Error(`Gateway falhou: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return String(text).trim() || "Desculpe, pode repetir? 🙏";
  } catch (gwErr) {
    console.warn("Gateway indisponível, tentando OpenAI direto:", gwErr);
    if (!openaiKey) throw gwErr;
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...input,
    ];
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.6, max_tokens: 1200 }),
    });
    if (!res.ok) throw new Error(`OpenAI falhou: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return String(text).trim() || "Desculpe, pode repetir? 🙏";
  }
}

async function synthesizeAudio(text: string, voiceId: string, apiKey: string): Promise<string> {
  const spokenText = text
    .replace(/[*_#>`~]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: spokenText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.35,
          use_speaker_boost: true,
          speed: 0.95,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`TTS falhou: ${res.status} ${await res.text()}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return base64Encode(buf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = Deno.env.get("AURORA_VOICE_ID");

    if (!lovableKey && !openaiKey) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada (LOVABLE_API_KEY ou OPENAI_API_KEY)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { message, audio, audioMime, history } = body as {
      message?: string;
      audio?: string;
      audioMime?: string;
      history?: Array<{ role: string; content: string }>;
    };

    let userText = (message || "").trim();
    const isAudio = !!audio;

    if (isAudio) {
      if (!elevenKey) {
        return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY não configurada" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userText = await transcribeAudio(audio!, audioMime || "audio/webm", elevenKey);
    }

    if (!userText) {
      return new Response(JSON.stringify({ error: "Mensagem vazia" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = await askAI(userText, history || [], lovableKey || "", openaiKey);

    let audioBase64: string | null = null;
    if (isAudio && elevenKey && voiceId) {
      try {
        audioBase64 = await synthesizeAudio(reply, voiceId, elevenKey);
      } catch (e) {
        console.error("TTS erro:", e);
      }
    }

    return new Response(
      JSON.stringify({ text: reply, transcript: isAudio ? userText : null, audio: audioBase64 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("landing-aurora-chat erro:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
