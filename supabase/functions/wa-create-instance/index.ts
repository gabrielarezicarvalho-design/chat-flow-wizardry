import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  extractInstanceApiKey,
  extractPairingCode,
  extractQrBase64,
  getEvolutionApiKey,
  normalizeEvolutionBaseUrl,
  setEvolutionWebhook,
  webhookUrl,
} from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Evolution legacy helpers (kept for BTZAP/PROD/TESTE fallbacks) ----------
async function configureEvolutionWebhook(baseUrl: string, token: string) {
  const url = webhookUrl();
  const body = {
    url,
    webhookURL: url,
    webhook: url,
    enabled: true,
    allEvents: true,
    webhookByEvents: false,
    webhookBase64: true,
  };
  const attempts = [
    { endpoint: "/webhook", method: "POST" },
    { endpoint: "/webhook/set", method: "POST" },
    { endpoint: "/instance/webhook", method: "POST" },
  ];
  for (const { endpoint, method } of attempts) {
    try {
      const r = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(body),
      });
      if (r.ok) return { success: true, webhookUrl: url };
    } catch (_err) { /* ignore */ }
  }
  return { success: false, webhookUrl: url };
}

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const t = value.trim().replace(/\/+$/, "");
  if (!t || t.includes("PLACEHOLDER_VALUE_TO_BE_REPLACED")) return null;
  try {
    const u = new URL(t);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString().replace(/\/+$/, "");
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, phone, environment } = await req.json();
    console.log("📝 Creating instance:", { name, phone, environment });

    if (!name) return json({ error: "Name is required" }, 400);

    const envUpper = (environment ?? "EVOLUTION").toUpperCase();

    // -------- EVOLUTION API (new default) --------
    if (envUpper === "EVOLUTION") {
      const baseUrl = normalizeEvolutionBaseUrl();
      const apiKey = getEvolutionApiKey();
      if (!baseUrl) return json({ error: "EVOLUTION_BASE_URL não configurada." }, 500);
      if (!apiKey) return json({ error: "EVOLUTION_API_KEY não configurada." }, 500);

      const hook = webhookUrl();
      const createRes = await createEvolutionInstance({
        baseUrl,
        apiKey,
        instanceName: name,
        phone,
        webhook: hook,
      });
      console.log("📡 Evolution create response:", createRes.status, createRes.data);

      if (!createRes.ok) {
        return json({
          error: "Failed to create Evolution instance",
          status: createRes.status,
          details: createRes.data,
        }, createRes.status || 500);
      }

      const instanceApiKey = extractInstanceApiKey(createRes.data) ?? apiKey;
      let qrcode = extractQrBase64(createRes.data);
      let paircode = extractPairingCode(createRes.data);

      // Ensure webhook is set (some Evolution versions ignore webhook on create)
      try { await setEvolutionWebhook({ baseUrl, apiKey: instanceApiKey, instanceName: name, url: hook }); }
      catch (_e) { /* non-fatal */ }

      if (!qrcode) {
        const conn = await connectEvolutionInstance({ baseUrl, apiKey: instanceApiKey, instanceName: name, phone });
        console.log("📱 Evolution connect response:", conn.status, conn.data);
        qrcode = extractQrBase64(conn.data) ?? qrcode;
        paircode = extractPairingCode(conn.data) ?? paircode;
      }

      const instanceId = createRes.data?.instance?.instanceId
        ?? createRes.data?.instance?.instanceName
        ?? name;

      return json({
        success: true,
        instance_id: instanceId,
        instance_name: name,
        token: instanceApiKey,
        base_url: baseUrl,
        environment: "EVOLUTION",
        qrcode,
        paircode,
        webhook_configured: true,
      });
    }

    // -------- Legacy paths (PROD / TESTE) --------
    let ADMIN_TOKEN: string | undefined;
    let BASE_URL: string | undefined;
    if (envUpper === "PROD") {
      ADMIN_TOKEN = Deno.env.get("Evolution_ADMIN_TOKEN_PROD");
      BASE_URL = Deno.env.get("Evolution_BASE_URL_PROD");
    } else {
      ADMIN_TOKEN = Deno.env.get("Evolution_ADMIN_TOKEN_TESTE");
      BASE_URL = Deno.env.get("Evolution_BASE_URL_TESTE");
    }

    const normalizedBaseUrl = normalizeBaseUrl(BASE_URL);
    if (!ADMIN_TOKEN?.trim()) return json({ error: "Token admin Evolution não configurado." }, 500);
    if (!normalizedBaseUrl) return json({ error: "URL base da Evolution não configurada." }, 500);

    const response = await fetch(`${normalizedBaseUrl}/instance/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", admintoken: ADMIN_TOKEN },
      body: JSON.stringify({ name, nameInSystem: "marketflow" }),
    });
    const data = await response.json();
    if (!response.ok) return json({ error: "Failed to create instance", details: data }, response.status);

    const instanceId = data?.instance?.id;
    const token = data?.instance?.token;
    if (!instanceId || !token) return json({ error: "Instance data incomplete", details: data }, 500);

    const webhookResult = await configureEvolutionWebhook(normalizedBaseUrl, token);

    const connectRes = await fetch(`${normalizedBaseUrl}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify(phone ? { phone } : {}),
    });
    const connectData = await connectRes.json();

    return json({
      success: true,
      instance_id: instanceId,
      token,
      base_url: normalizedBaseUrl,
      environment: envUpper,
      qrcode: connectData?.instance?.qrcode ?? null,
      paircode: connectData?.instance?.paircode ?? null,
      webhook_configured: webhookResult.success,
    });
  } catch (err) {
    console.error("❌ Error creating instance:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
