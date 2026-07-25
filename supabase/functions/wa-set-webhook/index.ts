import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  getEvolutionApiKey,
  normalizeEvolutionBaseUrl,
  setEvolutionWebhook,
} from "../_shared/evolution.ts";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    let { instance_id, base_url, token } = body;
    const { connection_id } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (connection_id) {
      const authHeader = req.headers.get("Authorization");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

      const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

      if (!bearerToken || !serviceRoleKey || !anonKey || !supabaseUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: "Sessão inválida para configurar webhook da conexão"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(bearerToken);
      let userId = claimsData?.claims?.sub;

      // Compatibilidade defensiva: se a validação local por claims não estiver disponível
      // para o token atual, revalida no serviço de autenticação usando o mesmo JWT.
      if (claimsError || !userId) {
        const { data: userData, error: userError } = await supabaseUser.auth.getUser(bearerToken);
        if (!userError) {
          userId = userData.user?.id;
        }
      }

      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: "Usuário não autenticado"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      const { data: connection, error: connectionError } = await supabaseAdmin
        .from("connections")
        .select("id, user_id, company_id, instance_id, base_url, token, environment")
        .eq("id", connection_id)
        .maybeSingle();

      if (connectionError || !connection) {
        return new Response(JSON.stringify({
          success: false,
          error: "Conexão WhatsApp não encontrada"
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();

      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin"
      });

      const canManageConnection = Boolean(isAdmin)
        || connection.user_id === userId
        || (connection.company_id && profile?.company_id === connection.company_id);

      if (!canManageConnection) {
        return new Response(JSON.stringify({
          success: false,
          error: "Você não tem permissão para configurar esta conexão"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      instance_id = connection.instance_id;
      token = connection.token;
      base_url = connection.base_url || (connection.environment === "PROD"
        ? "https://app.uazapi.com"
        : "https://free.uazapi.com");
    }

    console.log("=".repeat(80));
    console.log("🔧 CONFIGURANDO WEBHOOK UZAPI → MARKETFLOW");
    console.log("=".repeat(80));
    console.log("📦 Dados recebidos:");
    console.log("  Instance ID:", instance_id);
    console.log("  Base URL:", base_url);
    console.log("  Token:", token ? `${token.substring(0, 8)}...` : "VAZIO");

    if (!instance_id || !base_url || !token) {
      throw new Error("Campos obrigatórios ausentes: instance_id, base_url, token");
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/wa-webhook-listener`;

    console.log("🎯 Webhook URL destino:", webhookUrl);
    console.log("-".repeat(80));

    // Tentar múltiplos endpoints e métodos
    const attempts = [
      { endpoint: "/webhook", method: "POST" },
      { endpoint: "/webhook/set", method: "POST" },
      { endpoint: "/instance/webhook", method: "POST" },
      { endpoint: "/webhook", method: "PUT" },
      { endpoint: "/instance/webhook", method: "PUT" },
    ];

    let lastError = null;
    let lastResponse = null;
    
    for (const { endpoint, method } of attempts) {
      try {
        const fullUrl = `${base_url}${endpoint}`;
        console.log(`🔄 Tentativa: ${method} ${fullUrl}`);
        
        // Corpo da requisição para UZAPI - TODOS OS EVENTOS
        const allEvents = [
          // Mensagens
          "messages",
          "RECEIVE_MESSAGE", 
          "MESSAGE_STATUS",
          "messages.upsert",
          "messages.update",
          "message",
          "message.any",
          // Enquetes/Polls
          "poll",
          "poll.vote",
          "poll_vote",
          "pollUpdate",
          "polls.vote",
          // Conexão
          "connection",
          "connection.update",
          "qrcode",
          "qr",
          // Contatos e Chats
          "contacts.update",
          "contacts.upsert",
          "chats.update",
          "chats.upsert",
          // Grupos
          "groups.update",
          "groups.upsert",
          "group-participants.update",
          // Presença
          "presence.update",
          // Labels
          "labels.edit",
          "labels.association",
          // Status de chamada
          "call"
        ];

        const requestBody = {
          url: webhookUrl,
          webhookURL: webhookUrl,
          webhook: webhookUrl,
          enabled: true,
          events: allEvents,
          allEvents: true,
          on_message: true,
          on_message_received: true,
          on_poll: true,
          on_poll_vote: true,
          webhookByEvents: false,
          webhookBase64: true,
          readMessages: true,
          rejectCall: false,
          msgCall: "",
          groupsIgnore: false,
          alwaysOnline: false,
          readStatus: true,
          syncFullHistory: false
        };

        console.log("📤 Body:", JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(fullUrl, {
          method,
          headers: {
            "Content-Type": "application/json",
            "token": token
          },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log(`📥 Resposta (${response.status}):`, responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { raw: responseText };
        }

        lastResponse = {
          status: response.status,
          ok: response.ok,
          data: result,
          endpoint,
          method
        };

        if (response.ok) {
          // UZAPI pode retornar array
          const webhookData = Array.isArray(result) ? result[0] : result;

          console.log("=".repeat(80));
          console.log("✅ WEBHOOK CONFIGURADO COM SUCESSO!");
          console.log("=".repeat(80));

          if (connection_id) {
            const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            if (serviceRoleKey && supabaseUrl) {
              const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
              await supabaseAdmin
                .from("connections")
                .update({
                  webhook_url: webhookData?.url || webhookData?.webhookURL || webhookData?.webhook || webhookUrl,
                  updated_at: new Date().toISOString()
                })
                .eq("id", connection_id);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            webhookUrl: webhookData?.url || webhookData?.webhookURL || webhookData?.webhook || webhookUrl,
            events: webhookData?.events || ["messages"],
            enabled: webhookData?.enabled !== false,
            method,
            endpoint,
            response: webhookData
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Se recebemos 401 num endpoint válido, o token da instância está inválido/expirado.
        // Não adianta tentar os outros endpoints — parar e pedir reconexão.
        if (response.status === 401) {
          console.log("🚫 Token UAZAPI inválido/expirado — abortando tentativas");
          return new Response(JSON.stringify({
            success: false,
            needsReconnect: true,
            error: "Token da instância WhatsApp inválido ou expirado. Reconecte escaneando o QR Code novamente na aba Conexões.",
            endpoint,
            method
          }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        lastError = `${method} ${endpoint}: HTTP ${response.status} - ${responseText.substring(0, 200)}`;
        console.log(`❌ Falha: ${lastError}`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.log(`❌ Exceção ${method} ${endpoint}:`, errorMsg);
        lastError = `${method} ${endpoint}: ${errorMsg}`;
      }
    }

    console.log("=".repeat(80));
    console.log("❌ TODAS AS TENTATIVAS FALHARAM");
    console.log("Última tentativa:", lastError);
    console.log("=".repeat(80));

    return new Response(JSON.stringify({
      success: false,
      error: "Todas as tentativas falharam",
      lastError,
      lastResponse,
      webhookUrl,
      hint: "Verifique se a URL base está correta e se o token tem permissão para configurar webhooks"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Erro geral:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
