import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  evolutionListInstances,
  getEvolutionApiKey,
  normalizeEvolutionBaseUrl,
  normalizeEvolutionInstance,
} from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { environment, base_url } = body ?? {};
    const envUpper = String(environment || "EVOLUTION").toUpperCase();

    let providerLabel = "EVOLUTION";
    let remoteInstances: Array<ReturnType<typeof normalizeEvolutionInstance>> = [];
    let BASE_URL = "";

    if (envUpper === "EVOLUTION") {
      const baseUrl = normalizeEvolutionBaseUrl(base_url);
      const apiKey = getEvolutionApiKey();
      if (!baseUrl || !apiKey) {
        return new Response(
          JSON.stringify({ error: "Evolution não configurado (EVOLUTION_BASE_URL/EVOLUTION_API_KEY)" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      BASE_URL = baseUrl;
      const res = await evolutionListInstances({ baseUrl, apiKey });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to list Evolution instances", details: res.data }),
          { status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const arr = Array.isArray(res.data) ? res.data : res.data?.instances ?? [];
      remoteInstances = arr.map(normalizeEvolutionInstance).filter((i: any) => i.id);
    } else {
      // Legacy Evolution environments
      providerLabel = envUpper;
      let ADMIN_TOKEN: string | undefined;
      if (envUpper === "PROD") {
        ADMIN_TOKEN = Deno.env.get("Evolution_ADMIN_TOKEN_PROD");
        BASE_URL = Deno.env.get("Evolution_BASE_URL_PROD") || "";
      } else if (envUpper === "TESTE") {
      } else if (envUpper === "PROD") {
        ADMIN_TOKEN = Deno.env.get("Evolution_ADMIN_TOKEN_PROD");
        BASE_URL = Deno.env.get("Evolution_BASE_URL_PROD") || "";
      } else {
        ADMIN_TOKEN = Deno.env.get("Evolution_ADMIN_TOKEN_TESTE");
        BASE_URL = Deno.env.get("Evolution_BASE_URL_TESTE") || "";
      }
      if (!ADMIN_TOKEN || !BASE_URL) {
        return new Response(
          JSON.stringify({ error: "Configuration not found for environment", environment }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const endpoints = ["/instance/all", "/instances", "/admin/instances"];
      let uazData: any = null;
      let lastStatus = 0;
      for (const ep of endpoints) {
        const r = await fetch(`${BASE_URL}${ep}`, {
          headers: { Accept: "application/json", admintoken: ADMIN_TOKEN },
        });
        lastStatus = r.status;
        if (r.ok) { uazData = await r.json(); break; }
      }
      if (!uazData) {
        return new Response(
          JSON.stringify({ error: "Failed to list Evolution instances", status: lastStatus }),
          { status: lastStatus || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const arr = uazData?.instances || uazData || [];
      remoteInstances = arr.map((i: any) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        connected: i.status === "connected",
        token: i.token,
        owner: i.owner || i.profileName || null,
        created: i.created || null,
      }));
    }

    // Compare with local DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: dbConnections, error: dbError } = await supabase
      .from("connections")
      .select("id, instance_id, instance_name, status, phone_number, created_at, environment");

    if (dbError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch connections from database", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dbForEnv = (dbConnections || []).filter((c: any) =>
      envUpper === "EVOLUTION"
        ? String(c.environment || "").toUpperCase() === "EVOLUTION" || !c.environment
        : String(c.environment || "").toUpperCase() === envUpper,
    );

    const remoteIds = new Set(remoteInstances.map((i) => i.id));
    const remoteNames = new Set(remoteInstances.map((i) => i.name));
    const matches = (c: any) =>
      (c.instance_id && remoteIds.has(c.instance_id)) ||
      (c.instance_name && remoteNames.has(c.instance_name));

    const onlyInRemote = remoteInstances
      .filter((i) => !dbForEnv.some((c: any) => c.instance_id === i.id || c.instance_name === i.name))
      .map((i) => ({ ...i, can_delete: true }));

    const onlyInDb = dbForEnv.filter((c: any) => !matches(c)).map((c: any) => ({
      db_id: c.id,
      instance_id: c.instance_id,
      instance_name: c.instance_name,
      status: c.status,
      can_cleanup: true,
    }));

    const synced = dbForEnv.filter(matches).map((c: any) => {
      const r =
        remoteInstances.find((i) => i.id === c.instance_id) ||
        remoteInstances.find((i) => i.name === c.instance_name);
      return {
        db_id: c.id,
        instance_id: c.instance_id,
        instance_name: c.instance_name,
        db_status: c.status,
        remote_status: r?.status || "unknown",
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        provider: providerLabel,
        environment: envUpper,
        base_url: BASE_URL,
        summary: {
          total_remote: remoteInstances.length,
          total_db: dbForEnv.length,
          synced: synced.length,
          only_in_remote: onlyInRemote.length,
          only_in_db: onlyInDb.length,
          // Backwards-compat aliases for existing UI
          total_remote: remoteInstances.length,
          only_in_remote: onlyInRemote.length,
        },
        remote_instances: remoteInstances,
        evolution_instances: remoteInstances,
        only_in_remote: onlyInRemote,
        only_in_remote: onlyInRemote,
        only_in_db: onlyInDb,
        synced,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
