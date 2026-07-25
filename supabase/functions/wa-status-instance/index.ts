import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  evolutionConnectionState,
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
    const { token, environment, base_url, instance_name, instance_id } = await req.json();
    const envUpper = (environment ?? "EVOLUTION").toUpperCase();

    // -------- EVOLUTION --------
    if (envUpper === "EVOLUTION") {
      const baseUrl = normalizeEvolutionBaseUrl(base_url);
      const apiKey = (token && String(token).trim()) || getEvolutionApiKey();
      if (!baseUrl || !apiKey) {
        return json({ success: false, connected: false, status: "unconfigured", error: "Evolution não configurado" });
      }
      const name = instance_name || instance_id || token;
      if (!name) return json({ success: false, connected: false, status: "unknown", error: "instance_name obrigatório" }, 400);

      const res = await evolutionConnectionState({ baseUrl, apiKey, instanceName: String(name) });
      if (!res.ok) {
        const isDeleted = res.status === 404;
        return json({
          success: false,
          connected: false,
          instanceDeleted: isDeleted,
          status: isDeleted ? "deleted" : "unreachable",
          error: "Evolution status error",
          details: res.data,
        });
      }
      const state = res.data?.instance?.state ?? res.data?.state ?? "unknown";
      const connected = state === "open";
      return json({
        success: true,
        connected,
        status: connected ? "connected" : state,
        message: connected ? "Instância conectada com sucesso!" : "Aguardando conexão...",
      });
    }

    // -------- Legacy Evolution --------
    if (!token || String(token).trim() === "") {
      return json({ success: false, error: "Token da instância ausente ou inválido" }, 400);
    }
    let BASE_URL = base_url;
    if (!BASE_URL) {
      if (envUpper === "PROD") BASE_URL = Deno.env.get("Evolution_BASE_URL_PROD");
      else BASE_URL = Deno.env.get("Evolution_BASE_URL_TESTE");
    }
    if (!BASE_URL) return json({ success: false, error: "BASE_URL not configured" }, 500);

    const response = await fetch(`${BASE_URL}/instance/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json", token },
    });
    const responseText = await response.text();
    let result: any;
    try { result = JSON.parse(responseText); } catch {
      return json({ success: false, connected: false, status: "unreachable", error: "Evolution server returned non-JSON response", upstreamStatus: response.status });
    }
    if (!response.ok) {
      const errorMessage = (result?.error || "").toLowerCase();
      const instanceDeleted = response.status === 500 &&
        (errorMessage.includes("instance details") || errorMessage.includes("instance not found") || errorMessage.includes("not found"));
      return json({ success: false, connected: false, instanceDeleted, error: "Failed to fetch instance status", details: result, originalStatus: response.status });
    }
    const status = result?.instance?.status || "unknown";
    const connected = status === "connected";
    return json({
      success: true,
      connected,
      status,
      message: connected ? "Instância conectada com sucesso!" : "Aguardando conexão...",
    });
  } catch (err) {
    console.error("Error checking instance status:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
