import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone, environment } = await req.json();

    console.log("📝 Creating instance:", { name, phone, environment });

    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Pegar token admin e base url dos secrets baseado no ambiente
    const ADMIN_TOKEN = environment?.toUpperCase() === "PROD"
      ? Deno.env.get("UZAPI_ADMIN_TOKEN_PROD")
      : Deno.env.get("UZAPI_ADMIN_TOKEN_TESTE");

    const BASE_URL = environment?.toUpperCase() === "PROD"
      ? Deno.env.get("UZAPI_BASE_URL_PROD")
      : Deno.env.get("UZAPI_BASE_URL_TESTE");

    console.log("🔑 Using BASE_URL:", BASE_URL);
    console.log("🔑 ADMIN_TOKEN exists:", !!ADMIN_TOKEN);
    console.log("🔑 ADMIN_TOKEN length:", ADMIN_TOKEN?.length || 0);

    if (!ADMIN_TOKEN) {
      console.error("❌ Admin token not found for environment:", environment);
      return new Response(JSON.stringify({ error: "Admin token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fazer POST para /instance/init com o token admin
    const response = await fetch(`${BASE_URL}/instance/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admintoken": ADMIN_TOKEN
      },
      body: JSON.stringify({
        name: name,
        nameInSystem: "marketflow"
      })
    });

    const data = await response.json();
    console.log("📡 UAZAPI response:", data);

    if (!response.ok) {
      console.error("❌ UAZAPI error:", data);
      return new Response(JSON.stringify({
        error: "Failed to create instance",
        status: response.status,
        details: data
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extrair dados da resposta
    const instanceId = data?.instance?.id;
    const token = data?.instance?.token;

    if (!instanceId || !token) {
      console.error("❌ Missing instance data:", data);
      return new Response(JSON.stringify({
        error: "Instance data incomplete",
        details: data
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Agora fazer POST para /instance/connect para gerar o QR code
    const connectBody: any = {};
    if (phone) {
      connectBody.phone = phone;
    }

    const connectResponse = await fetch(`${BASE_URL}/instance/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": token
      },
      body: JSON.stringify(connectBody)
    });

    const connectData = await connectResponse.json();
    console.log("📱 Connect response:", connectData);

    if (!connectResponse.ok) {
      console.error("❌ Connect error:", connectData);
      return new Response(JSON.stringify({
        error: "Failed to generate QR code",
        instance_id: instanceId,
        token: token,
        base_url: BASE_URL
      }), {
        status: connectResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extrair dados corretos da resposta UAZAPI
    const qrcode = connectData?.instance?.qrcode;
    const paircode = connectData?.instance?.paircode;

    console.log("✅ Instance created successfully:", instanceId);

    return new Response(JSON.stringify({
      success: true,
      instance_id: instanceId,
      token: token,
      base_url: BASE_URL,
      qrcode: qrcode,
      paircode: paircode
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Error creating instance:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
