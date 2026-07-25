import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  evolutionDeleteInstance,
  getEvolutionApiKey,
  normalizeEvolutionBaseUrl,
} from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, base_url, environment, instance_name, instance_id } =
      await req.json();
    const envUpper = String(environment || "EVOLUTION").toUpperCase();

    // -------- EVOLUTION --------
    if (envUpper === "EVOLUTION") {
      const baseUrl = normalizeEvolutionBaseUrl(base_url);
      const apiKey = (token && String(token).trim()) || getEvolutionApiKey();
      const name = instance_name || instance_id;
      if (!baseUrl || !apiKey) return json({ error: "Evolution não configurado" }, 400);
      if (!name) return json({ error: "instance_name obrigatório" }, 400);

      const res = await evolutionDeleteInstance({
        baseUrl,
        apiKey,
        instanceName: String(name),
      });
      if (!res.ok) {
        const errMsg = JSON.stringify(res.data || {});
        const notFound =
          res.status === 404 ||
          errMsg.includes("not found") ||
          errMsg.includes("does not exist");
        if (notFound) {
          return json({ success: true, message: "Instance already deleted", data: res.data });
        }
        return json(
          { error: "Failed to delete instance", details: res.data },
          res.status || 500,
        );
      }
      return json({ success: true, message: "Instance deleted successfully", data: res.data });
    }

    // -------- Legacy Evolution --------
    if (!token) return json({ error: "Missing instance token" }, 400);
    const BASE_URL = base_url || "https://marketflowchat.uazapi.com";

    const response = await fetch(`${BASE_URL}/instance`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token,
      },
    });

    const responseText = await response.text();
    let result: any;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = response.ok ? { success: true } : { error: responseText };
    }

    if (!response.ok) {
      const msg = result?.error || result?.message || responseText || "";
      const isAlreadyDeleted =
        /record not found|not found|instance not found|Invalid token/i.test(msg) ||
        response.status === 404 ||
        response.status === 401;
      if (isAlreadyDeleted) {
        return json({
          success: true,
          message: "Instance already deleted or not found",
          data: result,
        });
      }
      return json(
        { error: "Failed to delete instance", details: result },
        response.status,
      );
    }
    return json({ success: true, message: "Instance deleted successfully", data: result });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
