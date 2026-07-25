import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Fetch QR connection for company
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("company_id", company_id)
      .eq("provider", "qr")
      .maybeSingle();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "QR connection not found for this company" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via QR provider (Evolution API pattern)
    const sendUrl = `${conn.qr_api_url}/instances/${conn.qr_instance_id}/messages/text/${conn.qr_api_token}`;
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: to, message: text }),
    });

    const result = await response.json();

    // Save to whatsapp_messages
    await supabaseAdmin.from("whatsapp_messages").insert({
      company_id,
      connection_id: conn.id,
      provider: "qr",
      direction: "out",
      wa_message_id: result?.id || null,
      from_number: conn.qr_instance_id,
      to_number: to,
      body: text,
      status: response.ok ? "sent" : "failed",
      raw: result,
    });

    if (!response.ok) {
      await supabaseAdmin.from("whatsapp_connections")
        .update({ status: "error", last_error: JSON.stringify(result) })
        .eq("id", conn.id);

      return new Response(JSON.stringify({ error: "Failed to send", details: result }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
