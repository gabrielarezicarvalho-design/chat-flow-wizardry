import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper function to check if current time is within business hours
function isWithinBusinessHours(): boolean {
  const now = new Date();
  // Convert to Brazil timezone (UTC-3)
  const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hours = brazilTime.getHours();
  const day = brazilTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Check if it's a weekday (Monday-Friday) and between 8:00 and 18:00
  const isWeekday = day >= 1 && day <= 5;
  const isWorkingHours = hours >= 8 && hours < 18;
  
  return isWeekday && isWorkingHours;
}

// Helper function to detect CPF/CNPJ in message
function extractCpfCnpj(text: string): string | null {
  // Remove all non-numeric characters for matching
  const cleanText = text.replace(/[^\d]/g, '');
  
  // Check if it looks like a CPF (11 digits) or CNPJ (14 digits)
  if (cleanText.length === 11 || cleanText.length === 14) {
    return cleanText;
  }
  
  // Try to find CPF/CNPJ pattern in original text
  const cpfPattern = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;
  const cnpjPattern = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;
  
  const cpfMatch = text.match(cpfPattern);
  if (cpfMatch) {
    return cpfMatch[0].replace(/[^\d]/g, '');
  }
  
  const cnpjMatch = text.match(cnpjPattern);
  if (cnpjMatch) {
    return cnpjMatch[0].replace(/[^\d]/g, '');
  }
  
  return null;
}

// Helper function to detect payment/invoice related intent
function detectPaymentIntent(text: string): boolean {
  const paymentKeywords = [
    'fatura', 'boleto', 'pix', 'pagamento', 'pagar', 'cobran', 'segunda via',
    '2 via', '2via', 'pendente', 'devendo', 'débito', 'vencido', 'vencimento',
    'invoice', 'payment', 'cobrança', 'valor', 'mensalidade', 'parcela'
  ];
  
  const lowerText = text.toLowerCase();
  return paymentKeywords.some(keyword => lowerText.includes(keyword));
}

// Helper function to build message content with optional media
function buildMessageContent(text: string, mediaUrl?: string, mediaType?: string): any {
  if (!mediaUrl) {
    return text;
  }

  // Build multimodal content array
  const content: any[] = [];
  
  // Add image if present
  if (mediaType === "image" || mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    content.push({
      type: "image_url",
      image_url: { url: mediaUrl }
    });
    content.push({
      type: "text",
      text: text || "Descreva esta imagem detalhadamente."
    });
  } else if (mediaType === "document") {
    // For documents, we add context that it's a document
    content.push({
      type: "text",
      text: `[Documento anexado: ${mediaUrl}]\n\n${text || "Analise este documento."}`
    });
  } else {
    // Default: just text
    content.push({
      type: "text", 
      text: text
    });
  }

  return content;
}

function extractApiKey(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "null" && trimmed !== "__configured__" ? trimmed : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extractApiKey(record.apiKey ?? record.key ?? record.value);
  }

  return String(value).trim() || null;
}

