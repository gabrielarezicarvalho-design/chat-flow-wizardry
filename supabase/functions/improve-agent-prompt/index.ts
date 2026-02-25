import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { systemPrompt, knowledgeText, agentName, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userMessage = "";

    if (mode === "improve_prompt") {
      userMessage = `Analise o seguinte prompt de sistema de um assistente de IA chamado "${agentName || 'Assistente'}" e sugira melhorias. NÃO apague nada do prompt original. Apenas adicione, ajuste e melhore.

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
      userMessage = `Analise a seguinte base de conhecimento de um assistente de IA chamado "${agentName || 'Assistente'}" e sugira melhorias de organização e conteúdo. NÃO apague nada do conteúdo original.

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
      userMessage = `Com base no prompt e na base de conhecimento abaixo de um assistente de IA chamado "${agentName || 'Assistente'}", sugira conteúdos adicionais que podem melhorar as respostas.

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em engenharia de prompts e design de assistentes de IA. Sua tarefa é ajudar a melhorar prompts e bases de conhecimento de chatbots de atendimento via WhatsApp. Seja prático, direto e dê sugestões acionáveis. Sempre mantenha o conteúdo original e apenas adicione/melhore.",
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-agent-prompt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
