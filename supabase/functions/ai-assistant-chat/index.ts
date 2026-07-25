import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import {
  isEvolutionConnection,
  resolveEvolutionCreds,
  evolutionSendText,
  evolutionSendMedia,
  evolutionSendAudio,
} from "../_shared/evolution.ts";


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
      model: "google/gemini-3.6-flash",
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

// Parse tool call tags like [[TOOL:name|{"json":"args"}]] from AI response
interface ToolCall { name: string; args: Record<string, any>; raw: string }
function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /\[\[TOOL:([a-z_]+)\|(\{[\s\S]*?\})\]\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      calls.push({ name: match[1], args: JSON.parse(match[2]), raw: match[0] });
    } catch {
      calls.push({ name: match[1], args: {}, raw: match[0] });
    }
  }
  return calls;
}

function stripToolTags(text: string): string {
  return text.replace(/\[\[TOOL:[a-z_]+\|\{[\s\S]*?\}\]\]/gi, "").trim();
}

async function executeToolCall(
  call: ToolCall,
  ctx: {
    supabase: any;
    conversationId: string;
    connectionId: string;
    agentId: string;
    agentUserId: string;
    contactName: string;
    contactPhone: string;
    companyId: string | null;
  }
): Promise<{ result: string; sideEffect?: { transferToHuman?: boolean; ticketId?: string } }> {
  console.log(`🛠️ Executando tool: ${call.name}`, call.args);

  try {
    if (call.name === "transferir_para_humano") {
      const motivo = call.args.motivo || "Solicitação do cliente";
      await ctx.supabase
        .from("conversations")
        .update({ attendance_type: "agent", status: "open" })
        .eq("id", ctx.conversationId);
      return {
        result: `Transferência realizada. Motivo: ${motivo}`,
        sideEffect: { transferToHuman: true },
      };
    }

    if (call.name === "criar_ticket") {
      const motivo = call.args.motivo || "Solicitação de suporte";
      const resumo = call.args.resumo || motivo;
      const prio = String(call.args.prioridade || "media").toLowerCase();
      const dissatisfactionLevel = prio.startsWith("alta") || prio === "high" ? "high"
        : prio.startsWith("baix") || prio === "low" ? "low" : "medium";
      const { data: ticket, error } = await ctx.supabase
        .from("ai_tickets")
        .insert({
          user_id: ctx.agentUserId,
          conversation_id: ctx.conversationId,
          connection_id: ctx.connectionId,
          agent_id: ctx.agentId,
          contact_name: ctx.contactName || "Cliente",
          contact_phone: ctx.contactPhone,
          reason: motivo,
          dissatisfaction_level: dissatisfactionLevel,
          ai_summary: resumo,
          status: "pending",
          priority: dissatisfactionLevel === "high" ? "high" : "normal",
        })
        .select()
        .single();
      if (error) throw error;
      const code = ticket.id.substring(0, 8).toUpperCase();
      return {
        result: `Chamado criado. Protocolo: ${code}. Prioridade: ${dissatisfactionLevel}.`,
        sideEffect: { ticketId: ticket.id },
      };
    }

    if (call.name === "buscar_pedido") {
      const ident = String(call.args.identificador || "").trim() || ctx.contactPhone;
      // Try lead by id, phone, or name match
      let query = ctx.supabase.from("leads").select("id,name,phone,email,status,notes,created_at").limit(1);
      if (/^[0-9a-f-]{8,}$/i.test(ident)) {
        query = query.eq("id", ident);
      } else if (/^\+?\d{6,}$/.test(ident.replace(/\D/g, ""))) {
        query = query.eq("phone", ident.replace(/\D/g, ""));
      } else {
        query = query.ilike("name", `%${ident}%`);
      }
      const { data: lead } = await query.maybeSingle();
      if (!lead) return { result: `Nenhum pedido/lead encontrado para "${ident}".` };
      return {
        result: `Pedido/Lead encontrado:\n- Nome: ${lead.name}\n- Telefone: ${lead.phone || "-"}\n- Email: ${lead.email || "-"}\n- Status: ${lead.status || "-"}\n- Notas: ${lead.notes || "-"}\n- Criado em: ${lead.created_at}`,
      };
    }

    if (call.name === "criar_cobranca_pix") {
      if (!ctx.companyId) return { result: "Erro: empresa não identificada para criar cobrança." };
      const valorRaw = call.args.valor;
      const valor = typeof valorRaw === "number" ? valorRaw : parseFloat(String(valorRaw || "").replace(",", "."));
      if (!valor || valor <= 0) return { result: "Erro: valor inválido. Informe um valor em reais maior que zero." };
      const descricao = String(call.args.descricao || call.args.servico || "Cobrança").slice(0, 200);
      const clienteNome = String(call.args.cliente_nome || ctx.contactName || "Cliente").slice(0, 120);
      const valorOrigem = String(call.args.valor_origem || "").toLowerCase(); // "cliente" | "tabela" | "atendente"
      const confirmado = call.args.confirmado === true || call.args.confirmado === "true";
      const referencia = String(call.args.referencia || call.args.pedido || call.args.servico_ref || "").trim().slice(0, 80);

      // Exige referência (nº do pedido ou nome do serviço) antes de gerar o PIX
      if (!referencia) {
        return {
          result: `AGUARDANDO REFERÊNCIA: peça ao cliente o número do pedido ou o nome do serviço vinculado a este PIX antes de gerar. Exemplo: "Para eu gerar o PIX, me confirma por favor: qual é o número do pedido ou o serviço referente a esta cobrança?". Só chame criar_cobranca_pix novamente incluindo o campo "referencia" com o valor informado pelo cliente.`,
        };
      }

      // Resumo + confirmação final obrigatória antes de gerar o PIX
      if (!confirmado) {
        const vencimento = new Date().toLocaleDateString("pt-BR");
        const identificador = `PIX-${referencia}`.slice(0, 40);
        return {
          result: `AGUARDANDO CONFIRMAÇÃO FINAL: NÃO gere o PIX ainda. Envie ao cliente EXATAMENTE este resumo (mantendo as quebras de linha e o negrito com *):\n\n*Resumo da cobrança*\n• Valor: *R$ ${valor.toFixed(2)}*\n• Descrição: ${descricao}\n• Referência: ${referencia}\n• Vencimento: ${vencimento}\n• Identificador: ${identificador}\n\nPosso gerar o PIX agora? (responda *sim* para confirmar, *corrigir* para ajustar o valor, ou *cancelar*)\n\nREGRAS PÓS-RESUMO: (a) se o cliente confirmar ("sim", "pode gerar", "confirmo", "ok", "isso"), chame criar_cobranca_pix novamente com os MESMOS dados e "confirmado": true. (b) se o cliente informar um NOVO valor ou pedir correção, chame criar_cobranca_pix de novo com o novo valor, "valor_origem":"cliente" e "confirmado":false para reapresentar o resumo. (c) se o cliente disser "não", "cancelar" ou "desistir", NÃO chame a ferramenta e responda "Sem problemas, cancelei a cobrança. Se mudar de ideia é só me avisar. 👍".`,
        };
      }



      // Verifica Mercado Pago
      const { data: mpCfg } = await ctx.supabase
        .from("mercado_pago_configs")
        .select("access_token, auto_send, ondemand_min_valor, ondemand_max_valor")
        .eq("company_id", ctx.companyId)
        .maybeSingle();
      if (!mpCfg?.access_token) {
        return { result: "Erro: Mercado Pago não configurado para esta empresa. Peça para o cliente aguardar um atendente." };
      }

      // Validação de valor mínimo/máximo configurados pela empresa
      const minV = mpCfg.ondemand_min_valor != null ? Number(mpCfg.ondemand_min_valor) : null;
      const maxV = mpCfg.ondemand_max_valor != null ? Number(mpCfg.ondemand_max_valor) : null;
      if (minV != null && minV > 0 && valor < minV) {
        return {
          result: `VALOR ABAIXO DO MÍNIMO: o valor R$ ${valor.toFixed(2)} é menor que o mínimo permitido (R$ ${minV.toFixed(2)}). NÃO gere o PIX. Responda ao cliente: "Esse valor está abaixo do mínimo que consigo gerar (R$ ${minV.toFixed(2)}). Pode me confirmar um valor a partir de R$ ${minV.toFixed(2)}?" e aguarde novo valor antes de chamar criar_cobranca_pix.`,
        };
      }
      if (maxV != null && maxV > 0 && valor > maxV) {
        return {
          result: `VALOR ACIMA DO MÁXIMO: o valor R$ ${valor.toFixed(2)} ultrapassa o máximo permitido (R$ ${maxV.toFixed(2)}). NÃO gere o PIX. Responda ao cliente: "Esse valor está acima do limite que consigo gerar por aqui (R$ ${maxV.toFixed(2)}). Pode me confirmar um valor até R$ ${maxV.toFixed(2)}?" e aguarde novo valor antes de chamar criar_cobranca_pix.`,
        };
      }

      // Cria cobrança
      const today = new Date().toISOString().slice(0, 10);
      const { data: cobranca, error: cErr } = await ctx.supabase
        .from("cobrancas")
        .insert({
          company_id: ctx.companyId,
          user_id: ctx.agentUserId,
          cliente_nome: clienteNome,
          telefone: ctx.contactPhone,
          valor,
          descricao,
          referencia,
          vencimento: today,
          status: "pending",
          recorrencia: "avulsa",
          whatsapp_connection_id: ctx.connectionId,
        })
        .select()
        .single();
      if (cErr || !cobranca) {
        console.error("Erro criando cobrança:", cErr);
        return { result: `Erro ao registrar cobrança: ${cErr?.message || "desconhecido"}` };
      }

      // Gera PIX no Mercado Pago
      try {
        const idempotencyKey = crypto.randomUUID();
        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mpCfg.access_token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            transaction_amount: Number(valor),
            description: descricao,
            payment_method_id: "pix",
            payer: {
              email: `cliente${cobranca.id.slice(0, 8)}@nextpro.com.br`,
              first_name: clienteNome.split(" ")[0] || "Cliente",
            },
          }),
        });
        const mpData = await mpRes.json();
        if (!mpRes.ok) {
          console.error("MP error", mpData);
          return { result: `Erro Mercado Pago: ${mpData?.message || "falha ao gerar PIX"}` };
        }
        const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code_base64;
        const copiaCola = mpData?.point_of_interaction?.transaction_data?.qr_code;
        const ticketUrl = mpData?.point_of_interaction?.transaction_data?.ticket_url;

        await ctx.supabase
          .from("cobrancas")
          .update({
            pix_qr_code: qrCode || null,
            pix_copia_cola: copiaCola || null,
            checkout_url: ticketUrl || null,
            mercado_pago_payment_id: String(mpData?.id || ""),
          })
          .eq("id", cobranca.id);

        // Envia no WhatsApp automaticamente
        let sent = false;
        try {
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { error: sendErr } = await admin.functions.invoke("send-pix-whatsapp", {
            body: { cobrancaId: cobranca.id },
          });
          if (!sendErr) sent = true;
          else console.error("send-pix-whatsapp err:", sendErr);
        } catch (e) {
          console.error("Erro auto-envio:", e);
        }

        return {
          result: sent
            ? `Cobrança PIX de R$ ${valor.toFixed(2)} criada e enviada ao cliente pelo WhatsApp com sucesso. Referência: ${referencia}. Descrição: ${descricao}. Confirme o envio ao cliente citando a referência.`
            : `Cobrança PIX de R$ ${valor.toFixed(2)} criada para a referência ${referencia} (código PIX: ${copiaCola?.slice(0, 40)}...). O envio automático falhou — informe o cliente que um atendente vai encaminhar o PIX.`,
        };
      } catch (e) {
        console.error("Erro gerando PIX:", e);
        return { result: `Erro ao gerar PIX: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    return { result: `Ferramenta desconhecida: ${call.name}` };
  } catch (err) {
    console.error(`❌ Erro executando tool ${call.name}:`, err);
    return { result: `Erro ao executar ${call.name}: ${err instanceof Error ? err.message : String(err)}` };
  }
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
    attempts.push({ provider: "lovable", key: lovableKey, model: "google/gemini-3.6-flash" });
  };

  // Padrão: Lovable AI Gateway (google/gemini-3.6-flash) primeiro; chaves do usuário como plano B.
  addLovableAttempt();

  if (options.preferredProvider === "openai") {
    addAttempt("openai", options.openaiKey, options.agentModel.includes("gpt") ? options.agentModel : "gpt-4o-mini");
    addAttempt("google", options.geminiKey, options.agentModel.includes("gemini") ? options.agentModel : "gemini-2.0-flash");
  } else {
    addAttempt("google", options.geminiKey, options.agentModel.includes("gemini") ? options.agentModel : "gemini-2.0-flash");
    addAttempt("openai", options.openaiKey, options.agentModel.includes("gpt") ? options.agentModel : "gpt-4o-mini");
  }

  addAttempt("openai", fallbackOpenAIKey, "gpt-4o-mini");

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
      connectionInstanceName,
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

    // Fallback global: chave Gemini mestre do site (secret GEMINI_API_KEY_GLOBAL)
    if (!geminiKey) {
      const globalGemini = Deno.env.get("GEMINI_API_KEY_GLOBAL");
      if (globalGemini) geminiKey = globalGemini;
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

    const functionCallingInstructions = `
FERRAMENTAS DISPONÍVEIS (FUNCTION CALLING):
Você pode executar ações reais usando ferramentas. Para chamar uma ferramenta, inclua em QUALQUER lugar da sua resposta uma linha exatamente no formato:
[[TOOL:nome_da_ferramenta|{"chave":"valor"}]]

Use JSON válido nos argumentos. Você pode chamar múltiplas ferramentas na mesma resposta. Depois de invocar uma ferramenta, o sistema executa e (se necessário) devolve o resultado numa próxima rodada.

Ferramentas:

1. transferir_para_humano — Transfere a conversa para um atendente humano.
   Args: {"motivo": "descrição curta"}
   Use quando: cliente pedir humano, estiver frustrado, ou pedido fora do seu escopo.
   Exemplo: [[TOOL:transferir_para_humano|{"motivo":"Cliente pediu falar com vendedor"}]]

2. buscar_pedido — Consulta um pedido/lead pelo protocolo, ID ou telefone do cliente.
   Args: {"identificador": "ID, código ou telefone"} — se vazio usa o telefone do contato atual.
   Use quando: cliente perguntar status, valor, dados ou situação de um pedido/orçamento/lead.
   Exemplo: [[TOOL:buscar_pedido|{"identificador":"12345"}]]
   O resultado voltará como mensagem de sistema para você usar na resposta seguinte.

3. criar_ticket — Abre um chamado de suporte formal.
   Args: {"motivo": "assunto", "resumo": "descrição detalhada", "prioridade": "baixa|media|alta"}
   Use quando: problema complexo, cliente insatisfeito, ou solicitação exige acompanhamento.
   Exemplo: [[TOOL:criar_ticket|{"motivo":"Cobrança indevida","resumo":"Cliente contesta fatura de R$ 200","prioridade":"alta"}]]

4. criar_cobranca_pix — Gera uma cobrança PIX sob demanda e envia o QR Code + copia-e-cola no WhatsApp do próprio cliente automaticamente.
   Args: {"valor": 150.00, "descricao": "Mensalidade novembro", "referencia": "PED-1234 ou nome do serviço", "cliente_nome": "opcional", "valor_origem": "cliente|tabela|atendente", "confirmado": true|false}
   Use quando: cliente pedir para pagar algo, solicitar cobrança, informar valor de serviço, ou aceitar orçamento.

   REGRA DE REFERÊNCIA OBRIGATÓRIA:
   - SEMPRE peça e envie o campo "referencia" — pode ser o número do pedido, código do serviço, nome do serviço contratado ou identificador equivalente. Sem referência o sistema bloqueia a geração.
   - Se o cliente não informou, pergunte antes: "Para eu gerar o PIX, me confirma por favor: qual o número do pedido ou serviço referente a esta cobrança?".

   REGRA DE CONFIRMAÇÃO FINAL OBRIGATÓRIA (para TODOS os PIX sob demanda):
   - SEMPRE chame criar_cobranca_pix a PRIMEIRA vez com "confirmado":false. O sistema retorna um RESUMO (valor, descrição, referência, vencimento, identificador) que você DEVE enviar ao cliente exatamente como recebeu, pedindo confirmação final ("sim / corrigir / cancelar").
   - Só chame novamente com "confirmado":true depois que o cliente responder "sim", "pode gerar", "confirmo", "ok" ou equivalente. Nunca envie o PIX sem essa confirmação explícita.
   - CORREÇÃO DE VALOR: se o cliente informar um novo valor após o resumo ("na verdade é 250", "corrige para 199,90"), chame criar_cobranca_pix DE NOVO com o novo valor, "valor_origem":"cliente" e "confirmado":false para reapresentar o resumo. Repita quantas vezes o cliente corrigir.
   - CANCELAMENTO: se o cliente disser "não", "cancelar", "deixa pra lá", "desistir", NÃO chame a ferramenta. Apenas confirme o cancelamento.
   - Use "valor_origem":"cliente" quando o valor foi digitado pelo cliente, "tabela" quando veio da sua base de preços/plano, e "atendente" quando um humano validou. O resumo é obrigatório em todos os casos.
   - IMPORTANTE: nunca invente valores nem referências. Se não sabe, pergunte.

   Exemplos:
   - Cliente diz "me manda o pix de 150 do pedido 8842" → 1ª chamada: [[TOOL:criar_cobranca_pix|{"valor":150,"descricao":"Pedido 8842","referencia":"PED-8842","valor_origem":"cliente","confirmado":false}]] → envie o resumo retornado e aguarde.
   - Cliente confirmou "sim, pode gerar" → [[TOOL:criar_cobranca_pix|{"valor":150,"descricao":"Pedido 8842","referencia":"PED-8842","valor_origem":"cliente","confirmado":true}]]
   - Cliente corrigiu "na verdade é 250" → [[TOOL:criar_cobranca_pix|{"valor":250,"descricao":"Pedido 8842","referencia":"PED-8842","valor_origem":"cliente","confirmado":false}]] (novo resumo)
   - Mensalidade padrão do plano → 1ª chamada: [[TOOL:criar_cobranca_pix|{"valor":99.90,"descricao":"Mensalidade novembro","referencia":"Plano Mensal","valor_origem":"tabela","confirmado":false}]] → após "sim" do cliente: [[TOOL:criar_cobranca_pix|{"valor":99.90,"descricao":"Mensalidade novembro","referencia":"Plano Mensal","valor_origem":"tabela","confirmado":true}]]
   Após executar, o PIX é enviado automaticamente ao cliente — apenas confirme na mensagem seguinte citando a referência.

REGRAS:
- Chame ferramentas apenas quando fizer sentido; nunca invente dados.
- NÃO escreva a tag [[TOOL:...]] entre aspas ou como exemplo — sempre que aparecer no texto será executada.
- Após buscar_pedido ou criar_cobranca_pix, aguarde o resultado antes de responder ao cliente com os dados.`;

    // ============ RAG: busca semântica na base de conhecimento ============
    let knowledgeContent = "";
    try {
      const lovableKey = extractApiKey(Deno.env.get("LOVABLE_API_KEY"));
      if (lovableKey && message) {
        const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
          body: JSON.stringify({
            model: "openai/text-embedding-3-small",
            input: message.slice(0, 4000),
            dimensions: 1536,
          }),
        });
        if (embRes.ok) {
          const embData = await embRes.json();
          const queryEmbedding = embData.data?.[0]?.embedding;
          if (queryEmbedding) {
            const { data: matches } = await supabase.rpc("match_agent_knowledge", {
              p_agent_id: agentId,
              query_embedding: `[${queryEmbedding.join(",")}]` as any,
              match_count: 5,
              min_similarity: 0.3,
            });
            if (matches && matches.length > 0) {
              knowledgeContent = matches.map((m: any, i: number) => `[Trecho ${i + 1} · relevância ${(m.similarity * 100).toFixed(0)}%]\n${m.content}`).join("\n\n---\n\n");
              console.log(`🔎 RAG: ${matches.length} trechos recuperados`);
            }
          }
        }
      }
    } catch (ragErr) {
      console.error("⚠️ RAG falhou, usando fallback:", ragErr);
    }

    // Fallback: se RAG não retornou nada, usa knowledge_text completo (comportamento antigo)
    if (!knowledgeContent && agent.knowledge_text) {
      knowledgeContent = agent.knowledge_text;
    }

    const knowledgeSection = knowledgeContent ? `

BASE DE CONHECIMENTO (USE ESTAS INFORMAÇÕES PARA RESPONDER):
${knowledgeContent}

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

${functionCallingInstructions}

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

    let ticketCreated = false;
    let transferToHuman = false;
    let ticketId: string | null = null;
    const toolsExecuted: string[] = [];

    // ============ Function Calling: parse & execute tool tags (max 2 rodadas) ============
    for (let round = 0; round < 2; round++) {
      const toolCalls = parseToolCalls(aiResponse);
      if (toolCalls.length === 0) break;

      console.log(`🛠️ ${toolCalls.length} tool call(s) detectado(s) na rodada ${round + 1}`);
      const toolResults: string[] = [];
      let needsFollowUp = false;

      for (const call of toolCalls) {
        const { result, sideEffect } = await executeToolCall(call, {
          supabase,
          conversationId,
          connectionId,
          agentId,
          agentUserId: agent.user_id,
          contactName,
          contactPhone,
          companyId,
        });
        toolsExecuted.push(call.name);
        toolResults.push(`Resultado de ${call.name}: ${result}`);
        if (sideEffect?.transferToHuman) transferToHuman = true;
        if (sideEffect?.ticketId) { ticketCreated = true; ticketId = sideEffect.ticketId; }
        // Tools que retornam dados → nova rodada para a IA usar o resultado
        if (call.name === "buscar_pedido" || call.name === "criar_cobranca_pix") needsFollowUp = true;
      }

      // Remove tags do texto para não vazar ao cliente
      aiResponse = stripToolTags(aiResponse);

      if (!needsFollowUp) break;

      // Nova rodada: passa resultados como system msg e re-chama a IA
      const followUpMessages = [
        ...messages,
        { role: "assistant", content: aiResponse || "(chamando ferramenta)" },
        { role: "system", content: `RESULTADO DAS FERRAMENTAS:\n${toolResults.join("\n\n")}\n\nUse esses dados para responder ao cliente de forma clara e objetiva. NÃO chame buscar_pedido novamente.` },
      ];
      try {
        const followUp = await callBestAvailableAI({
          preferredProvider: selectedProvider,
          agentModel,
          openaiKey,
          geminiKey,
          messages: followUpMessages,
          temperature: agent.temperature || 0.7,
        });
        aiResponse = followUp.response || aiResponse;
      } catch (e) {
        console.error("❌ Falha na rodada de follow-up:", e);
        aiResponse = aiResponse || "Consegui as informações, mas houve um erro ao formatá-las. Um atendente pode ajudar?";
        break;
      }
    }

    if (toolsExecuted.length > 0) {
      console.log("🛠️ Tools executadas:", toolsExecuted.join(", "));
    }

    // Check if AI is requesting escalation or ticket creation (legacy tags)
    const isEscalating = aiResponse.includes("[ESCALAR]") || aiResponse.includes("[TRANSFERIR]");
    const wantsToCreateTicket = aiResponse.includes("{{abrir_chamado}}") || 
                                 aiResponse.includes("{{criar_chamado}}") ||
                                 aiResponse.includes("{{open_ticket}}") ||
                                 aiResponse.toLowerCase().includes("vou abrir um chamado") ||
                                 aiResponse.toLowerCase().includes("abrir chamado de suporte");


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

    // Detect Evolution connection to route sends to Evolution API v2 instead of Evolution.
    const evoConnLike = {
      environment: connectionEnvironment,
      base_url: connectionBaseUrl,
      token: connectionToken,
      instance_name: connectionInstanceName,
    };
    const useEvolution = isEvolutionConnection(evoConnLike as any);
    const evoCreds = useEvolution ? resolveEvolutionCreds(evoConnLike as any) : null;
    if (useEvolution && !evoCreds) {
      console.error("❌ Evolution connection sem base_url/token/instance_name — envio não vai funcionar");
    }
    console.log("   Provider envio:", useEvolution ? "Evolution API v2" : "Evolution");

    // Unified WhatsApp send helpers. Return { ok, status, data }.
    const okShape = (ok: boolean, status = ok ? 200 : 500, data: any = null) => ({ ok, status, data });
    async function sendWaText(text: string) {
      if (useEvolution && evoCreds) {
        return await evolutionSendText({ ...evoCreds, phone: contactPhone, text });
      }
      const r = await fetch(`${BASE_URL}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: connectionToken },
        body: JSON.stringify({ number: contactPhone, text }),
      });
      return okShape(r.ok, r.status, await r.text().catch(() => null));
    }
    async function sendWaMedia(opts: { type: "image" | "video" | "document" | "audio"; file: string; caption?: string; filename?: string; }) {
      if (useEvolution && evoCreds) {
        if (opts.type === "audio") {
          return await evolutionSendAudio({ ...evoCreds, phone: contactPhone, audio: opts.file });
        }
        return await evolutionSendMedia({
          ...evoCreds,
          phone: contactPhone,
          mediaType: opts.type,
          media: opts.file,
          caption: opts.caption,
          fileName: opts.filename,
        });
      }
      const body: any = { number: contactPhone, type: opts.type, file: opts.file };
      if (opts.caption) body.caption = opts.caption;
      if (opts.filename) body.filename = opts.filename;
      const r = await fetch(`${BASE_URL}/send/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: connectionToken },
        body: JSON.stringify(body),
      });
      return okShape(r.ok, r.status, await r.text().catch(() => null));
    }
    async function sendWaInteractive(body: any) {
      if (useEvolution) {
        // Evolution v2 não suporta cta_copy nativamente — cair para texto com o código.
        const fallback = `${body.header ? `*${body.header}*\n\n` : ""}${body.body || ""}${body.copy_code ? `\n\n${body.copy_code}` : ""}`;
        return await sendWaText(fallback);
      }
      const r = await fetch(`${BASE_URL}/send/interactive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: connectionToken },
        body: JSON.stringify({ number: contactPhone, ...body }),
      });
      return okShape(r.ok, r.status, await r.text().catch(() => null));
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
            
            // Send audio via WhatsApp
            const whatsappAudioResponse = await sendWaMedia({ type: "audio", file: audioUrl });

            if (whatsappAudioResponse.ok) {
              console.log("✅ Áudio enviado via WhatsApp");
              audioSent = true;
            } else {
              console.error("❌ Erro ao enviar áudio WhatsApp:", whatsappAudioResponse.data);
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
      const whatsappResponse = await sendWaText(finalAiResponse);
      if (!whatsappResponse.ok) {
        console.error("❌ Erro WhatsApp:", whatsappResponse.data);
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
          
          const pdfResponse = await sendWaMedia({
            type: "document",
            file: invoiceLink,
            filename: `Fatura_${asaasData.customerName.replace(/\s/g, '_')}.pdf`,
            caption: `📄 *Fatura - ${asaasData.customerName}*\n💰 Valor: ${payment.valueFormatted}\n📅 Vencimento: ${payment.dueDateFormatted}`,
          });

          if (pdfResponse.ok) {
            console.log("✅ PDF da fatura enviado");
          } else {
            console.error("❌ Erro ao enviar PDF:", pdfResponse.data);
            // Se falhar o PDF, envia como link
            await sendWaText(`📄 *Sua Fatura*\n\n💰 Valor: ${payment.valueFormatted}\n📅 Vencimento: ${payment.dueDateFormatted}\n\n🔗 Link: ${invoiceLink}`);
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
          
          const boletoResponse = await sendWaText(boletoText);
          if (boletoResponse.ok) {
            console.log("✅ Boleto enviado");
          } else {
            console.error("❌ Erro ao enviar boleto:", boletoResponse.data);
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
          const pixButtonResponse = await sendWaInteractive({
            type: "cta_copy",
            header: "💰 PIX Copia e Cola",
            body: `*Valor:* ${payment.valueFormatted}\n*Vencimento:* ${payment.dueDateFormatted}\n\n_Clique no botão abaixo para copiar o código PIX:_`,
            footer: "Código copiado automaticamente",
            copy_code: asaasData.pixPayload,
            button_text: "📋 Copiar código PIX",
          });
          
          if (pixButtonResponse.ok) {
            console.log("✅ PIX enviado como botão copiável");
          } else {
            console.error("❌ Erro ao enviar PIX botão:", pixButtonResponse.data);
            // Fallback: enviar como texto
            await sendWaText(`💰 *PIX Copia e Cola*\n\n*Valor:* ${payment.valueFormatted}\n*Vencimento:* ${payment.dueDateFormatted}\n\n📋 *Código PIX:*\n\`${asaasData.pixPayload}\``);
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
