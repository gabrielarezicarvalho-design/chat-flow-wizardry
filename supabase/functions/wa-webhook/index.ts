import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Webhooks don't need CORS - they're server-to-server calls
// But we keep minimal headers for compatibility
const responseHeaders = {
  "Content-Type": "application/json"
};

// Validate that webhook request has valid instance_id that exists in our connections
async function validateWebhookSource(
  supabase: any,
  instanceId: string | undefined
): Promise<{ valid: boolean; connection?: any; error?: string }> {
  if (!instanceId) {
    return { valid: false, error: "Missing instance_id in webhook payload" };
  }

  // Check if this instance_id exists in our connections table
  const { data: connection, error } = await supabase
    .from("connections")
    .select("id, user_id, status, token")
    .eq("instance_id", instanceId)
    .maybeSingle();

  if (error) {
    console.error("❌ Error validating connection:", error);
    return { valid: false, error: "Database error validating connection" };
  }

  if (!connection) {
    console.warn(`⚠️ Webhook from unknown instance_id: ${instanceId}`);
    return { valid: false, error: "Unknown instance_id" };
  }

  return { valid: true, connection };
}

// Send message to Telegram
async function sendToTelegram(chatId: string, message: string): Promise<boolean> {
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN não configurado");
    return false;
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown"
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("❌ Erro Telegram:", result);
      return false;
    }

    console.log("✅ Mensagem enviada ao Telegram");
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar para Telegram:", error);
    return false;
  }
}

// Process Telegram notifications for incoming messages
async function processTelegramNotifications(
  supabase: any,
  connectionId: string,
  messageText: string,
  contactPhone: string,
  contactName: string
): Promise<void> {
  console.log("🔔 Verificando configurações de Telegram para connection:", connectionId);

  // Fetch Telegram configurations
  const { data: configs, error } = await supabase
    .from("webhook_field_configs")
    .select("*")
    .eq("is_active", true)
    .eq("telegram_enabled", true);

  if (error) {
    console.error("❌ Erro ao buscar configs Telegram:", error);
    return;
  }

  if (!configs || configs.length === 0) {
    console.log("ℹ️ Nenhuma configuração de Telegram ativa encontrada");
    return;
  }

  console.log(`📋 ${configs.length} configuração(ões) de Telegram encontrada(s)`);

  for (const config of configs) {
    // Check if this config applies to this connection
    if (config.connection_id && config.connection_id !== connectionId) {
      console.log(`⏭️ Config ${config.id} não é para esta conexão`);
      continue;
    }

    const chatId = config.telegram_chat_id;
    if (!chatId) {
      console.log(`⏭️ Config ${config.id} sem chat_id configurado`);
      continue;
    }

    // Check keyword filter
    const keywords: string[] = config.telegram_filter_keywords || [];
    const filterMode = config.telegram_filter_mode || "contains";

    if (keywords.length > 0) {
      const messageLower = messageText.toLowerCase();
      let matches = false;

      if (filterMode === "all") {
        // All keywords must be present
        matches = keywords.every(keyword => 
          messageLower.includes(keyword.toLowerCase())
        );
      } else {
        // At least one keyword must be present (contains mode)
        matches = keywords.some(keyword => 
          messageLower.includes(keyword.toLowerCase())
        );
      }

      if (!matches) {
        console.log(`⏭️ Mensagem não corresponde aos filtros de palavras-chave`);
        continue;
      }

      console.log(`✅ Mensagem corresponde ao filtro (modo: ${filterMode})`);
    }

    // Format message for Telegram
    const now = new Date();
    const formattedTime = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const telegramMessage = `📱 *Nova Mensagem WhatsApp*

👤 *Contato:* ${contactName || "Não identificado"}
📞 *Telefone:* ${contactPhone}
⏰ *Horário:* ${formattedTime}

💬 *Mensagem:*
${messageText}`;

    await sendToTelegram(chatId, telegramMessage);
  }
}

serve(async (req) => {
  // Only accept POST requests for webhooks
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: responseHeaders
    });
  }

  try {
    const webhookData = await req.json();
    
    // Log webhook (truncated for security)
    const logData = { ...webhookData };
    if (logData.message?.text && logData.message.text.length > 100) {
      logData.message.text = logData.message.text.substring(0, 100) + "...";
    }
    console.log("📥 Webhook received:", JSON.stringify(logData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract instance_id from webhook payload
    const instanceId = webhookData.instance_id || webhookData.instanceId;

    // Validate webhook source
    const validation = await validateWebhookSource(supabase, instanceId);
    if (!validation.valid) {
      console.warn(`🚫 Rejected webhook: ${validation.error}`);
      return new Response(JSON.stringify({ 
        success: false,
        error: validation.error
      }), {
        status: 403,
        headers: responseHeaders
      });
    }

    const connectionId = validation.connection?.id;
    console.log(`✅ Webhook validated for connection: ${connectionId}`);

    // Process incoming message and send to Telegram if configured
    if (webhookData.event === "message" || webhookData.type === "message") {
      console.log("📨 Processing message event");
      
      // Extract message details
      const messageData = webhookData.message || webhookData.data || {};
      const messageText = messageData.text || messageData.body || messageData.content || "";
      const contactPhone = messageData.from || messageData.sender || webhookData.from || "";
      const contactName = messageData.pushName || messageData.name || messageData.notifyName || "";
      
      // Only process incoming messages (not sent by us)
      const isIncoming = !messageData.fromMe && messageData.fromMe !== true;
      
      if (isIncoming && messageText && connectionId) {
        console.log(`📩 Mensagem recebida de ${contactPhone}: ${messageText.substring(0, 50)}...`);
        
        // Process Telegram notifications
        await processTelegramNotifications(
          supabase,
          connectionId,
          messageText,
          contactPhone,
          contactName
        );
      }
    }

    // Handle status change
    if (webhookData.event === "status" || webhookData.type === "status") {
      console.log("🔄 Processing status change event");
      
      const status = webhookData.status === "open" ? "connected" : "disconnected";
      
      await supabase
        .from("connections")
        .update({ status })
        .eq("instance_id", instanceId);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processed"
    }), {
      headers: responseHeaders
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: responseHeaders
    });
  }
});
