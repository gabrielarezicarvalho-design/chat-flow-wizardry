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

  try {
    const { action, connectionId, phone, name, numbers, token, environment, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let instanceToken = token;
    let baseUrl = "";
    let connection: any = null;

    // If connectionId is provided, fetch connection details
    if (connectionId) {
      const { data: conn, error: connError } = await supabase
        .from("connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (connError || !conn) {
        console.error("Connection not found:", connError);
        return new Response(JSON.stringify({ 
          error: "Connection not found" 
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      connection = conn;
      instanceToken = conn.token;
      baseUrl = conn.base_url || "";
    } else if (token && environment) {
      // Use token and environment directly
      instanceToken = token;
      baseUrl = environment === "PROD" ? "https://app.uazapi.com" : "https://free.uazapi.com";
    }
    
    if (!instanceToken) {
      return new Response(JSON.stringify({ 
        error: "Missing required field: token or connectionId" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!baseUrl) {
      return new Response(JSON.stringify({ 
        error: "Could not determine base_url" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Helper to extract phone from JID
    const extractPhoneFromJid = (jid: string): string => {
      return jid?.replace(/@.*$/, '') || '';
    };

    // Action: sync - Fetch from WhatsApp and save to leads table
    if (action === "sync") {
      const ownerId = userId || connection?.user_id;
      if (!ownerId) {
        return new Response(JSON.stringify({ 
          error: "Missing user_id for sync action" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log("Syncing contacts for user:", ownerId);

      // Fetch contacts from WhatsApp
      const response = await fetch(`${baseUrl}/contacts`, {
        method: "GET",
        headers: { 
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": instanceToken
        }
      });

      if (!response.ok) {
        console.error("Failed to fetch contacts from WhatsApp");
        return new Response(JSON.stringify({ 
          success: false,
          error: "Failed to fetch contacts from WhatsApp"
        }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = [];
      }

      let contacts: any[] = [];
      if (Array.isArray(result)) {
        contacts = result;
      } else if (result && typeof result === 'object') {
        contacts = result.contacts || result.data || [];
      }

      console.log(`Found ${contacts.length} contacts from WhatsApp`);

      // Get existing leads for this user
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("id, phone, name")
        .eq("user_id", ownerId);

      const existingPhones = new Set((existingLeads || []).map(l => l.phone));
      
      let addedCount = 0;
      let skippedCount = 0;

      // Process contacts - deduplicate by phone and save new ones
      const processedPhones = new Set<string>();
      
      for (const contact of contacts) {
        const phone = extractPhoneFromJid(contact.jid || contact.id || '');
        const contactName = contact.contact_name || contact.name || contact.notify || 'Sem nome';
        
        if (!phone || phone.length < 8) continue;
        
        // Skip if already processed in this batch (dedupe)
        if (processedPhones.has(phone)) {
          skippedCount++;
          continue;
        }
        processedPhones.add(phone);
        
        // Skip if already exists in database
        if (existingPhones.has(phone)) {
          skippedCount++;
          continue;
        }
        
        // Insert new lead
        const { error: insertError } = await supabase
          .from("leads")
          .insert({
            user_id: ownerId,
            phone,
            name: contactName,
            origin: "WhatsApp Sync",
            status: "novo"
          });

        if (insertError) {
          console.error("Error inserting lead:", insertError);
          skippedCount++;
        } else {
          addedCount++;
        }
      }

      console.log(`Sync complete: ${addedCount} added, ${skippedCount} skipped`);

      return new Response(JSON.stringify({
        success: true,
        added: addedCount,
        skipped: skippedCount,
        total: contacts.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let url = "";
    let method = "GET";
    let body = null;

    switch (action) {
      case "list":
        // Get all contacts
        url = `${baseUrl}/contacts`;
        method = "GET";
        break;

      case "add":
        // Add contact to agenda
        if (!phone || !name) {
          return new Response(JSON.stringify({ 
            error: "Missing required fields: phone, name" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        url = `${baseUrl}/contact/add`;
        method = "POST";
        body = JSON.stringify({ phone: phone.replace(/\D/g, ""), name });
        break;

      case "check":
        // Check if numbers are valid WhatsApp numbers
        if (!numbers || !Array.isArray(numbers)) {
          return new Response(JSON.stringify({ 
            error: "Missing required field: numbers (array)" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        url = `${baseUrl}/chat/check`;
        method = "POST";
        body = JSON.stringify({ numbers: numbers.map((n: string) => n.replace(/\D/g, "")) });
        break;

      default:
        return new Response(JSON.stringify({ 
          error: "Invalid action. Use: list, add, check, or sync" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    console.log(`${action} contacts via ${url}`);

    const response = await fetch(url, {
      method,
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": instanceToken
      },
      ...(body && { body })
    });

    const responseText = await response.text();
    console.log("UAZAPI response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`Failed to ${action} contacts:`, result);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to ${action} contacts`,
        details: result 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Format response based on action
    if (action === "list") {
      // Handle various response formats from UZAPI
      let contacts: any[] = [];
      if (Array.isArray(result)) {
        contacts = result;
      } else if (result && typeof result === 'object') {
        contacts = result.contacts || result.data || [];
      }
      
      console.log(`Found ${contacts.length} contacts`);
      
      return new Response(JSON.stringify({
        success: true,
        contacts: contacts
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "check") {
      return new Response(JSON.stringify({
        success: true,
        results: result
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});