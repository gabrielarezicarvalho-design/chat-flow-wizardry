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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // GET: Meta webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      // Find company by verify_token
      const { data: conn } = await supabaseAdmin
        .from("whatsapp_connections")
        .select("id, company_id")
        .eq("meta_verify_token", token)
        .eq("provider", "meta")
        .maybeSingle();

      if (conn) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
    }

    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST: Incoming messages/statuses from Meta
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const entries = body?.entry || [];

      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const phoneNumberId = value?.metadata?.phone_number_id;
          if (!phoneNumberId) continue;

          // Find company connection
          const { data: conn } = await supabaseAdmin
            .from("whatsapp_connections")
            .select("id, company_id")
            .eq("meta_phone_number_id", phoneNumberId)
            .eq("provider", "meta")
            .maybeSingle();

          if (!conn) continue;

          // Process incoming messages
          const messages = value?.messages || [];
          for (const msg of messages) {
            await supabaseAdmin.from("whatsapp_messages").insert({
              company_id: conn.company_id,
              connection_id: conn.id,
              provider: "meta",
              direction: "in",
              wa_message_id: msg.id,
              from_number: msg.from,
              to_number: phoneNumberId,
              body: msg.text?.body || msg.type || "",
              status: "delivered",
              raw: msg,
            });
          }

          // Process status updates
          const statuses = value?.statuses || [];
          for (const st of statuses) {
            await supabaseAdmin
              .from("whatsapp_messages")
              .update({ status: st.status })
              .eq("wa_message_id", st.id)
              .eq("company_id", conn.company_id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
