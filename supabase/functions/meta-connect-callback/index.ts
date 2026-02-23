import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

  const url = new URL(req.url);

  // This handles the OAuth redirect from Meta
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorReason = url.searchParams.get("error_reason");

    if (errorReason) {
      // User denied access
      return new Response(generateHTML("error", "Autorização negada pelo usuário."), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!code || !state) {
      return new Response(generateHTML("error", "Parâmetros inválidos."), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // Find the connection by state token
      const { data: conn, error: connErr } = await supabaseAdmin
        .from("whatsapp_connections")
        .select("*")
        .eq("meta_verify_token", state)
        .eq("provider", "meta")
        .maybeSingle();

      if (connErr || !conn) {
        return new Response(generateHTML("error", "Conexão não encontrada. Tente novamente."), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Exchange code for access token
      const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-connect-callback`;
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(callbackUrl)}`;

      const tokenResp = await fetch(tokenUrl);
      const tokenData = await tokenResp.json();

      if (!tokenResp.ok || !tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        return new Response(generateHTML("error", "Falha ao obter token da Meta."), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const accessToken = tokenData.access_token;
      console.log("✅ Access token obtained successfully");

      // Try multiple approaches to find WABA and phone number
      let wabaId = null;
      let phoneNumberId = null;
      let displayPhoneNumber = null;
      let businessId = null;

      // Approach 1: Get shared WABAs via the business integration endpoint
      try {
        const sharedWabasResp = await fetch(
          `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}`,
          { headers: { Authorization: `Bearer ${META_APP_ID}|${META_APP_SECRET}` } }
        );
        const debugData = await sharedWabasResp.json();
        console.log("🔍 Debug token data:", JSON.stringify(debugData));
        
        // Extract granular scopes which contain WABA info
        const granularScopes = debugData?.data?.granular_scopes || [];
        for (const scope of granularScopes) {
          if (scope.scope === "whatsapp_business_management" && scope.target_ids?.length > 0) {
            wabaId = scope.target_ids[0];
            console.log("📱 Found WABA ID from debug token:", wabaId);
          }
        }
      } catch (e) {
        console.error("Debug token approach failed:", e);
      }

      // Approach 2: Try the app's message_whatsapp_business_accounts endpoint
      if (!wabaId) {
        try {
          const assignedWabasResp = await fetch(
            `https://graph.facebook.com/v21.0/${META_APP_ID}/message_whatsapp_business_accounts?access_token=${accessToken}`
          );
          const assignedWabas = await assignedWabasResp.json();
          console.log("📋 Assigned WABAs:", JSON.stringify(assignedWabas));
          
          if (assignedWabas?.data?.length > 0) {
            wabaId = assignedWabas.data[0].id;
          }
        } catch (e) {
          console.error("Assigned WABAs approach failed:", e);
        }
      }

      // Approach 3: Try listing businesses the user manages
      if (!wabaId) {
        try {
          const businessesResp = await fetch(
            `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`
          );
          const businessesData = await businessesResp.json();
          console.log("🏢 Businesses:", JSON.stringify(businessesData));

          if (businessesData?.data?.length > 0) {
            businessId = businessesData.data[0].id;
            
            // Get WABAs owned by this business
            const bizWabasResp = await fetch(
              `https://graph.facebook.com/v21.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
            );
            const bizWabas = await bizWabasResp.json();
            console.log("📱 Business WABAs:", JSON.stringify(bizWabas));
            
            if (bizWabas?.data?.length > 0) {
              wabaId = bizWabas.data[0].id;
            }
          }
        } catch (e) {
          console.error("Business WABAs approach failed:", e);
        }
      }

      // Get user info for business ID
      if (!businessId) {
        try {
          const meResp = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`);
          const meData = await meResp.json();
          businessId = meData?.id || null;
        } catch (e) {
          console.error("Me endpoint failed:", e);
        }
      }

      // If we found a WABA, get phone numbers
      if (wabaId) {
        try {
          const phonesResp = await fetch(
            `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`
          );
          const phonesData = await phonesResp.json();
          console.log("📞 Phone numbers:", JSON.stringify(phonesData));

          if (phonesData?.data?.length > 0) {
            phoneNumberId = phonesData.data[0].id;
            displayPhoneNumber = phonesData.data[0].display_phone_number;
          }
        } catch (e) {
          console.error("Phone numbers fetch failed:", e);
        }
      }

      console.log("📊 Final result - WABA:", wabaId, "Phone:", phoneNumberId, "Business:", businessId);

      // Auto-register webhook on the WABA via Graph API
      if (wabaId) {
        try {
          const webhookCallbackUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

          const subscribeResp = await fetch(
            `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ access_token: accessToken }),
            }
          );
          const subscribeData = await subscribeResp.json();
          console.log("WABA webhook subscription result:", JSON.stringify(subscribeData));

          const { data: appSettings } = await supabaseAdmin
            .from("app_settings")
            .select("whatsapp_verify_token")
            .eq("id", 1)
            .maybeSingle();

          const verifyToken = appSettings?.whatsapp_verify_token || "marketflow_webhook_verify";

          const appWebhookResp = await fetch(
            `https://graph.facebook.com/v21.0/${META_APP_ID}/subscriptions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                object: "whatsapp_business_account",
                callback_url: webhookCallbackUrl,
                verify_token: verifyToken,
                fields: "messages",
                access_token: `${META_APP_ID}|${META_APP_SECRET}`,
              }),
            }
          );
          const appWebhookData = await appWebhookResp.json();
          console.log("App webhook subscription result:", JSON.stringify(appWebhookData));
        } catch (webhookErr) {
          console.error("Error registering webhook:", webhookErr);
        }
      }

      // Update the connection with the obtained data
      const { error: updateErr } = await supabaseAdmin
        .from("whatsapp_connections")
        .update({
          meta_access_token: accessToken,
          meta_waba_id: wabaId,
          meta_phone_number_id: phoneNumberId,
          meta_business_id: businessId,
          meta_connected_at: new Date().toISOString(),
          status: wabaId && phoneNumberId ? "connected" : "error",
          last_error: (!wabaId || !phoneNumberId) ? "WABA ou Phone Number não encontrado. Verifique se a conta foi configurada corretamente no Embedded Signup." : null,
          meta_verify_token: null, // Clear the state token
        })
        .eq("id", conn.id);

      if (updateErr) {
        console.error("Update error:", updateErr);
        return new Response(generateHTML("error", "Erro ao salvar conexão."), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const statusMsg = (wabaId && phoneNumberId)
        ? `Conectado com sucesso! Número: ${displayPhoneNumber || phoneNumberId}`
        : "Conexão parcial. Verifique a configuração no painel.";

      return new Response(generateHTML("success", statusMsg), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      console.error("Callback error:", error);
      return new Response(generateHTML("error", "Erro interno no processamento."), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

function generateHTML(type: "success" | "error", message: string): string {
  const color = type === "success" ? "#10b981" : "#ef4444";
  const icon = type === "success" ? "✅" : "❌";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarketFlow - Conexão Meta</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: white; }
    .card { text-align: center; padding: 3rem; border-radius: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); max-width: 400px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    .msg { color: ${color}; font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
    .hint { color: #94a3b8; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <div class="msg">${message}</div>
    <div class="hint">Você pode fechar esta janela e voltar ao painel.</div>
  </div>
  <script>
    // Notify opener window
    if (window.opener) {
      window.opener.postMessage({ type: 'meta-connect-${type}', message: '${message.replace(/'/g, "\\'")}' }, '*');
      setTimeout(() => window.close(), 3000);
    }
  </script>
</body>
</html>`;
}
