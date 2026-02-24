import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const now = new Date().toISOString();
    
    // Find campaigns that are scheduled and their time has come
    const { data: campaigns, error: fetchError } = await supabase
      .from("campaigns")
      .select("*, connections:connection_id(id, token, base_url)")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);
    
    if (fetchError) {
      console.error("[scheduled-campaigns] Error fetching campaigns:", fetchError);
      return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("[scheduled-campaigns] No campaigns to process");
      return new Response(JSON.stringify({ success: true, message: "No campaigns to process", processed: 0 }), {
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
      
      if (!connection?.token || !connection?.base_url) {
        console.error(`[scheduled-campaigns] Campaign ${campaign.id} has no valid connection`);
        await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
        results.push({ id: campaign.id, success: false, error: "No valid connection" });
        continue;
      }

      // Get contacts from the campaign's contacts jsonb column
      const contacts: string[] = campaign.contacts || [];
      if (!Array.isArray(contacts) || contacts.length === 0) {
        // Fallback: try to get contacts from campaign_contacts table
        const { data: contactRows } = await supabase
          .from("campaign_contacts")
          .select("phone")
          .eq("campaign_id", campaign.id)
          .eq("status", "pending");
        
        if (!contactRows || contactRows.length === 0) {
          console.error(`[scheduled-campaigns] Campaign ${campaign.id} has no contacts`);
          await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
          results.push({ id: campaign.id, success: false, error: "No contacts" });
          continue;
        }
        
        // Use phones from campaign_contacts
        const fallbackContacts = contactRows.map((r: any) => r.phone);
        await processContacts(supabase, campaign, connection, fallbackContacts, results);
        continue;
      }

      await processContacts(supabase, campaign, connection, contacts, results);
    }

    console.log(`[scheduled-campaigns] Processed ${campaigns.length} campaigns`);

    return new Response(JSON.stringify({ success: true, processed: campaigns.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[scheduled-campaigns] Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function processContacts(
  supabase: any,
  campaign: any,
  connection: any,
  contacts: string[],
  results: any[]
) {
  try {
    const messageType = campaign.message_type || "text";
    const isInteractive = messageType.startsWith("interactive_");
    
    // Build messages array for UZAPI /sender/advanced
    const messages = contacts.map((contact: string) => {
      const cleanNumber = contact.replace("@s.whatsapp.net", "").replace(/\D/g, "");
      
      return {
        number: cleanNumber,
        type: isInteractive ? messageType.replace("interactive_", "") : (messageType === "text" ? "text" : messageType),
        text: campaign.message_content || "",
        file: messageType !== "text" && !isInteractive ? campaign.media_url : undefined
      };
    });

    const body = {
      delayMin: 10,
      delayMax: 30,
      info: campaign.name,
      messages
    };

    console.log(`[scheduled-campaigns] Sending ${messages.length} messages for campaign ${campaign.id}`);

    const response = await fetch(`${connection.base_url}/sender/advanced`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": connection.token
      },
      body: JSON.stringify(body)
    });

    const responseData = await response.json();
    console.log(`[scheduled-campaigns] UZAPI response:`, JSON.stringify(responseData));

    if (!response.ok || responseData.error) {
      await supabase.from("campaigns").update({ status: "failed", results: responseData }).eq("id", campaign.id);
      results.push({ id: campaign.id, success: false, error: responseData.error || "UZAPI error" });
    } else {
      // Check if queued
      if (responseData?.status === "queued") {
        await supabase.from("campaigns").update({
          status: "queued",
          folder_id: responseData.folder_id || null,
          total_contacts: messages.length
        }).eq("id", campaign.id);
        results.push({ id: campaign.id, success: true, queued: true, count: messages.length });
      } else {
        await supabase.from("campaigns").update({
          status: "sent",
          sent_count: messages.length,
          completed_at: new Date().toISOString()
        }).eq("id", campaign.id);
        
        // Mark campaign_contacts as sent
        await supabase.from("campaign_contacts")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("campaign_id", campaign.id)
          .eq("status", "pending");
        
        results.push({ id: campaign.id, success: true, sent: messages.length });
      }
    }
  } catch (err) {
    console.error(`[scheduled-campaigns] Error processing campaign ${campaign.id}:`, err);
    await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
    results.push({ id: campaign.id, success: false, error: String(err) });
  }
}
