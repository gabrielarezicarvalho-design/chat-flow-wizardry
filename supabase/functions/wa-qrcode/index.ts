import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  connectEvolutionInstance,
  extractPairingCode,
  extractQrBase64,
  getEvolutionApiKey,
  normalizeEvolutionBaseUrl,
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, environment, phone, base_url, instance_name, instance_id } = await req.json();
    const envUpper = (environment ?? "EVOLUTION").toUpperCase();

    // -------- EVOLUTION --------
    if (envUpper === "EVOLUTION") {
      const baseUrl = normalizeEvolutionBaseUrl(base_url);
      const apiKey = (token && String(token).trim()) || getEvolutionApiKey();
      const name = instance_name || instance_id || token;
      if (!baseUrl || !apiKey) return json({ error: "Evolution não configurado" }, 500);
      if (!name) return json({ error: "instance_name obrigatório" }, 400);

      const res = await connectEvolutionInstance({ baseUrl, apiKey, instanceName: String(name), phone });
      if (!res.ok) {
        return json({ error: "Failed to fetch QR code", status: res.status, details: res.data }, res.status || 500);
      }
      return json({
        success: true,
        qrcode: extractQrBase64(res.data),
        paircode: extractPairingCode(res.data),
      });
    }

    // -------- Legacy UAZAPI --------
    if (!token) return json({ error: "Missing instance token" }, 400);

    let BASE_URL = base_url;
    if (!BASE_URL) {
      BASE_URL = envUpper === "PROD" ? "https://app.uazapi.com" : "https://free.uazapi.com";
    }

    const body = phone ? JSON.stringify({ phone }) : JSON.stringify({});
    const response = await fetch(`${BASE_URL}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body,
    });
    const responseText = await response.text();
    let data: any;
    try { data = responseText ? JSON.parse(responseText) : {}; } catch {
      return json({ error: "Invalid response from UZAPI", details: responseText.substring(0, 200) }, 500);
    }
    if (!response.ok) {
      return json({ error: "Failed to fetch QR code", status: response.status, details: data }, response.status);
    }
    return json({
      success: true,
      qrcode: data?.instance?.qrcode ?? null,
      paircode: data?.instance?.paircode ?? null,
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
