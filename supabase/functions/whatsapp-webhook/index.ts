import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // ============================================================
  // GET: Meta webhook verification
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
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
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

          // Find a user_id associated with this company (for conversation ownership)
          let userId: string | null = null;
          const { data: companyProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("company_id", company_id)
            .limit(1)
            .maybeSingle();
          
          if (companyProfile) {
            userId = companyProfile.id;
          }

          // Get contact info from Meta payload
          const contacts = value?.contacts || [];
          const contactInfo = contacts[0] || {};
          const contactName = contactInfo?.profile?.name || null;

          // ---- Process incoming messages ----
          const messages = value?.messages || [];
          for (const msg of messages) {
            let content = "";
            const msgType = msg.type || "text";

            if (msgType === "text") {
              content = msg.text?.body || "";
            } else if (msgType === "image") {
              content = msg.image?.caption || "[Imagem recebida]";
            } else if (msgType === "video") {
              content = msg.video?.caption || "[Vídeo recebido]";
            } else if (msgType === "audio") {
              content = "[Áudio recebido]";
            } else if (msgType === "document") {
              content = msg.document?.filename || "[Documento recebido]";
            } else if (msgType === "location") {
              content = `[Localização: ${msg.location?.latitude},${msg.location?.longitude}]`;
            } else if (msgType === "contacts") {
              content = "[Contato recebido]";
            } else if (msgType === "sticker") {
              content = "[Figurinha recebida]";
            } else if (msgType === "reaction") {
              content = msg.reaction?.emoji || "[Reação]";
            } else {
              content = `[${msgType}]`;
            }

            const fromNumber = msg.from || "";
            const cleanPhone = fromNumber.replace(/\D/g, "");

            // 1. Save to whatsapp_messages (raw log)
            const { error: insertError } = await supabaseAdmin
              .from("whatsapp_messages")
              .insert({
                company_id,
                connection_id: connectionId,
                provider: "meta",
                direction: "in",
                wa_message_id: msg.id,
                from_number: fromNumber,
                to_number: phoneNumberId,
                phone_number_id: phoneNumberId,
                message_type: msgType,
                body: content,
                status: "received",
                raw: msg,
              });

            if (insertError) {
              console.error("❌ Error inserting whatsapp_message:", insertError.message);
            } else {
              console.log(`📩 WhatsApp message saved: ${msg.id} from ${fromNumber} (${msgType})`);
            }

            // 2. Create or update conversation in conversations table
            if (userId && cleanPhone) {
              try {
                // Find existing open conversation
                const { data: existingConv } = await supabaseAdmin
                  .from("conversations")
                  .select("id, status")
                  .eq("contact_phone", cleanPhone)
                  .eq("company_id", company_id)
                  .not("status", "eq", "closed")
                  .order("updated_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                let conversationId: string;

                if (existingConv) {
                  conversationId = existingConv.id;
                  // Update existing conversation
                  await supabaseAdmin
                    .from("conversations")
                    .update({
                      last_message: content,
                      last_message_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      unread_count: 1, // Increment would be better but this works
                    })
                    .eq("id", conversationId);
                  console.log(`💬 Conversation updated: ${conversationId}`);
                } else {
                  // Create new conversation
                  const { data: newConv, error: convError } = await supabaseAdmin
                    .from("conversations")
                    .insert({
                      user_id: userId,
                      company_id,
                      connection_id: connectionId,
                      contact_phone: cleanPhone,
                      contact_name: contactName || cleanPhone,
                      status: "open",
                      attendance_type: "ura",
                      last_message: content,
                      last_message_at: new Date().toISOString(),
                      unread_count: 1,
                    })
                    .select("id")
                    .single();

                  if (convError) {
                    console.error("❌ Error creating conversation:", convError.message);
                    continue;
                  }
                  conversationId = newConv.id;
                  console.log(`💬 New conversation created: ${conversationId}`);
                }

                // 3. Insert message into messages table (for chat UI)
                const { error: msgError } = await supabaseAdmin
                  .from("messages")
                  .insert({
                    conversation_id: conversationId,
                    sender_type: "customer",
                    content: content,
                    message_type: msgType,
                    status: "received",
                    external_id: msg.id,
                  });

                if (msgError) {
                  console.error("❌ Error inserting message:", msgError.message);
                } else {
                  console.log(`📝 Message saved to conversation: ${conversationId}`);
                }

                // 4. Auto-save contact as lead
                const { data: existingLead } = await supabaseAdmin
                  .from("leads")
                  .select("id")
                  .eq("phone", cleanPhone)
                  .eq("user_id", userId)
                  .maybeSingle();

                if (!existingLead) {
                  await supabaseAdmin
                    .from("leads")
                    .insert({
                      user_id: userId,
                      phone: cleanPhone,
                      name: contactName || cleanPhone,
                      source: "WhatsApp Meta",
                      status: "warm",
                    });
                  console.log(`📇 Lead created for ${cleanPhone}`);
                }
              } catch (convErr: any) {
                console.error("❌ Error processing conversation:", convErr.message);
              }
            } else {
              console.warn("⚠️ No userId found for company, skipping conversation creation");
            }
          }

          // ---- Process status updates ----
          const statuses = value?.statuses || [];
          for (const st of statuses) {
            const newStatus = st.status;
            // Only update with valid statuses
            const validStatuses = ['sent', 'delivered', 'read', 'failed'];
            if (!validStatuses.includes(newStatus)) {
              console.log(`⚠️ Skipping unknown status: ${newStatus}`);
              continue;
            }

            const { error: updateError } = await supabaseAdmin
              .from("whatsapp_messages")
              .update({ status: newStatus })
              .eq("wa_message_id", st.id)
              .eq("company_id", company_id);

            if (updateError) {
              console.error("❌ Error updating status:", updateError.message);
            } else {
              console.log(`🔄 Status updated: ${st.id} → ${newStatus}`);
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