async function callLovableAI(messages: any[], temperature: number) {
  console.log("📤 Chamando Lovable AI Gateway...");

  const apiKey = extractApiKey(Deno.env.get("LOVABLE_API_KEY"));
  if (!apiKey) {
    throw new Error("Lovable AI Gateway não configurado");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      temperature,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro Lovable AI Gateway:", response.status, errorText);
    throw new Error(`Lovable AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// Call OpenAI API (fallback)
async function callOpenAI(apiKey: string, model: string, messages: any[], temperature: number) {
  console.log("📤 Chamando OpenAI API...");
  console.log("   Model:", model);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      temperature,
      max_tokens: 2000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro OpenAI:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function callBestAvailableAI(options: {
  preferredProvider: string;
  agentModel: string;
  openaiKey: string | null;
  geminiKey: string | null;
  messages: any[];
  temperature: number;
}): Promise<{ response: string; provider: string }> {
  const attempts: Array<{ provider: "openai" | "google" | "lovable"; key: string; model: string }> = [];
  const fallbackOpenAIKey = extractApiKey(Deno.env.get("OPENAI_API_KEY"));
  const lovableKey = extractApiKey(Deno.env.get("LOVABLE_API_KEY"));

  const addAttempt = (provider: "openai" | "google", key: string | null, model: string) => {
    if (!key) return;
    if (attempts.some((attempt) => attempt.provider === provider && attempt.key === key)) return;
    attempts.push({ provider, key, model });
  };

  const addLovableAttempt = () => {
    if (!lovableKey) return;
    if (attempts.some((attempt) => attempt.provider === "lovable")) return;
    attempts.push({ provider: "lovable", key: lovableKey, model: "google/gemini-3-flash-preview" });
  };

  if (options.preferredProvider === "openai") {
    addAttempt("openai", options.openaiKey, options.agentModel.includes("gpt") ? options.agentModel : "gpt-4o-mini");
    addAttempt("google", options.geminiKey, options.agentModel.includes("gemini") ? options.agentModel : "gemini-2.0-flash");
  } else {
    addAttempt("google", options.geminiKey, options.agentModel.includes("gemini") ? options.agentModel : "gemini-2.0-flash");
    addAttempt("openai", options.openaiKey, options.agentModel.includes("gpt") ? options.agentModel : "gpt-4o-mini");
  }

  addAttempt("openai", fallbackOpenAIKey, "gpt-4o-mini");
  addLovableAttempt();

  if (attempts.length === 0) {
    throw new Error("Nenhuma chave de IA configurada. Configure OpenAI/Gemini nas configurações ou habilite o Lovable AI Gateway.");
  }

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const response = attempt.provider === "openai"
        ? await callOpenAI(attempt.key, attempt.model, options.messages, options.temperature)
        : attempt.provider === "google"
          ? await callGemini(attempt.key, attempt.model, options.messages, options.temperature)
          : await callLovableAI(options.messages, options.temperature);

      if (response) {
        return { response, provider: attempt.provider };
      }
    } catch (error) {
      lastError = error;
      console.error(`❌ Falha no provider ${attempt.provider}; tentando próximo se disponível:`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha ao chamar provedores de IA");
}

// Call Google Gemini API (fallback)
async function callGemini(apiKey: string, model: string, messages: any[], temperature: number) {
  console.log("📤 Chamando Google Gemini API...");
  console.log("   Model:", model);
  
  // Convert messages to Gemini format
  const contents = messages
    .filter(msg => msg.role !== "system")
    .map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

  // Get system instruction from system message
  const systemMessage = messages.find(msg => msg.role === "system");
  const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

  const geminiModel = model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction,
      generationConfig: {
        temperature,
        maxOutputTokens: 2000
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro Gemini:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      agentId, 
      conversationId,
      contactName,
      contactPhone,
      connectionId,
      connectionToken,
      connectionBaseUrl,
      connectionEnvironment,
      isAudioMessage,
      respondWithAudio,
      // NEW: Support for images and documents
      mediaUrl,
      mediaType, // "image", "video", "document", "audio"
      mediaCaption
    } = await req.json();

    console.log("🤖 AI Assistant Chat");
    console.log("   Agent ID:", agentId);
    console.log("   Message:", message?.substring(0, 50));
    console.log("   Conversation:", conversationId);
    console.log("   Media URL:", mediaUrl ? "Sim" : "Não");
    console.log("   Media Type:", mediaType || "N/A");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do agente
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error("❌ Agente não encontrado:", agentError);
      throw new Error("Agent not found");
    }

    console.log("📋 Agente encontrado:", agent.name);
    console.log("   - Prompt:", agent.system_prompt?.substring(0, 100) || "Padrão");
    console.log("   - Temperature:", agent.temperature);
    console.log("   - Style:", agent.response_style);
    console.log("   - Model:", agent.model);
    console.log("   - Voice enabled:", agent.voice_enabled);
    console.log("   - Voice ID:", agent.voice_id);

    // Get company_id from agent
    let companyId = agent.company_id as string | null;

    if (!companyId && connectionId) {
      const { data: connectionCompany } = await supabase
        .from("connections")
        .select("company_id, user_id")
        .eq("id", connectionId)
        .maybeSingle();

      companyId = connectionCompany?.company_id || null;

      if (!companyId && connectionCompany?.user_id) {
        const { data: connectionOwnerProfile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", connectionCompany.user_id)
          .maybeSingle();

        companyId = connectionOwnerProfile?.company_id || null;
      }
    }

    if (!companyId && agent.user_id) {
      const { data: agentOwnerProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", agent.user_id)
        .maybeSingle();

      companyId = agentOwnerProfile?.company_id || null;
    }

    console.log("🏢 Company ID resolvido:", companyId || "global");

    // Buscar chaves de IA da empresa na tabela settings; se o agente for global/admin,
    // usar as configurações globais (company_id nulo) e por último o secret OPENAI_API_KEY.
    let openaiKey: string | null = null;
    let geminiKey: string | null = null;

    const applyAiSettings = (settings: Array<{ key: string; value: unknown }> | null) => {
      for (const setting of settings ?? []) {
        if (setting.key === "ai_openai_key" && !openaiKey) openaiKey = extractApiKey(setting.value);
        if (setting.key === "ai_gemini_key" && !geminiKey) geminiKey = extractApiKey(setting.value);
      }
    };

    if (companyId) {
      const { data: aiSettings } = await supabase
        .from("settings")
        .select("key, value")
        .eq("company_id", companyId)
        .in("key", ["ai_openai_key", "ai_gemini_key"]);

      applyAiSettings(aiSettings);
    }

    if (!openaiKey && !geminiKey) {
      const { data: globalAiSettings } = await supabase
        .from("settings")
        .select("key, value")
        .is("company_id", null)
        .in("key", ["ai_openai_key", "ai_gemini_key"]);

      applyAiSettings(globalAiSettings);
    }

    console.log("🔑 OpenAI key disponível:", !!openaiKey);
    console.log("🔑 Gemini key disponível:", !!geminiKey);

    // Determine which AI provider to use
    const agentModel = agent.model || "gpt-4o";
    const isOpenAIModel = agentModel.toLowerCase().includes("gpt");
    const isGeminiModel = agentModel.toLowerCase().includes("gemini");
    
    let selectedProvider = "";
    let apiKey: string | null = null;
    
    if (isOpenAIModel && openaiKey) {
      selectedProvider = "openai";
      apiKey = openaiKey;
    } else if (isGeminiModel && geminiKey) {
      selectedProvider = "google";
      apiKey = geminiKey;
    } else if (openaiKey) {
      // Fallback: use whatever key is available
      selectedProvider = "openai";
      apiKey = openaiKey;
    } else if (geminiKey) {
      selectedProvider = "google";
      apiKey = geminiKey;
    }

    if (!apiKey && !Deno.env.get("OPENAI_API_KEY") && !Deno.env.get("LOVABLE_API_KEY")) {
      console.error("❌ Nenhuma chave de IA configurada");
      return new Response(JSON.stringify({ 
        error: "No AI key configured",
        message: "Nenhuma chave de IA configurada. Configure OpenAI/Gemini nas configurações ou habilite o Lovable AI Gateway."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Usando provider preferencial:", selectedProvider || "fallback");

    // Buscar funções do agente
    const { data: agentFunctions } = await supabase
      .from("agent_functions")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_enabled", true);

    // Check for Asaas function - can be "asaas_invoices" type OR "automation_ura" with asaas-related name
    const hasAsaasFunction = agentFunctions?.some(f => 
      f.function_type === "asaas_invoices" || 
      (f.function_type === "automation_ura" && (
        f.name?.toLowerCase().includes("fatura") ||
        f.name?.toLowerCase().includes("boleto") ||
        f.name?.toLowerCase().includes("asaas") ||
        f.name?.toLowerCase().includes("cobranca") ||
        f.name?.toLowerCase().includes("pagamento")
      ))
    );
    console.log("🔧 Funções do agente:", agentFunctions?.length || 0, "| Asaas:", hasAsaasFunction);

    // Check for Asaas integration - detect payment intent and CPF/CNPJ
    let asaasContext = "";
    let asaasData = null;
    
    if (hasAsaasFunction) {
      const hasPaymentIntent = detectPaymentIntent(message);
      const cpfCnpj = extractCpfCnpj(message);
      
      console.log("🏦 Asaas Check - Payment Intent:", hasPaymentIntent, "| CPF/CNPJ:", cpfCnpj);
      
      if (cpfCnpj) {
        // User provided CPF/CNPJ, search in Asaas
        console.log("🔍 Buscando cliente no Asaas por CPF/CNPJ:", cpfCnpj);
        
        try {
          const asaasResponse = await fetch(`${supabaseUrl}/functions/v1/asaas-integration`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              action: "get_customer_invoices",
              userId: agent.user_id,
              cpfCnpj
            })
          });
          
          if (asaasResponse.ok) {
            asaasData = await asaasResponse.json();
            console.log("✅ Resposta Asaas:", JSON.stringify(asaasData).substring(0, 200));
            
            if (asaasData.success) {
              if (asaasData.found && asaasData.hasPayments) {
                // Customer found with pending payments
                asaasContext = `
ATENÇÃO MÁXIMA - RESPONDA APENAS COM TEXTO SIMPLES:
O cliente ${asaasData.customerName} foi encontrado com fatura pendente.

SUA RESPOSTA DEVE SER EXATAMENTE:
"Olá, ${asaasData.customerName}! 👋 Encontrei sua fatura. Estou enviando os dados de pagamento agora..."

PROIBIDO: Não inclua valores, datas, links, PIX, boleto, código de barras ou qualquer dado da fatura.
Os dados serão enviados AUTOMATICAMENTE pelo sistema em mensagens separadas.`;
              } else if (asaasData.found && !asaasData.hasPayments) {
                // Customer found but no pending payments
                asaasContext = `
DADOS DO ASAAS:
- Cliente encontrado: ${asaasData.customerName}
- Status: Sem faturas pendentes

INSTRUÇÃO: Informe ao cliente (chamando pelo nome ${asaasData.customerName}) que não há faturas pendentes e que está tudo em dia.`;
              } else {
                // Customer not found
                asaasContext = `
DADOS DO ASAAS:
- Cliente NÃO encontrado com CPF/CNPJ: ${cpfCnpj}

INSTRUÇÃO: Informe educadamente que não encontrou o cliente com este documento e peça para verificar se o CPF/CNPJ está correto.`;
              }
            }
          }
        } catch (asaasError) {
          console.error("❌ Erro Asaas:", asaasError);
        }
      } else if (hasPaymentIntent) {
        // User wants payment info but didn't provide CPF/CNPJ
        asaasContext = `
INSTRUÇÃO ASAAS OBRIGATÓRIA: O cliente quer informações sobre fatura/boleto/PIX/pagamento mas NÃO informou o CPF ou CNPJ.
Você DEVE pedir o CPF ou CNPJ do cliente para localizar as faturas. NÃO peça nome da empresa.
Responda exatamente assim:
"Olá! 👋 Para localizar sua fatura/boleto, por favor me informe seu *CPF* ou *CNPJ* (apenas os números)."

IMPORTANTE: 
- NÃO invente dados de fatura
- NÃO peça nome da empresa
- Peça APENAS o CPF ou CNPJ
- Aguarde o cliente informar o documento para então buscar os dados reais`;
      }
      
      // Store asaasData for later if we have it
      if (asaasData?.found && asaasData?.hasPayments) {
        // We'll use this later to send buttons and media
        console.log("📦 Dados Asaas armazenados para envio de mídia");
      }
    }

    // Buscar histórico de mensagens da conversa (últimas 20)
    const { data: messageHistory } = await supabase
      .from("messages")
      .select("sender_type, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Construir contexto de mensagens
    const conversationMessages = (messageHistory || []).map(msg => ({
      role: (msg.sender_type === "contact" || msg.sender_type === "customer") ? "user" : "assistant",
      content: msg.content || ""
    }));

    // Adicionar mensagem atual com suporte a mídia (imagem/documento).
    // O webhook já salva a mensagem recebida antes de chamar esta função; evitar duplicar
    // a mesma fala do cliente no contexto da IA.
    const currentMessageText = mediaCaption || message || "";
    const currentMessageContent = buildMessageContent(
      currentMessageText,
      mediaUrl,
      mediaType
    );

    const lastConversationMessage = conversationMessages[conversationMessages.length - 1];
    const currentMessageAlreadyInHistory = !mediaUrl
      && lastConversationMessage?.role === "user"
      && String(lastConversationMessage.content || "").trim() === currentMessageText.trim();

    if (!currentMessageAlreadyInHistory) {
      conversationMessages.push({
        role: "user",
        content: currentMessageContent
      });
    }
    
    // Log para debug de mídia
    if (mediaUrl) {
      console.log("📎 Mensagem com mídia detectada");
      console.log("   Tipo:", mediaType);
      console.log("   URL:", mediaUrl.substring(0, 50) + "...");
    }

    // System prompt com instruções para escalar e abrir chamados
    const baseSystemPrompt = agent.system_prompt || `Você é um assistente virtual amigável chamado ${agent.name}.`;

    const whatsappFormattingRules = `
REGRAS DE FORMATAÇÃO PARA WHATSAPP (OBRIGATÓRIAS):
- As respostas serão enviadas pelo WhatsApp, portanto NUNCA utilize Markdown com títulos (#, ##, ###).
- NUNCA utilize listas com "*" ou "-" para formatação de itens.
- Utilize apenas texto simples, emojis, marcadores "•" e separadores como "━━━━━━━━━━━━━━".
- Use negrito apenas com *texto* quando realmente necessário, pois é o único formato suportado pelo WhatsApp.
- As mensagens devem ficar limpas, organizadas e fáceis de ler.`;
    
    const visionInstructions = `
CAPACIDADES DE VISÃO E DOCUMENTOS:
- Você consegue VER e ANALISAR imagens que os usuários enviam.
- Você consegue LER e INTERPRETAR documentos (PDFs, fotos de documentos, etc).
- Quando receber uma imagem, descreva o que você vê e responda às perguntas sobre ela.
- Quando receber um documento, extraia as informações relevantes e responda às perguntas.
- Se a imagem ou documento não estiver claro, peça ao usuário para enviar novamente.`;

    const escalationInstructions = `
INSTRUÇÕES IMPORTANTES DE ESCALAÇÃO E CHAMADOS:
- Se você não conseguir resolver o problema do cliente após algumas tentativas, ou se o cliente demonstrar insatisfação, você DEVE escalar.
- Para escalar, responda EXATAMENTE com: [ESCALAR] no início da sua mensagem, seguido de um resumo do problema.
- Quando escalar, inclua no formato:
  [ESCALAR]
  MOTIVO: (descreva o motivo da escalação)
  INSATISFACAO: (baixa/media/alta)
  RESUMO: (resumo da conversa e problema)
  
- Se o cliente pedir para falar com um humano ou atendente, escale imediatamente.
- Se o cliente expressar frustração ou raiva, marque insatisfação como "alta".
- Seja empático e avise o cliente que está transferindo para um especialista.

ABRIR CHAMADO AUTOMÁTICO:
- Se estiver FORA do horário comercial e precisar escalar, um chamado será aberto automaticamente.
- Informe ao cliente que o chamado foi registrado e que alguém entrará em contato.`;

    // Include knowledge base if available
    const knowledgeSection = agent.knowledge_text ? `

BASE DE CONHECIMENTO (USE ESTAS INFORMAÇÕES PARA RESPONDER):
${agent.knowledge_text}

REGRAS ABSOLUTAS DA BASE DE CONHECIMENTO:
1. SEMPRE que o cliente fizer uma PERGUNTA (com "?" ou palavras como "qual", "quanto", "quais", "como", etc), você DEVE responder DIRETAMENTE usando as informações da base de conhecimento acima.
2. NUNCA repita a mesma resposta anterior. Se o cliente fez uma nova pergunta, dê uma NOVA resposta relevante.
3. Se a pergunta do cliente tem resposta na base de conhecimento, RESPONDA COM OS DADOS ESPECÍFICOS (valores, planos, preços, detalhes).
4. NÃO repita apresentações comerciais se já foram enviadas. Responda OBJETIVAMENTE o que foi perguntado.
5. Se o cliente perguntou "quais os valores" ou "quanto custa", liste os planos e preços disponíveis na base.
6. Não invente dados. Use exatamente o que está na base.
7. PRIORIDADE: Responder a pergunta do cliente > Seguir fluxo de apresentação.` : "";

    const fullSystemPrompt = `${baseSystemPrompt}
Responda de forma ${agent.response_style === 'formal' ? 'formal e profissional' : agent.response_style === 'casual' ? 'casual e descontraída' : 'amigável e prestativa'}.
Seja conciso e objetivo nas respostas. Responda sempre em português brasileiro.

${whatsappFormattingRules}

${knowledgeSection}

${visionInstructions}

${escalationInstructions}

${asaasContext}`;

    const messages = [
      { role: "system", content: fullSystemPrompt },
      ...conversationMessages
    ];

    console.log("📤 Chamando AI API...");
    console.log("   Provider:", selectedProvider);
    console.log("   Model:", agentModel);
    console.log("   Messages:", conversationMessages.length);
    console.log("   Asaas Context:", asaasContext ? "Sim" : "Não");

    let aiResponse: string;

    // Se temos dados do Asaas com pagamentos, usar resposta fixa (NUNCA chamar IA)
    const hasAsaasPayments = asaasData?.success === true && asaasData?.found === true && asaasData?.hasPayments === true;
    
    if (hasAsaasPayments) {
      console.log("📦 ========================================");
      console.log("📦 USANDO RESPOSTA FIXA PARA ASAAS");
      console.log("📦 Cliente:", asaasData.customerName);
      console.log("📦 Pagamentos:", asaasData.count);
      console.log("📦 ========================================");
      
      // RESPOSTA FIXA - NÃO CHAMA IA
      aiResponse = `Olá, ${asaasData.customerName}! 👋 Encontrei sua fatura. Estou enviando os dados de pagamento agora...`;
    } else {
      // Chamar IA normalmente, com fallback automático entre chave da empresa,
      // chave global e secret OPENAI_API_KEY quando alguma chave estiver inválida/sem cota.
      try {
        const aiResult = await callBestAvailableAI({
          preferredProvider: selectedProvider,
          agentModel,
          openaiKey,
          geminiKey,
          messages,
          temperature: agent.temperature || 0.7,
        });

        aiResponse = aiResult.response;
        selectedProvider = aiResult.provider;
      } catch (apiError) {
        console.error("❌ Erro na API de IA:", apiError);
        const apiErrorMessage = apiError instanceof Error ? apiError.message : "Erro desconhecido";
        
        return new Response(JSON.stringify({ 
          error: "AI API error",
          message: `Erro ao chamar IA: ${apiErrorMessage}. Verifique as chaves da empresa e os créditos do fallback.`
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!aiResponse) {
        throw new Error("No response from AI");
      }
    }

    console.log("✅ Resposta IA:", aiResponse.substring(0, 100));

    // Check if AI is requesting escalation or ticket creation
    const isEscalating = aiResponse.includes("[ESCALAR]") || aiResponse.includes("[TRANSFERIR]");
    const wantsToCreateTicket = aiResponse.includes("{{abrir_chamado}}") || 
                                 aiResponse.includes("{{criar_chamado}}") ||
                                 aiResponse.includes("{{open_ticket}}") ||
                                 aiResponse.toLowerCase().includes("vou abrir um chamado") ||
                                 aiResponse.toLowerCase().includes("abrir chamado de suporte");
    
    let ticketCreated = false;
    let transferToHuman = false;
    let ticketId = null;

    if (isEscalating || wantsToCreateTicket) {
      console.log("⚠️ IA solicitou escalação/chamado");
      console.log("   isEscalating:", isEscalating);
      console.log("   wantsToCreateTicket:", wantsToCreateTicket);
      
      const withinBusinessHours = isWithinBusinessHours();
      console.log("   Horário comercial:", withinBusinessHours);

      // Parse escalation details from AI response
      const motivoMatch = aiResponse.match(/MOTIVO:\s*(.+)/i);
      const insatisfacaoMatch = aiResponse.match(/INSATISFACAO:\s*(\w+)/i);
      const resumoMatch = aiResponse.match(/RESUMO:\s*(.+)/i);

      // Extract reason from context if not explicitly stated
      let motivo = motivoMatch?.[1]?.trim() || "";
      if (!motivo) {
        // Try to extract from message history
        const lastUserMessages = conversationMessages
          .filter(m => m.role === "user")
          .slice(-3)
          .map(m => m.content)
          .join(" ");
        motivo = lastUserMessages.substring(0, 200) || "Solicitação de suporte";
      }
      
      const insatisfacao = insatisfacaoMatch?.[1]?.toLowerCase() || "medium";
      const resumo = resumoMatch?.[1]?.trim() || `Conversa com ${contactName || 'cliente'}. Último assunto: ${message.substring(0, 100)}`;

      // Map insatisfaction level
      const dissatisfactionLevel = 
        insatisfacao.includes("alta") || insatisfacao.includes("high") ? "high" :
        insatisfacao.includes("baixa") || insatisfacao.includes("low") ? "low" : "medium";

      // Create ticket regardless of business hours if explicitly requested
      if (wantsToCreateTicket || !withinBusinessHours) {
        console.log("   Criando chamado IA...");

        // Create the AI ticket
        const { data: ticket, error: ticketError } = await supabase
          .from("ai_tickets")
          .insert({
            user_id: agent.user_id,
            conversation_id: conversationId,
            connection_id: connectionId,
            agent_id: agentId,
            contact_name: contactName || "Cliente",
            contact_phone: contactPhone,
            reason: motivo,
            dissatisfaction_level: dissatisfactionLevel,
            ai_summary: resumo,
            status: "pending",
            priority: dissatisfactionLevel === "high" ? "high" : "normal"
          })
          .select()
          .single();

        if (ticketError) {
          console.error("❌ Erro ao criar chamado:", ticketError);
        } else {
          console.log("✅ Chamado IA criado:", ticket.id);
          ticketCreated = true;
          ticketId = ticket.id;
          
          // Clean up the response - remove ticket placeholders
          aiResponse = aiResponse
            .replace(/\{\{abrir_chamado\}\}/g, '')
            .replace(/\{\{criar_chamado\}\}/g, '')
            .replace(/\{\{open_ticket\}\}/g, '')
            .trim();
          
          // If response is empty or just contains the placeholder, provide a proper message
          if (!aiResponse || aiResponse.length < 20) {
            const ticketCode = ticket.id.substring(0, 8).toUpperCase();
            aiResponse = `✅ Chamado aberto com sucesso!\n\n📋 Protocolo: ${ticketCode}\n\nNossa equipe de suporte entrará em contato em breve para resolver sua questão. Obrigado pela paciência!`;
          }
        }
      } else if (withinBusinessHours && isEscalating) {
        // Within business hours and escalating: transfer to human agent
        transferToHuman = true;
        
        // Clean up the response - remove escalation tags
        aiResponse = "Entendo sua situação. Vou transferir você agora para um de nossos especialistas que poderá te ajudar melhor. Por favor, aguarde um momento. 🙏";
        
        console.log("   Transferindo para atendente humano...");
      }
    }

    // Apply agent signature if configured
    let finalAiResponse = aiResponse;
    if (agent.signature) {
      // Check if response already has signature
      const signaturePattern = new RegExp(`^\\*?${agent.signature}:?\\*?`, 'i');
      if (!signaturePattern.test(aiResponse.trim())) {
        finalAiResponse = `*${agent.signature}:*\n${aiResponse}`;
        console.log("✍️ Assinatura aplicada:", agent.signature);
      }
    }

    // Set WhatsApp base URL
    let BASE_URL = connectionBaseUrl;
    if (!BASE_URL) {
      BASE_URL = connectionEnvironment === "PROD" 
        ? "https://app.uazapi.com" 
        : "https://free.uazapi.com";
    }

    console.log("📤 Enviando via WhatsApp...");
    console.log("   Base URL:", BASE_URL);
    console.log("   Telefone:", contactPhone);
    console.log("   Responder com áudio:", respondWithAudio);

    let audioSent = false;
    let audioUrl = null;

    // If respondWithAudio is true AND agent has voice enabled, generate TTS audio and send it
    const shouldRespondWithAudio = respondWithAudio && agent.voice_enabled !== false && !isEscalating;
    
    if (shouldRespondWithAudio) {
      console.log("🔊 Gerando resposta em áudio...");
      console.log("   Voice ID:", agent.voice_id || "pFZP5JQG7iQjIQuC4Bku");
      
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        
        // Generate TTS audio with agent's voice settings
        const ttsResponse = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            text: aiResponse, // Use raw response without signature for TTS
            voice: agent.voice_id || "pFZP5JQG7iQjIQuC4Bku",
            stability: agent.voice_stability ?? 0.5,
            similarity: agent.voice_similarity ?? 0.75,
            speed: agent.voice_speed ?? 1.0,
            saveToStorage: true,
            userId: agent.user_id
          })
        });

        if (ttsResponse.ok) {
          const ttsData = await ttsResponse.json();
          
          if (ttsData.success && ttsData.audioUrl) {
            audioUrl = ttsData.audioUrl;
            console.log("✅ Áudio TTS gerado:", audioUrl);
            
            // Send audio via WhatsApp using /send/media with type "audio"
            const whatsappAudioResponse = await fetch(`${BASE_URL}/send/media`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "token": connectionToken
              },
              body: JSON.stringify({
                number: contactPhone,
                type: "audio",
                file: audioUrl
              })
            });

            if (whatsappAudioResponse.ok) {
              console.log("✅ Áudio enviado via WhatsApp");
              audioSent = true;
            } else {
              const waAudioError = await whatsappAudioResponse.text();
              console.error("❌ Erro ao enviar áudio WhatsApp:", waAudioError);
            }
          }
        } else {
          console.error("❌ Erro ao gerar TTS:", await ttsResponse.text());
        }
      } catch (ttsError: any) {
        console.error("❌ Erro no TTS:", ttsError.message);
      }
    }

    // Also send text response (or only text if audio failed)
    if (!audioSent || !shouldRespondWithAudio) {
      const whatsappResponse = await fetch(`${BASE_URL}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": connectionToken
        },
        body: JSON.stringify({
          number: contactPhone,
          text: finalAiResponse
        })
      });

      if (!whatsappResponse.ok) {
        const waError = await whatsappResponse.text();
        console.error("❌ Erro WhatsApp:", waError);
      } else {
        console.log("✅ Mensagem texto enviada via WhatsApp");
      }
    }

    // Send Asaas payment data via buttons and media if available
    // Usar mesma condição rigorosa
    if (asaasData?.success === true && asaasData?.found === true && asaasData?.hasPayments === true) {
      console.log("📦 ========================================");
      console.log("📦 ENVIANDO DADOS ASAAS VIA MÍDIA/BOTÕES");
      console.log("📦 Dados Asaas:", JSON.stringify(asaasData).substring(0, 500));
      console.log("📦 ========================================");
      
      const payment = asaasData.firstPayment;
      
      // 1. Enviar PDF da fatura primeiro
      if (payment.invoiceUrl) {
        console.log("📄 Enviando PDF da fatura...");
        try {
          // A URL do Asaas já é o link da fatura - vamos usar direto
          const invoiceLink = payment.invoiceUrl;
          
          const pdfResponse = await fetch(`${BASE_URL}/send/media`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": connectionToken
            },
            body: JSON.stringify({
              number: contactPhone,
              type: "document",
              file: invoiceLink,
              filename: `Fatura_${asaasData.customerName.replace(/\s/g, '_')}.pdf`,
              caption: `📄 *Fatura - ${asaasData.customerName}*\n💰 Valor: ${payment.valueFormatted}\n📅 Vencimento: ${payment.dueDateFormatted}`
            })
          });
          
          if (pdfResponse.ok) {
            console.log("✅ PDF da fatura enviado");
          } else {
            const pdfError = await pdfResponse.text();
            console.error("❌ Erro ao enviar PDF:", pdfError);
            
            // Se falhar o PDF, envia como link
            await fetch(`${BASE_URL}/send/text`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "token": connectionToken
              },
              body: JSON.stringify({
                number: contactPhone,
                text: `📄 *Sua Fatura*\n\n💰 Valor: ${payment.valueFormatted}\n📅 Vencimento: ${payment.dueDateFormatted}\n\n🔗 Link: ${invoiceLink}`
              })
            });
          }
        } catch (pdfError) {
          console.error("❌ Erro PDF:", pdfError);
        }
      }
      
      // 2. Enviar código de barras do boleto (se disponível) - logo abaixo do PDF
      if (payment.bankSlipUrl) {
        console.log("📊 Enviando boleto com código de barras...");
        try {
          // Buscar a linha digitável via API do Asaas
          const identificationFieldUrl = `https://api.asaas.com/v3/payments/${payment.id}/identificationField`;
          
          const { data: asaasKey } = await supabase
            .from("ai_provider_keys")
            .select("api_key")
            .eq("user_id", agent.user_id)
            .eq("provider", "asaas")
            .eq("is_configured", true)
            .single();
            
          let linhaDigitavel = null;
          
          if (asaasKey?.api_key) {
            try {
              const idFieldResponse = await fetch(identificationFieldUrl, {
                headers: { 'access_token': asaasKey.api_key }
              });
              
              if (idFieldResponse.ok) {
                const idFieldData = await idFieldResponse.json();
                linhaDigitavel = idFieldData.identificationField;
                console.log("✅ Linha digitável obtida:", linhaDigitavel?.substring(0, 20) + "...");
              }
            } catch (e) {
              console.error("⚠️ Erro ao buscar linha digitável:", e);
            }
          }
          
          // Montar mensagem do boleto
          let boletoText = `📊 *Boleto Bancário*\n\n`;
          if (linhaDigitavel) {
            boletoText += `📋 *Código de Barras:*\n\`${linhaDigitavel}\`\n\n`;
          }
          boletoText += `🔗 *Link do Boleto:* ${payment.bankSlipUrl}`;
          
          const boletoResponse = await fetch(`${BASE_URL}/send/text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": connectionToken
            },
            body: JSON.stringify({
              number: contactPhone,
              text: boletoText
            })
          });
          
          if (boletoResponse.ok) {
            console.log("✅ Boleto enviado");
          } else {
            console.error("❌ Erro ao enviar boleto:", await boletoResponse.text());
          }
        } catch (boletoError) {
          console.error("❌ Erro boleto:", boletoError);
        }
      }
      
      // 3. Enviar PIX como botão copiável (por último)
      if (asaasData.pixPayload) {
        console.log("📋 Enviando PIX Copia e Cola como botão...");
        console.log("   PIX Payload:", asaasData.pixPayload.substring(0, 50) + "...");
        
        try {
          const pixButtonResponse = await fetch(`${BASE_URL}/send/interactive`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": connectionToken
            },
            body: JSON.stringify({
              number: contactPhone,
              type: "cta_copy",
              header: "💰 PIX Copia e Cola",
              body: `*Valor:* ${payment.valueFormatted}\n*Vencimento:* ${payment.dueDateFormatted}\n\n_Clique no botão abaixo para copiar o código PIX:_`,
              footer: "Código copiado automaticamente",
              copy_code: asaasData.pixPayload,
              button_text: "📋 Copiar código PIX"
            })
          });
          
          if (pixButtonResponse.ok) {
            console.log("✅ PIX enviado como botão copiável");
          } else {
            const pixError = await pixButtonResponse.text();
            console.error("❌ Erro ao enviar PIX botão:", pixError);
            
            // Fallback: enviar como texto
            await fetch(`${BASE_URL}/send/text`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "token": connectionToken
              },
              body: JSON.stringify({
                number: contactPhone,
                text: `💰 *PIX Copia e Cola*\n\n*Valor:* ${payment.valueFormatted}\n*Vencimento:* ${payment.dueDateFormatted}\n\n📋 *Código PIX:*\n\`${asaasData.pixPayload}\``
              })
            });
            console.log("✅ PIX enviado como texto (fallback)");
          }
        } catch (pixError) {
          console.error("❌ Erro PIX:", pixError);
        }
      }
    }

    // Save AI response to database
    const { error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "agent",
        sender_id: agentId,
        content: finalAiResponse,
        message_type: "text",
        status: "sent"
      });

    if (msgError) {
      console.error("⚠️ Erro ao salvar mensagem:", msgError);
    } else {
      console.log("💾 Mensagem salva no banco");
    }

    // If transferring to human, update conversation status
    if (transferToHuman) {
      await supabase
        .from("conversations")
        .update({ 
          status: "waiting",
          assigned_to: null,
          attendance_type: "agent",
          updated_at: new Date().toISOString()
        })
        .eq("id", conversationId);
      
      console.log("✅ Conversa transferida para fila de atendentes");
    }

    // Update agent counters
    await supabase
      .from("agents")
      .update({ 
        conversations_today: (agent.conversations_today || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", agentId);

    return new Response(JSON.stringify({ 
      success: true, 
      response: finalAiResponse,
      agent: agent.name,
      provider: selectedProvider,
      escalated: isEscalating,
      ticketCreated,
      transferredToHuman: transferToHuman,
      audioSent,
      audioUrl
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ai-assistant-chat:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
