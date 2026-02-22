import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
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

    console.log("📥 Webhook GET verification:", { mode, token: token ? "***" : "missing", challenge });

    if (mode === "subscribe" && token && challenge) {
      // Read verify_token from app_settings table
      const { data: settings, error } = await supabaseAdmin
        .from("app_settings")
        .select("whatsapp_verify_token")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("❌ Error reading app_settings:", error.message);
        return new Response("Internal error", { status: 403 });
      }

      const storedToken = settings?.whatsapp_verify_token;

      if (!storedToken) {
        console.error("❌ No verify_token configured in app_settings");
        return new Response("Forbidden", { status: 403 });
      }

      if (token === storedToken) {
        console.log("✅ Webhook verified successfully");
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      console.warn("⚠️ Token mismatch");
    }

    return new Response("Forbidden", { status: 403 });
  }

  // POST: Incoming events from Meta
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("📨 Webhook POST event:", JSON.stringify(body, null, 2));

      // Process incoming messages and statuses
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

      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("❌ Webhook POST error:", error);
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
