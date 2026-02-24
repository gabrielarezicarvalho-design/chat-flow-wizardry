import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorReason = url.searchParams.get("error_reason");

    if (errorReason) {
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
      const { data: connections, error: connErr } = await supabaseAdmin
        .from("connections")
        .select("*")
        .eq("platform", "instagram")
        .eq("status", "connecting")
        .order("created_at", { ascending: false });

      if (connErr) {
        console.error("Connection query error:", connErr);
        return new Response(generateHTML("error", "Erro ao buscar conexão."), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Find the connection with matching state token
      const conn = connections?.find((c: any) => {
        const creds = c.credentials as any;
        return creds?.state_token === state;
      });

      if (!conn) {
        return new Response(generateHTML("error", "Conexão não encontrada. Tente novamente."), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Exchange code for access token
      const callbackUrl = `${SUPABASE_URL}/functions/v1/instagram-connect-callback`;
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
      console.log("✅ Instagram access token obtained");

      // Get user's Facebook pages
      let pageId = null;
      let pageName = null;
      let pageAccessToken = null;
      let instagramAccountId = null;
      let instagramUsername = null;

      try {
        const pagesResp = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
        );
        const pagesData = await pagesResp.json();
        console.log("📄 Pages data:", JSON.stringify(pagesData));

        if (pagesData?.data?.length > 0) {
          // Find first page with Instagram business account
          for (const page of pagesData.data) {
            if (page.instagram_business_account) {
              pageId = page.id;
              pageName = page.name;
              pageAccessToken = page.access_token;
              instagramAccountId = page.instagram_business_account.id;
              break;
            }
          }

          // If no page with Instagram found, use first page
          if (!pageId) {
            pageId = pagesData.data[0].id;
            pageName = pagesData.data[0].name;
            pageAccessToken = pagesData.data[0].access_token;
          }
        }
      } catch (e) {
        console.error("Pages fetch failed:", e);
      }

      // Get Instagram account details if we found one
      if (instagramAccountId) {
        try {
          const igResp = await fetch(
            `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${pageAccessToken || accessToken}`
          );
          const igData = await igResp.json();
          console.log("📸 Instagram data:", JSON.stringify(igData));
          instagramUsername = igData.username || igData.name || null;
        } catch (e) {
          console.error("Instagram details fetch failed:", e);
        }
      }

      console.log("📊 Final - Page:", pageId, "IG Account:", instagramAccountId, "Username:", instagramUsername);

      // Update the connection
      const isConnected = !!(pageId && instagramAccountId);
      const { error: updateErr } = await supabaseAdmin
        .from("connections")
        .update({
          status: isConnected ? "connected" : "error",
          instance_name: instagramUsername ? `@${instagramUsername}` : "Instagram Business",
          phone_number: instagramUsername || null,
          token: pageAccessToken || accessToken,
          credentials: {
            page_id: pageId,
            page_name: pageName,
            page_access_token: pageAccessToken,
            instagram_account_id: instagramAccountId,
            instagram_username: instagramUsername,
            user_access_token: accessToken,
            connected_at: new Date().toISOString(),
          },
        })
        .eq("id", conn.id);

      if (updateErr) {
        console.error("Update error:", updateErr);
        return new Response(generateHTML("error", "Erro ao salvar conexão."), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Subscribe the page to webhooks for Instagram messaging
      if (pageId && pageAccessToken) {
        try {
          const subscribeResp = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscribed_fields: "messages,messaging_postbacks,feed",
                access_token: pageAccessToken,
              }),
            }
          );
          const subscribeData = await subscribeResp.json();
          console.log("📡 Page webhook subscription:", JSON.stringify(subscribeData));
        } catch (e) {
          console.error("Webhook subscription failed:", e);
        }
      }

      const statusMsg = isConnected
        ? `Instagram conectado! ${instagramUsername ? `@${instagramUsername}` : ""} (Página: ${pageName || pageId})`
        : "Conexão parcial. Verifique se a conta Instagram Business está vinculada à sua Página do Facebook.";

      return new Response(generateHTML(isConnected ? "success" : "error", statusMsg), {
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
  const color = type === "success" ? "#E1306C" : "#ef4444";
  const icon = type === "success" ? "📸" : "❌";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MarketFlow - Conexão Instagram</title>
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
    if (window.opener) {
      window.opener.postMessage({ type: 'instagram-connect-${type}', message: '${message.replace(/'/g, "\\'")}' }, '*');
      setTimeout(() => window.close(), 3000);
    }
  </script>
</body>
</html>`;
}
