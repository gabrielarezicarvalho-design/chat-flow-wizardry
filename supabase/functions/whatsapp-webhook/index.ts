import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // ============================================================
  // GET: Meta webhook verification (NÃO ALTERADO)
  // ============================================================
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("📥 Webhook GET verification:", { mode, token: token ? "***" : "missing", challenge });

    if (mode === "subscribe" && token && challenge) {
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

  // ============================================================
  // POST: Incoming events from Meta (multiempresa)
  // ============================================================
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("📨 Webhook POST received");

      const entries = body?.entry || [];

      for (const entry of entries) {
        const changes = entry?.changes || [];

        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const phoneNumberId = value?.metadata?.phone_number_id;
          if (!phoneNumberId) {
            console.warn("⚠️ No phone_number_id in payload, skipping");
            continue;
          }

          // Identify company by phone_number_id
          const { data: conn, error: connError } = await supabaseAdmin
            .from("whatsapp_connections")
            .select("id, company_id")
            .eq("meta_phone_number_id", phoneNumberId)
            .eq("provider", "meta")
            .maybeSingle();

          if (connError) {
            console.error("❌ DB error finding connection:", connError.message);
            continue;
          }

          if (!conn) {
            console.warn(`⚠️ No company found for phone_number_id: ${phoneNumberId}, ignoring`);
            continue;
          }

          const { company_id, id: connectionId } = conn;
          console.log(`✅ Company identified: ${company_id} | Connection: ${connectionId}`);

          // ---- Process incoming messages ----
          const messages = value?.messages || [];
          for (const msg of messages) {
            let content = "";
            const msgType = msg.type || "text";

            if (msgType === "text") {
              content = msg.text?.body || "";
            } else if (msgType === "image") {
              content = msg.image?.caption || "[image]";
            } else if (msgType === "video") {
              content = msg.video?.caption || "[video]";
            } else if (msgType === "audio") {
              content = "[audio]";
            } else if (msgType === "document") {
              content = msg.document?.filename || "[document]";
            } else if (msgType === "location") {
              content = `[location: ${msg.location?.latitude},${msg.location?.longitude}]`;
            } else if (msgType === "contacts") {
              content = "[contacts]";
            } else if (msgType === "sticker") {
              content = "[sticker]";
            } else if (msgType === "reaction") {
              content = msg.reaction?.emoji || "[reaction]";
            } else {
              content = `[${msgType}]`;
            }

            const { error: insertError } = await supabaseAdmin
              .from("whatsapp_messages")
              .insert({
                company_id,
                connection_id: connectionId,
                provider: "meta",
                direction: "in",
                wa_message_id: msg.id,
                from_number: msg.from,
                to_number: phoneNumberId,
                phone_number_id: phoneNumberId,
                message_type: msgType,
                body: content,
                status: "received",
                raw: msg,
              });

            if (insertError) {
              console.error("❌ Error inserting message:", insertError.message);
            } else {
              console.log(`📩 Message saved: ${msg.id} from ${msg.from} (${msgType})`);
            }
          }

          // ---- Process status updates ----
          const statuses = value?.statuses || [];
          for (const st of statuses) {
            const { error: updateError } = await supabaseAdmin
              .from("whatsapp_messages")
              .update({ status: st.status })
              .eq("wa_message_id", st.id)
              .eq("company_id", company_id);

            if (updateError) {
              console.error("❌ Error updating status:", updateError.message);
            } else {
              console.log(`🔄 Status updated: ${st.id} → ${st.status}`);
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("❌ Webhook POST error:", error);
      // Never return 500 to Meta
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
