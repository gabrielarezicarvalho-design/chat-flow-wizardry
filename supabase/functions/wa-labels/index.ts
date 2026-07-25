import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isEvolutionConnection,
  resolveEvolutionCreds,
  evolutionFindLabels,
  evolutionHandleLabel,
} from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeLabelsPayload = (result: any): any[] => {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    return result.labels || result.data || result.response || Object.values(result);
  }
  return [];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      connectionId,
      token,
      base_url,
      labelName,
      labelColor,
      labelId,
      contactPhone,
      userId,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let connection: any = null;
    let instanceToken = token;
    let baseUrl = base_url || "";
    let ownerId = userId;

    if (connectionId) {
      const { data: conn, error: connError } = await supabase
        .from("connections")
        .select("*")
        .eq("id", connectionId)
        .single();
      if (connError || !conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      connection = conn;
      instanceToken = conn.token;
      baseUrl = conn.base_url || baseUrl;
      ownerId = ownerId || conn.user_id;
    }

    const isEvo = connection ? isEvolutionConnection(connection) : false;
    const evoCreds = isEvo ? resolveEvolutionCreds(connection) : null;

    if (!isEvo && !instanceToken) {
      return new Response(JSON.stringify({ error: "Missing token or connectionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isEvo && !baseUrl) {
      return new Response(JSON.stringify({ error: "Could not determine base_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isEvo && !evoCreds) {
      return new Response(
        JSON.stringify({ error: "Evolution connection missing base_url, token or instance_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- LIST ----------
    if (action === "list") {
      if (isEvo && evoCreds) {
        const r = await evolutionFindLabels(evoCreds);
        return new Response(
          JSON.stringify({ success: r.ok, labels: normalizeLabelsPayload(r.data) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // Legacy UZAPI: try multiple endpoints
      for (const url of [`${baseUrl}/labels`, `${baseUrl}/label/list`, `${baseUrl}/misc/getLabels`]) {
        try {
          const r = await fetch(url, { headers: { Accept: "application/json", token: instanceToken } });
          if (r.ok) {
            const data = await r.json().catch(() => []);
            return new Response(
              JSON.stringify({ success: true, labels: normalizeLabelsPayload(data) }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } catch (_) { /* try next */ }
      }
      return new Response(JSON.stringify({ success: true, labels: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- CREATE ----------
    if (action === "create") {
      if (!labelName) {
        return new Response(JSON.stringify({ error: "Missing labelName" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Evolution API v2 doesn't expose a "create label" endpoint — store locally in tags.
      if (isEvo) {
        if (ownerId) {
          const { error } = await supabase.from("tags").insert({
            user_id: ownerId,
            name: labelName,
            color: typeof labelColor === "string" ? labelColor : "#3b82f6",
          });
          if (!error) {
            return new Response(
              JSON.stringify({ success: true, localOnly: true, message: "Tag salva localmente (Evolution)" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
        return new Response(JSON.stringify({ success: false, error: "Could not save tag" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Legacy UZAPI create
      for (const ep of [
        { url: `${baseUrl}/label/create`, body: { name: labelName, color: labelColor || 1 } },
        { url: `${baseUrl}/misc/createLabel`, body: { name: labelName, labelColor: labelColor || 1 } },
      ]) {
        try {
          const r = await fetch(ep.url, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", token: instanceToken },
            body: JSON.stringify(ep.body),
          });
          const data = await r.json().catch(() => ({}));
          if (r.ok && !data.error) {
            if (ownerId) {
              await supabase.from("tags").upsert(
                { user_id: ownerId, name: labelName, color: typeof labelColor === "string" ? labelColor : "#3b82f6" },
                { onConflict: "user_id,name", ignoreDuplicates: true },
              );
            }
            return new Response(JSON.stringify({ success: true, label: data }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (_) { /* try next */ }
      }
      // Fallback local
      if (ownerId) {
        const { error } = await supabase.from("tags").insert({
          user_id: ownerId,
          name: labelName,
          color: typeof labelColor === "string" ? labelColor : "#3b82f6",
        });
        if (!error) {
          return new Response(JSON.stringify({ success: true, localOnly: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      return new Response(JSON.stringify({ success: false, error: "Could not create label" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- DELETE ----------
    if (action === "delete") {
      if (!labelId) {
        return new Response(JSON.stringify({ error: "Missing labelId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (isEvo) {
        // No native delete in Evolution v2 — remove local tag mirror if present.
        if (ownerId) {
          await supabase.from("tags").delete().eq("user_id", ownerId).eq("id", labelId);
        }
        return new Response(JSON.stringify({ success: true, localOnly: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const ep of [`${baseUrl}/label/delete/${labelId}`, `${baseUrl}/misc/deleteLabel/${labelId}`]) {
        try {
          const r = await fetch(ep, { method: "DELETE", headers: { Accept: "application/json", token: instanceToken } });
          if (r.ok) {
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (_) { /* try next */ }
      }
      return new Response(JSON.stringify({ success: false, error: "Could not delete label" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- ADD label to contact ----------
    if (action === "add_to_contact" || action === "remove_from_contact") {
      if (!contactPhone) {
        return new Response(JSON.stringify({ error: "Missing contactPhone" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const evoAction = action === "add_to_contact" ? "add" : "remove";

      if (isEvo && evoCreds) {
        // Need labelId — try to resolve from labelName by listing.
        let resolvedId = labelId as string | undefined;
        if (!resolvedId && labelName) {
          const list = await evolutionFindLabels(evoCreds);
          const found = normalizeLabelsPayload(list.data).find(
            (l: any) => (l?.name || l?.labelName) === labelName,
          );
          resolvedId = found?.id || found?.labelId;
        }
        if (!resolvedId) {
          return new Response(
            JSON.stringify({ success: false, error: "Label não encontrada no Evolution. Crie na interface do WhatsApp primeiro." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const r = await evolutionHandleLabel({
          ...evoCreds,
          phone: contactPhone,
          labelId: resolvedId,
          action: evoAction,
        });
        return new Response(JSON.stringify({ success: r.ok, data: r.data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Legacy UZAPI: keep prior behaviour (name-based)
      const r = await fetch(`${baseUrl}/label/addChat`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", token: instanceToken },
        body: JSON.stringify({
          number: String(contactPhone).replace(/\D/g, ""),
          labelId: labelId || undefined,
          labelName: labelName || undefined,
          action: evoAction,
        }),
      });
      return new Response(JSON.stringify({ success: r.ok, data: await r.json().catch(() => ({})) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use list, create, delete, add_to_contact, remove_from_contact" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[wa-labels] error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
