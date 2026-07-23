import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string, chatHistory?: any[], images?: string[]) {
  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  if (chatHistory && chatHistory.length > 0) {
    messages.push(...chatHistory);
  }
  
  // Build user message with images if present
  if (images && images.length > 0) {
    const content: any[] = [{ type: "text", text: userMessage }];
    for (const img of images) {
      content.push({ type: "image_url", image_url: { url: img } });
    }
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const model = images && images.length > 0 ? "gpt-4o-mini" : "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
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

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string, chatHistory?: any[], images?: string[]) {
  const contents: any[] = [];
  
  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    }
  }
  
  // Build user parts with images
  const userParts: any[] = [{ text: userMessage }];
  if (images && images.length > 0) {
    for (const img of images) {
      // Extract base64 data and mime type
      const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        userParts.push({
          inline_data: { mime_type: match[1], data: match[2] }
        });
      }
    }
  }
  contents.push({ role: "user", parts: userParts });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
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

async function callLovableAI(systemPrompt: string, userMessage: string, chatHistory?: any[], images?: string[]) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const messages: any[] = [{ role: "system", content: systemPrompt }];
  if (chatHistory && chatHistory.length > 0) messages.push(...chatHistory);
  if (images && images.length > 0) {
    const content: any[] = [{ type: "text", text: userMessage }];
    for (const img of images) content.push({ type: "image_url", image_url: { url: img } });
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: userMessage });
  }
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3.6-flash", messages }),
  });
  if (!response.ok) {
    const t = await response.text();
    console.error("Lovable AI error:", response.status, t);
    if (response.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (response.status === 402) throw new Error("Créditos insuficientes no workspace Lovable.");
    throw new Error(`Lovable AI error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { systemPrompt, knowledgeText, agentName, mode, testMessage, chatHistory, agentConfig, images } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    let openaiKey: string | null = null;
    let geminiKey: string | null = null;

    const extractKey = (v: any): string | null => {
      if (!v) return null;
      if (typeof v === "string") return v.trim() || null;
      if (typeof v === "object" && v.key) return String(v.key).trim() || null;
      return String(v).trim() || null;
    };

    const applySettings = (rows: any[] | null) => {
      if (!rows) return;
      for (const s of rows) {
        if (s.key === "ai_openai_key" && !openaiKey) openaiKey = extractKey(s.value);
        if (s.key === "ai_gemini_key" && !geminiKey) geminiKey = extractKey(s.value);
      }
    };

    if (companyId) {
      const { data } = await supabase
        .from("settings").select("key, value")
        .eq("company_id", companyId)
        .in("key", ["ai_openai_key", "ai_gemini_key"]);
      applySettings(data);
    }
    if (!openaiKey && !geminiKey) {
      const { data } = await supabase
        .from("settings").select("key, value")
        .is("company_id", null)
        .in("key", ["ai_openai_key", "ai_gemini_key"]);
      applySettings(data);
    }

    // Sem chaves de empresa/globais? Usaremos o Lovable AI Gateway como fallback automático.

    let sysPrompt = "";
    let userMessage = "";
    let formattedHistory: any[] | undefined;

    if (mode === "improve_prompt") {
      sysPrompt = "Você é um especialista em engenharia de prompts e design de assistentes de IA. Sua tarefa é ajudar a melhorar prompts e bases de conhecimento de chatbots de atendimento via WhatsApp. Seja prático, direto e dê sugestões acionáveis. Sempre mantenha o conteúdo original e apenas adicione/melhore.";
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
      sysPrompt = "Você é um especialista em engenharia de prompts e design de assistentes de IA. Sua tarefa é ajudar a melhorar prompts e bases de conhecimento de chatbots de atendimento via WhatsApp. Seja prático, direto e dê sugestões acionáveis. Sempre mantenha o conteúdo original e apenas adicione/melhore.";
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
      sysPrompt = "Você é um especialista em engenharia de prompts e design de assistentes de IA. Sua tarefa é ajudar a melhorar prompts e bases de conhecimento de chatbots de atendimento via WhatsApp. Seja prático, direto e dê sugestões acionáveis. Sempre mantenha o conteúdo original e apenas adicione/melhore.";
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
    } else if (mode === "diagnostic_chat") {
      // EMPLOYEE CONVERSATION MODE
      // The manager (user) talks to the AI as their employee, giving feedback, corrections, etc.
      
      sysPrompt = `Você é a funcionária "${agentName || "Assistente"}" de uma empresa. Seu gerente está conversando com você para treinar, avaliar e melhorar seu atendimento.

CONTEXTO ATUAL DO SEU TRABALHO:
- Seu prompt de atendimento atual é:
"""
${systemPrompt || "(sem prompt configurado)"}
"""

- Sua base de conhecimento atual é:
"""
${knowledgeText || "(sem base de conhecimento)"}
"""

COMO VOCÊ DEVE SE COMPORTAR:

1. **QUANDO O GERENTE SIMULA UM CLIENTE** (ex: "Olá, quais os planos?", "quanto custa?"):
   - Responda EXATAMENTE como responderia a um cliente real, usando seu prompt e base de conhecimento.
   - NÃO invente informações que não estão na sua base.

2. **QUANDO O GERENTE DÁ FEEDBACK/ADVERTÊNCIA** (ex: "você errou", "não é assim", "melhore isso", "quando o cliente perguntar X responda Y"):
   - Aceite a correção com humildade e profissionalismo.
   - Diga que entendeu e explique como vai melhorar.
   - GERE AUTOMATICAMENTE uma sugestão de melhoria no formato abaixo.

3. **QUANDO O GERENTE PEDE PARA MELHORAR ALGO** (ex: "aprenda a responder sobre X", "adicione informação Y"):
   - Confirme que entendeu.
   - GERE a sugestão de melhoria automaticamente.

FORMATO DE SUGESTÃO DE MELHORIA:
Sempre que detectar que o gerente está corrigindo, ensinando ou pedindo melhorias, ADICIONE ao final da sua resposta:

---MELHORIA---
DESTINO: [prompt ou conhecimento]
CONTEÚDO:
\`\`\`
[o texto exato que deve ser adicionado/alterado]
\`\`\`
EXPLICAÇÃO: [breve explicação do que essa melhoria faz]
---FIM-MELHORIA---

REGRAS PARA DECIDIR O DESTINO:
- Use "prompt" para: mudanças de comportamento, tom de voz, regras de atendimento, instruções de como agir, limites, estilo de resposta.
- Use "conhecimento" para: informações factuais, dados de produtos/serviços, preços, FAQ, procedimentos, horários, contatos.

4. **CONVERSA NORMAL** (ex: "como vai?", "está pronta?"):
   - Responda naturalmente como uma funcionária motivada e profissional.

IMPORTANTE:
- Trate o usuário SEMPRE como seu gerente/chefe, nunca como cliente.
- Seja receptiva a críticas e mostre vontade de melhorar.
- Quando não souber algo, admita e pergunte como deve responder.
- NUNCA quebre o personagem de funcionária.`;

      userMessage = testMessage || "";
      
      // Format chat history for context
      if (chatHistory && chatHistory.length > 0) {
        formattedHistory = chatHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));
      }
    } else if (mode === "full_diagnostic") {
      sysPrompt = `Você é um engenheiro de qualidade especializado em chatbots de atendimento via WhatsApp. Analise TODOS os aspectos do agente e retorne um diagnóstico completo em formato JSON PURO (sem markdown, sem backticks).

O JSON deve ter esta estrutura exata:
{
  "issues": [
    {
      "category": "prompt|conhecimento|configuracao|sistema",
      "severity": "critical|warning|info",
      "title": "Título curto do problema",
      "description": "Descrição detalhada do problema encontrado",
      "fix_type": "prompt|knowledge|config|manual",
      "fix_content": "O conteúdo corrigido ou instrução de correção",
      "fix_description": "Explicação do que a correção faz"
    }
  ],
  "score": 75,
  "summary": "Resumo geral em 2-3 frases"
}

CATEGORIAS:
1. prompt - Clareza do papel, tom de voz, limites, tratamento de exceções, instruções conflitantes
2. conhecimento - Informações faltantes, organização, FAQ ausente, dados vagos
3. configuracao - Modelo adequado, temperatura adequada, capacidades habilitadas
4. sistema - Prompt muito longo/curto, base vazia, conflitos, assinatura ausente

REGRAS:
- Retorne APENAS JSON puro, sem texto antes ou depois, sem backticks
- fix_type "prompt": fix_content = TRECHO a ADICIONAR ao prompt
- fix_type "knowledge": fix_content = TRECHO a ADICIONAR à base
- fix_type "config": fix_content = JSON de configs (ex: {"temperature": 0.5})
- fix_type "manual": fix_content = instrução para o desenvolvedor
- Score de 0-100 baseado na qualidade geral`;

      const configInfo = agentConfig ? `\nCONFIG: Modelo=${agentConfig.model||"?"}, Temp=${agentConfig.temperature??0.7}, Imagens=${agentConfig.can_understand_images?"Sim":"Não"}, Áudio=${agentConfig.can_understand_audio?"Sim":"Não"}, PDF=${agentConfig.can_process_pdf?"Sim":"Não"}, Assinatura=${agentConfig.signature||"nenhuma"}, Marcadores=${agentConfig.output_markers||"nenhum"}` : "";

      userMessage = `Diagnostique o agente "${agentName || "Assistente"}".

PROMPT:
"""
${systemPrompt || "(VAZIO - PROBLEMA CRÍTICO)"}
"""

BASE DE CONHECIMENTO:
"""
${knowledgeText || "(vazia)"}
"""
${configInfo}`;
    } else if (mode === "diagnostic_test") {
      sysPrompt = systemPrompt || "Você é um assistente.";
      if (knowledgeText) {
        sysPrompt += `\n\nBASE DE CONHECIMENTO:\n${knowledgeText}`;
      }
      userMessage = testMessage || "";
    }

    let result: string | null = null;

    // Padrão: Lovable AI Gateway (google/gemini-3.6-flash). Plano B: chaves do usuário (Gemini/OpenAI).
    const tryGemini = async () => {
      if (!geminiKey) return null;
      try {
        return await callGemini(geminiKey, sysPrompt, userMessage, formattedHistory, images);
      } catch (e) {
        console.error("Gemini (fallback) failed:", e);
        return null;
      }
    };

    const tryOpenAI = async () => {
      if (!openaiKey) return null;
      try {
        return await callOpenAI(openaiKey, sysPrompt, userMessage, formattedHistory, images);
      } catch (e) {
        console.error("OpenAI (fallback) failed:", e);
        return null;
      }
    };

    try {
      result = await callLovableAI(sysPrompt, userMessage, formattedHistory, images);
    } catch (e) {
      console.error("Lovable AI (primary) failed, trying user keys as fallback:", e);
      result = (await tryGemini()) || (await tryOpenAI());
      if (!result) throw e;
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
