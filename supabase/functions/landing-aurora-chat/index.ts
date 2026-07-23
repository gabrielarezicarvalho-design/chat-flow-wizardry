import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const SYSTEM_PROMPT = `Você é a Aurora AI, uma assistente comercial da MarketFlow — uma plataforma de prospecção, atendimento e cobrança automatizada por WhatsApp com IA.

Personalidade: acolhedora, direta, brasileira, entusiasmada e curta. Emojis com moderação.
Objetivo: apresentar a MarketFlow, tirar dúvidas sobre prospecção, IA, WhatsApp e pagamentos, e convidar o visitante a testar ou marcar uma demo.
Regras:
- Respostas curtas (1-3 frases). Nunca escreva parágrafos gigantes.
- Português do Brasil, informal e cordial.
- Se não souber, diga que um humano vai retornar e peça o WhatsApp.
- Nunca invente preços; se perguntarem, diga "temos planos a partir de R$ 97/mês, quer que eu te chame no WhatsApp?".`;

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

async function askAI(userText: string, history: Array<{ role: string; content: string }>, lovableKey: string, geminiKey?: string): Promise<string> {
  // Preferência: Lovable AI Gateway (google/gemini-3.6-flash)
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      { role: "user", content: userText },
    ];
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "google/gemini-3.6-flash", messages, temperature: 0.8, max_tokens: 300 }),
    });
    if (!res.ok) throw new Error(`Gateway falhou: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return String(text).trim() || "Desculpe, pode repetir? 🙏";
  } catch (gwErr) {
    console.warn("Gateway indisponível, tentando Gemini direto:", gwErr);
    if (!geminiKey) throw gwErr;
    const contents = [
      ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: userText }] },
    ];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini falhou: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    return String(text).trim() || "Desculpe, pode repetir? 🙏";
  }
}

async function synthesizeAudio(text: string, voiceId: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
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
    const geminiKey = Deno.env.get("GEMINI_API_KEY_GLOBAL");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    const voiceId = Deno.env.get("AURORA_VOICE_ID");

    if (!lovableKey && !geminiKey) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada (LOVABLE_API_KEY ou GEMINI_API_KEY_GLOBAL)" }), {
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

    const reply = await askGemini(userText, history || [], geminiKey);

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
