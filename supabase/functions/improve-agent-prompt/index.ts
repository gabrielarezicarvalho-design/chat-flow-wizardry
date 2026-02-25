import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("OpenAI error:", response.status, t);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini error:", response.status, t);
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { systemPrompt, knowledgeText, agentName, mode } = await req.json();

    // Get user's company AI keys from settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let companyId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
        companyId = profile?.company_id;
      }
    }

    // Fetch AI keys from settings
    let openaiKey: string | null = null;
    let geminiKey: string | null = null;

    if (companyId) {
      const { data: aiSettings } = await supabase
        .from("settings")
        .select("key, value")
        .eq("company_id", companyId)
        .in("key", ["ai_openai_key", "ai_gemini_key"]);

      if (aiSettings) {
        for (const setting of aiSettings) {
          const val = setting.value;
          const extractKey = (v: any): string | null => {
            if (!v) return null;
            if (typeof v === "string") return v;
            if (typeof v === "object" && v.key) return v.key;
            return String(v);
          };
          if (setting.key === "ai_openai_key") openaiKey = extractKey(val);
          if (setting.key === "ai_gemini_key") geminiKey = extractKey(val);
        }
      }
    }

    if (!openaiKey && !geminiKey) {
      return new Response(
        JSON.stringify({ error: "Nenhuma chave de IA configurada. Vá em Configurações → IA para adicionar sua chave OpenAI ou Gemini." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sysPrompt = "Você é um especialista em engenharia de prompts e design de assistentes de IA. Sua tarefa é ajudar a melhorar prompts e bases de conhecimento de chatbots de atendimento via WhatsApp. Seja prático, direto e dê sugestões acionáveis. Sempre mantenha o conteúdo original e apenas adicione/melhore.";

    let userMessage = "";

    if (mode === "improve_prompt") {
      userMessage = `Analise o seguinte prompt de sistema de um assistente de IA chamado "${agentName || "Assistente"}" e sugira melhorias. NÃO apague nada do prompt original. Apenas adicione, ajuste e melhore.

PROMPT ATUAL:
"""
${systemPrompt || "(vazio)"}
"""

Responda em português brasileiro com:

1. **Análise do prompt atual** - pontos fortes e fracos em 2-3 frases
2. **Sugestões de melhoria** - liste 3-5 melhorias específicas e práticas
3. **Prompt melhorado** - reescreva o prompt completo incorporando as melhorias, mantendo TODO o conteúdo original e apenas adicionando/refinando. Coloque entre \`\`\`prompt e \`\`\`

Foque em: clareza de papel, tom de voz, limites de atuação, formato de resposta, e tratamento de exceções.`;
    } else if (mode === "improve_knowledge") {
      userMessage = `Analise a seguinte base de conhecimento de um assistente de IA chamado "${agentName || "Assistente"}" e sugira melhorias de organização e conteúdo. NÃO apague nada do conteúdo original.

BASE DE CONHECIMENTO ATUAL:
"""
${knowledgeText || "(vazia)"}
"""

Responda em português brasileiro com:

1. **Análise da base atual** - como está organizada, pontos fortes e fracos
2. **Sugestões de melhoria** - liste 3-5 melhorias de organização, formatação e conteúdo
3. **Base de conhecimento melhorada** - reescreva a base completa com melhor estrutura, mantendo TODO o conteúdo original e apenas organizando/refinando. Coloque entre \`\`\`knowledge e \`\`\`

Foque em: organização por seções, uso de marcadores, clareza, FAQ estruturado, e informações que podem estar faltando.`;
    } else if (mode === "suggest_additions") {
      userMessage = `Com base no prompt e na base de conhecimento abaixo de um assistente de IA chamado "${agentName || "Assistente"}", sugira conteúdos adicionais que podem melhorar as respostas.

PROMPT:
"""
${systemPrompt || "(vazio)"}
"""

BASE DE CONHECIMENTO:
"""
${knowledgeText || "(vazia)"}
"""

Responda em português brasileiro com:

1. **Gaps identificados** - que tipos de perguntas o assistente pode não conseguir responder bem?
2. **Conteúdos sugeridos** - liste 5-8 tópicos/informações que deveriam ser adicionados à base de conhecimento
3. **Exemplos de perguntas difíceis** - liste 5 perguntas que o assistente provavelmente erraria hoje e como deveria responder
4. **Template de FAQ sugerido** - crie um modelo de FAQ que pode ser preenchido pelo usuário, entre \`\`\`faq e \`\`\``;
    }

    let result: string | null = null;

    // Try OpenAI first, then Gemini as fallback
    if (openaiKey) {
      try {
        result = await callOpenAI(openaiKey, sysPrompt, userMessage);
      } catch (e) {
        console.error("OpenAI failed, trying Gemini fallback:", e);
        if (geminiKey) {
          result = await callGemini(geminiKey, sysPrompt, userMessage);
        } else {
          throw e;
        }
      }
    } else if (geminiKey) {
      result = await callGemini(geminiKey, sysPrompt, userMessage);
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-agent-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
