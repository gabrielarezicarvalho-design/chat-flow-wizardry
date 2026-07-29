import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireActivePlan } from "../_shared/planGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, to, text } = await req.json();
    if (!company_id || !to || !text) {
      return new Response(JSON.stringify({ error: "Missing company_id, to, or text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Meta connection for company
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("company_id", company_id)
      .eq("provider", "meta")
      .maybeSingle();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Meta connection not found for this company" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Meta Graph API
    const graphUrl = `https://graph.facebook.com/v21.0/${conn.meta_phone_number_id}/messages`;
    const response = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.meta_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });

    const result = await response.json();

    const waMessageId = result?.messages?.[0]?.id || null;

    // Save to whatsapp_messages
    await supabaseAdmin.from("whatsapp_messages").insert({
      company_id,
      connection_id: conn.id,
      provider: "meta",
      direction: "out",
      wa_message_id: waMessageId,
      from_number: conn.meta_phone_number_id,
      to_number: to,
      body: text,
      status: response.ok ? "sent" : "failed",
      raw: result,
    });

    if (!response.ok) {
      // Update connection status
      await supabaseAdmin.from("whatsapp_connections")
        .update({ status: "error", last_error: JSON.stringify(result?.error || result) })
        .eq("id", conn.id);

      return new Response(JSON.stringify({ error: "Failed to send", details: result }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message_id: waMessageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
