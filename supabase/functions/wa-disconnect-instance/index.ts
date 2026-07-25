import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  evoFetch,
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
    const { token, base_url, environment, instance_name, instance_id } = await req.json();
    const envUpper = (environment ?? "EVOLUTION").toUpperCase();

    // -------- EVOLUTION --------
    if (envUpper === "EVOLUTION") {
      const baseUrl = normalizeEvolutionBaseUrl(base_url);
      const apiKey = (token && String(token).trim()) || getEvolutionApiKey();
      if (!baseUrl || !apiKey) {
        return json({ error: "Evolution não configurado" }, 400);
      }
      const name = instance_name || instance_id;
      if (!name) return json({ error: "instance_name obrigatório" }, 400);

      const res = await evoFetch(baseUrl, `/instance/logout/${encodeURIComponent(String(name))}`, apiKey, {
        method: "DELETE",
      });
      if (!res.ok) {
        return json({ error: "Failed to disconnect instance", details: res.data }, res.status || 500);
      }
      return json({ success: true, message: "Instance disconnected successfully", data: res.data });
    }

    // -------- Legacy Evolution --------
    if (!token) return json({ error: "Missing instance token" }, 400);
    const BASE_URL = base_url || "https://marketflowchat.uazapi.com";
    const response = await fetch(`${BASE_URL}/instance/disconnect`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", token },
    });
    const text = await response.text();
    let result: any;
    try { result = text ? JSON.parse(text) : {}; } catch { result = { error: text }; }
    if (!response.ok) {
      return json({ error: "Failed to disconnect instance", details: result }, response.status);
    }
    return json({ success: true, message: "Instance disconnected successfully", data: result });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
