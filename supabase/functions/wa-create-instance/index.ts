import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

async function configureWebhook(baseUrl: string, token: string) {
  const webhookUrl = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/wa-webhook-listener`;
  console.log("🔧 Auto-configuring webhook to:", webhookUrl);

  const allEvents = [
    "messages", "RECEIVE_MESSAGE", "MESSAGE_STATUS",
    "messages.upsert", "messages.update", "message", "message.any",
    "poll", "poll.vote", "poll_vote", "pollUpdate", "polls.vote",
    "connection", "connection.update", "qrcode", "qr",
    "contacts.update", "contacts.upsert", "chats.update", "chats.upsert",
    "groups.update", "groups.upsert", "group-participants.update",
    "presence.update", "labels.edit", "labels.association", "call"
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

  const attempts = [
    { endpoint: "/webhook", method: "POST" },
    { endpoint: "/webhook/set", method: "POST" },
    { endpoint: "/instance/webhook", method: "POST" },
    { endpoint: "/webhook", method: "PUT" },
    { endpoint: "/instance/webhook", method: "PUT" },
  ];

  for (const { endpoint, method } of attempts) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json", "token": token },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Webhook configured via ${method} ${endpoint}`);
        return { success: true, webhookUrl, method, endpoint };
      }
      console.log(`❌ ${method} ${endpoint}: HTTP ${response.status}`);
    } catch (err) {
      console.log(`❌ ${method} ${endpoint}: ${err}`);
    }
  }

  console.log("⚠️ All webhook config attempts failed");
  return { success: false };
}

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;

  const trimmedValue = value.trim().replace(/\/+$/, "");

  if (!trimmedValue || trimmedValue.includes("PLACEHOLDER_VALUE_TO_BE_REPLACED")) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
    return parsedUrl.toString().replace(/\/+$/, "");
  } catch (_error) {
    return null;
  }
}

function isConfiguredSecret(value: string | undefined): value is string {
  return Boolean(value?.trim()) && !value!.includes("PLACEHOLDER_VALUE_TO_BE_REPLACED");
}

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

    const ADMIN_TOKEN = environment?.toUpperCase() === "PROD"
      ? Deno.env.get("UZAPI_ADMIN_TOKEN_PROD")
      : Deno.env.get("UZAPI_ADMIN_TOKEN_TESTE");

    const BASE_URL = environment?.toUpperCase() === "PROD"
      ? Deno.env.get("UZAPI_BASE_URL_PROD")
      : Deno.env.get("UZAPI_BASE_URL_TESTE");

    const normalizedBaseUrl = normalizeBaseUrl(BASE_URL);

    if (!isConfiguredSecret(ADMIN_TOKEN)) {
      return new Response(JSON.stringify({ error: "Token admin da UAZAPI não configurado para este ambiente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!normalizedBaseUrl) {
      return new Response(JSON.stringify({ error: "URL base da UAZAPI não configurada para este ambiente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create instance
    const response = await fetch(`${normalizedBaseUrl}/instance/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "admintoken": ADMIN_TOKEN },
      body: JSON.stringify({ name, nameInSystem: "marketflow" })
    });

    const data = await response.json();
    console.log("📡 UAZAPI response:", data);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to create instance", status: response.status, details: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const instanceId = data?.instance?.id;
    const token = data?.instance?.token;

    if (!instanceId || !token) {
      return new Response(JSON.stringify({ error: "Instance data incomplete", details: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Auto-configure webhook immediately after instance creation
    const webhookResult = await configureWebhook(normalizedBaseUrl, token);
    console.log("🔧 Webhook auto-config result:", webhookResult);

    // Connect to generate QR code
    const connectBody: any = {};
    if (phone) connectBody.phone = phone;

    const connectResponse = await fetch(`${normalizedBaseUrl}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "token": token },
      body: JSON.stringify(connectBody)
    });

    const connectData = await connectResponse.json();
    console.log("📱 Connect response:", connectData);

    if (!connectResponse.ok) {
      return new Response(JSON.stringify({
        success: true,
        instance_id: instanceId,
        token,
        base_url: normalizedBaseUrl,
        qrcode: null,
        paircode: null,
        webhook_configured: webhookResult.success,
        connect_error: connectData?.error || "Failed to generate QR code"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const qrcode = connectData?.instance?.qrcode;
    const paircode = connectData?.instance?.paircode;
    console.log("✅ Instance created successfully:", instanceId);

    return new Response(JSON.stringify({
      success: true,
      instance_id: instanceId,
      token,
      base_url: normalizedBaseUrl,
      qrcode,
      paircode,
      webhook_configured: webhookResult.success
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Error creating instance:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
