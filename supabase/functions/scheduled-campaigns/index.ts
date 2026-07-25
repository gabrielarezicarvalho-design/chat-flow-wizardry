import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  evolutionSendAudio,
  evolutionSendMedia,
  evolutionSendText,
  isEvolutionConnection,
  resolveEvolutionCreds,
} from "../_shared/evolution.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("[scheduled-campaigns] Checking for scheduled campaigns...");
    
    // Find campaigns that are scheduled and their time has come
    const now = new Date().toISOString();
    
    const { data: campaigns, error: fetchError } = await supabase
      .from("campaigns")
      .select("*, connections(token, base_url, environment, instance_name, instance_id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    
    if (fetchError) {
      console.error("[scheduled-campaigns] Error fetching campaigns:", fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: fetchError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("[scheduled-campaigns] No campaigns to process");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No campaigns to process",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[scheduled-campaigns] Found ${campaigns.length} campaigns to process`);

    const results: any[] = [];

    for (const campaign of campaigns) {
      console.log(`[scheduled-campaigns] Processing campaign: ${campaign.name} (${campaign.id})`);
      
      // Mark as processing
      await supabase
        .from("campaigns")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", campaign.id);
      
      const connection = campaign.connections;
      
      const isEvo = isEvolutionConnection(connection || {});
      if (!isEvo && (!connection?.token || !connection?.base_url)) {
        console.error(`[scheduled-campaigns] Campaign ${campaign.id} has no valid connection`);
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        results.push({ id: campaign.id, success: false, error: "No valid connection" });
        continue;
      }


      const contacts = campaign.contacts || [];
      if (!Array.isArray(contacts) || contacts.length === 0) {
        console.error(`[scheduled-campaigns] Campaign ${campaign.id} has no contacts`);
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        results.push({ id: campaign.id, success: false, error: "No contacts" });
        continue;
      }

      try {
        // Determine message type
        const messageType = campaign.message_type || "text";
        const isInteractive = messageType.startsWith("interactive_");

        console.log(`[scheduled-campaigns] Sending ${contacts.length} messages for campaign ${campaign.id} (evolution=${isEvo}, type=${messageType})`);

        // ---------- Evolution API path ----------
        if (isEvo) {
          const creds = resolveEvolutionCreds(connection);
          if (!creds) {
            await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
            results.push({ id: campaign.id, success: false, error: "Missing Evolution credentials" });
            continue;
          }
          if (isInteractive) {
            await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
            results.push({ id: campaign.id, success: false, error: "Interactive messages not supported on Evolution yet" });
            continue;
          }

          let sent = 0;
          let failed = 0;
          const errors: any[] = [];

          for (const contact of contacts) {
            const number = String(contact).replace("@s.whatsapp.net", "").replace(/\D/g, "");
            try {
              let res;
              if (messageType === "text") {
                res = await evolutionSendText({ ...creds, phone: number, text: campaign.message_content || "" });
              } else if (messageType === "audio") {
                res = await evolutionSendAudio({ ...creds, phone: number, audio: campaign.media_url });
              } else if (messageType === "image" || messageType === "video" || messageType === "document") {
                res = await evolutionSendMedia({
                  ...creds,
                  phone: number,
                  mediaType: messageType,
                  media: campaign.media_url,
                  caption: campaign.message_content || undefined,
                });
              } else {
                failed++;
                errors.push({ number, error: `Unsupported type ${messageType}` });
                continue;
              }
              if (res.ok) sent++;
              else { failed++; errors.push({ number, error: res.data }); }

              // Human-like delay between sends (10-30s)
              const delayMs = 10000 + Math.floor(Math.random() * 20000);
              await new Promise((r) => setTimeout(r, delayMs));
            } catch (e) {
              failed++;
              errors.push({ number, error: String(e) });
            }
          }

          const status = failed === 0 ? "sent" : (sent === 0 ? "failed" : "sent");
          await supabase.from("campaigns").update({
            status,
            sent_count: sent,
            completed_at: new Date().toISOString(),
            results: { provider: "evolution", sent, failed, errors: errors.slice(0, 20) },
          }).eq("id", campaign.id);
          results.push({ id: campaign.id, success: sent > 0, sent, failed });
          continue;
        }

        // ---------- Legacy UAZAPI /sender/advanced path ----------
        const messages = contacts.map((contact: string) => {
          const cleanNumber = contact.replace("@s.whatsapp.net", "").replace(/\D/g, "");
          if (isInteractive) {
            return {
              number: cleanNumber,
              type: messageType.replace("interactive_", ""),
              text: campaign.message_content || "",
            };
          }
          return {
            number: cleanNumber,
            type: messageType === "text" ? "text" : messageType,
            text: campaign.message_content || "",
            file: messageType !== "text" ? campaign.media_url : undefined,
          };
        });

        const body = { delayMin: 10, delayMax: 30, info: campaign.name, messages };
        const response = await fetch(`${connection.base_url}/sender/advanced`, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json", "token": connection.token },
          body: JSON.stringify(body),
        });
        const responseData = await response.json();
        console.log(`[scheduled-campaigns] UZAPI response:`, JSON.stringify(responseData));

        if (!response.ok || responseData.error) {
          await supabase.from("campaigns").update({ status: "failed", results: responseData }).eq("id", campaign.id);
          results.push({ id: campaign.id, success: false, error: responseData.error || "UZAPI error" });
        } else {
          await supabase.from("campaigns").update({
            status: "sent",
            sent_count: messages.length,
            completed_at: new Date().toISOString(),
            results: responseData,
          }).eq("id", campaign.id);
          results.push({ id: campaign.id, success: true, sent: messages.length });
        }


      } catch (err) {
        console.error(`[scheduled-campaigns] Error processing campaign ${campaign.id}:`, err);
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        results.push({ id: campaign.id, success: false, error: String(err) });
      }
    }

    console.log(`[scheduled-campaigns] Processed ${campaigns.length} campaigns`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: campaigns.length,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[scheduled-campaigns] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
