import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, companyId } = body;

    // ========== APPLY FIX ACTION ==========
    if (action === "apply-fix") {
      const { agentId, field, newValue } = body;
      
      if (!agentId || !field || newValue === undefined) {
        return new Response(JSON.stringify({ error: "Parâmetros inválidos: agentId, field e newValue são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow specific fields to be updated
      const allowedFields = ["system_prompt", "knowledge_text", "temperature", "model", "signature", "output_markers", "status"];
      if (!allowedFields.includes(field)) {
        return new Response(JSON.stringify({ error: `Campo '${field}' não permitido. Campos permitidos: ${allowedFields.join(", ")}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("agents")
        .update({ [field]: newValue, updated_at: new Date().toISOString() })
        .eq("id", agentId);

      if (updateError) {
        console.error("Erro ao atualizar agente:", updateError);
        return new Response(JSON.stringify({ error: `Erro ao atualizar: ${updateError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: `Campo '${field}' do agente atualizado com sucesso!` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== APPLY SETTINGS ACTION ==========
    if (action === "apply-settings") {
      const { settingKey, settingValue, targetCompanyId } = body;
      
      if (!settingKey || settingValue === undefined || !targetCompanyId) {
        return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: upsertError } = await supabase
        .from("settings")
        .upsert({ company_id: targetCompanyId, key: settingKey, value: settingValue }, { onConflict: "company_id,key" });

      if (upsertError) {
        return new Response(JSON.stringify({ error: `Erro ao atualizar setting: ${upsertError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: `Setting '${settingKey}' atualizada com sucesso!` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== CHAT/DIAGNOSE ACTION ==========
    const { messages } = body;

    // Get OpenAI key - properly extract from jsonb
    let openaiKey = "";
    
    if (companyId) {
      const { data: keySetting } = await supabase
        .from("settings")
        .select("value")
        .eq("company_id", companyId)
        .eq("key", "ai_openai_key")
        .maybeSingle();
      
      if (keySetting?.value) {
        // Handle jsonb: value could be a string or a JSON-wrapped string
        const val = keySetting.value;
        if (typeof val === "string") {
          openaiKey = val;
        } else if (typeof val === "object" && val !== null) {
          openaiKey = String(val);
        } else {
          openaiKey = String(val);
        }
        // Remove any surrounding quotes that jsonb might add
        openaiKey = openaiKey.replace(/^"|"$/g, '');
      }
    }
    
    if (!openaiKey) {
      openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
    }

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "Chave OpenAI não configurada. Configure a chave IA da empresa." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather system context
    let systemContext = "";

    if (action === "diagnose" || action === "chat") {
      const [agentsRes, flowsRes, connectionsRes, conversationsRes] = await Promise.all([
        supabase.from("agents").select("id, name, status, model, system_prompt, knowledge_text, company_id").limit(20),
        supabase.from("flows").select("id, name, is_active, trigger_type, description, company_id").limit(20),
        supabase.from("connections").select("id, name, status, platform, environment, company_id, instance_name").limit(20),
        supabase.from("conversations").select("id, contact_name, contact_phone, status, attendance_type, last_message, updated_at, connection_id").order("updated_at", { ascending: false }).limit(10),
      ]);

      systemContext = `
DADOS ATUAIS DO SISTEMA (consultados em tempo real):

=== AGENTES IA (${agentsRes.data?.length || 0}) ===
${agentsRes.data?.map(a => `- ${a.name} [ID: ${a.id}] (company: ${a.company_id}): status=${a.status}, model=${a.model}
  Prompt: ${a.system_prompt?.substring(0, 200) || "N/A"}...
  Base conhecimento: ${a.knowledge_text ? a.knowledge_text.substring(0, 200) + "..." : "Vazia"}`).join("\n") || "Nenhum"}

=== FLUXOS (${flowsRes.data?.length || 0}) ===
${flowsRes.data?.map(f => `- ${f.name} (${f.id.substring(0, 8)}): ativo=${f.is_active}, trigger=${f.trigger_type}`).join("\n") || "Nenhum"}

=== CONEXÕES (${connectionsRes.data?.length || 0}) ===
${connectionsRes.data?.map(c => `- ${c.name || c.instance_name} (${c.id.substring(0, 8)}): status=${c.status}, platform=${c.platform}, env=${c.environment}`).join("\n") || "Nenhuma"}

=== CONVERSAS RECENTES (${conversationsRes.data?.length || 0}) ===
${conversationsRes.data?.map(c => `- ${c.contact_name || c.contact_phone} (${c.id.substring(0, 8)}): status=${c.status}, tipo=${c.attendance_type}, última msg: "${c.last_message?.substring(0, 80)}"`).join("\n") || "Nenhuma"}
`;
    }

    // If specific agent context requested
    if (body.context?.agentId) {
      const { data: agent } = await supabase.from("agents").select("*").eq("id", body.context.agentId).single();
      if (agent) {
        systemContext += `
=== AGENTE ESPECÍFICO SELECIONADO ===
ID: ${agent.id}
Nome: ${agent.name}
Modelo: ${agent.model}
Status: ${agent.status}
Temperatura: ${agent.temperature}
Prompt completo:
${agent.system_prompt || "Sem prompt"}

Base de conhecimento completa:
${agent.knowledge_text || "Vazia"}

Assinatura: ${agent.signature || "Nenhuma"}
Output Markers: ${agent.output_markers || "Nenhum"}
Capacidades: vision=${agent.can_understand_images}, audio=${agent.can_understand_audio}, pdf=${agent.can_process_pdf}
`;
      }
    }

    // If specific conversation context
    if (body.context?.conversationId) {
      const { data: conv } = await supabase.from("conversations").select("*").eq("id", body.context.conversationId).single();
      const { data: msgs } = await supabase.from("messages").select("sender_type, content, created_at, message_type").eq("conversation_id", body.context.conversationId).order("created_at", { ascending: true }).limit(30);
      if (conv) {
        systemContext += `
=== CONVERSA ESPECÍFICA ===
Contato: ${conv.contact_name} (${conv.contact_phone})
Status: ${conv.status}
Tipo: ${conv.attendance_type}
Departamento: ${conv.department_id || "Nenhum"}
Assigned: ${conv.assigned_to || "Ninguém"}

Histórico de mensagens:
${msgs?.map(m => `[${m.sender_type}] ${m.content?.substring(0, 200)}`).join("\n") || "Sem mensagens"}
`;
      }
    }

    const systemPrompt = `Você é o PROGRAMADOR IA do sistema MarketFlow Chat - uma plataforma de atendimento via WhatsApp com agentes IA, fluxos automatizados (URA) e gestão de conversas.

SUA FUNÇÃO:
Você é um engenheiro de software sênior que diagnostica problemas no sistema E APLICA CORREÇÕES AUTOMATICAMENTE.

QUANDO IDENTIFICAR PROBLEMAS EM AGENTES IA:
Se o problema for no prompt ou knowledge_text de um agente, você DEVE incluir no final da sua resposta um bloco JSON especial com a correção, no formato:

\`\`\`json:apply-fix
{
  "type": "agent-fix",
  "agentId": "UUID_DO_AGENTE",
  "agentName": "Nome do Agente",
  "fixes": [
    {
      "field": "system_prompt",
      "description": "Descrição curta do que foi corrigido",
      "newValue": "O novo prompt completo corrigido aqui"
    }
  ]
}
\`\`\`

QUANDO IDENTIFICAR PROBLEMAS DE CÓDIGO:
Gere o código corrigido completo e inclua um bloco:

\`\`\`json:code-fix
{
  "type": "code-fix",
  "file": "supabase/functions/NOME/index.ts",
  "description": "Descrição da correção",
  "code": "código completo aqui"
}
\`\`\`

REGRAS IMPORTANTES PARA OS BLOCOS DE CORREÇÃO:
- Use APENAS IDs de agentes que existem nos dados do sistema (listados acima)
- O campo "field" pode ser: system_prompt, knowledge_text, temperature, model, signature, output_markers, status
- Sempre gere o valor COMPLETO do campo, não apenas o trecho alterado
- SEMPRE inclua o bloco json:apply-fix quando identificar um problema em agente que pode ser corrigido

1. IDENTIFICAR se o problema é:
   - ❌ ERRO DE PROMPT: O agente IA está respondendo errado por causa do prompt ou da base de conhecimento
   - ⚠️ ERRO DE SISTEMA: Bug no código, fluxo mal configurado, conexão com problemas
   - ℹ️ CONFIGURAÇÃO: Algo precisa ser configurado ou ajustado

2. EXPLICAR a causa raiz do problema de forma clara

3. SUGERIR E GERAR a solução específica com o bloco de correção apropriado

CONHECIMENTO DA ARQUITETURA:
- Frontend: React + TypeScript + Tailwind + Shadcn UI
- Backend: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- WhatsApp: Evolution API v2 e Meta Business API
- IA: OpenAI GPT-4o ou Google Gemini (chaves por empresa na tabela settings)
- Fluxos: Motor de execução em wa-webhook-listener que processa nós (start, message, menu, input, aiAgent, condition, forward, etc)
- Conversas: Tabela conversations com campo attendance_type (ura/ai/agent) e flow_state (JSON com estado do fluxo)
- Agentes: Tabela agents com system_prompt e knowledge_text que são injetados no ai-assistant-chat

FLUXO DE MENSAGENS (wa-webhook-listener):
1. Mensagem chega via webhook
2. Busca conversa existente (ou cria nova com attendance_type="ura")
3. Se tem flow_state pendente → retoma o fluxo
4. Se é conversa nova → executa fluxo automático ativo
5. Nó aiAgent → muda attendance_type para "ai" e chama ai-assistant-chat
6. ai-assistant-chat busca histórico de mensagens, monta prompt com knowledge_text e chama OpenAI/Gemini

PROBLEMAS COMUNS:
- Agente repetindo "Olá tudo bem": flow_state não sendo lido (faltava no SELECT)
- Conversa presa na URA: attendance_type não atualizado, flow_state corrompido
- Agente não respondendo com dados: knowledge_text não tem a info ou prompt não prioriza respostas diretas
- Mensagens duplicadas: webhook sendo processado 2x
- Erro de chave IA: settings da empresa sem ai_openai_key ou ai_gemini_key

${systemContext}

FORMATO DE RESPOSTA:
Use markdown com emojis para facilitar a leitura. Seja direto e técnico.
Quando analisar imagens, descreva o que vê e identifique o problema.
SEMPRE que possível, inclua os blocos json:apply-fix ou json:code-fix para correção automática.`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("🤖 Admin AI Programmer - Chamando OpenAI GPT-4o");
    console.log("   Mensagens:", messages.length);
    console.log("   Action:", action);
    console.log("   Company:", companyId || "N/A");
    console.log("   Key starts with:", openaiKey.substring(0, 10) + "...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: openaiMessages,
        temperature: 0.3,
        max_tokens: 4000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro OpenAI:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Chave OpenAI inválida. Verifique a configuração da empresa." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Aguarde um momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: `Erro OpenAI: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: any) {
    console.error("❌ Erro admin-ai-programmer:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
