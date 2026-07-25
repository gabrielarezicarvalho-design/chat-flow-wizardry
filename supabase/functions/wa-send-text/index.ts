import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  evolutionSendText,
  extractEvolutionMessageId,
  isEvolutionConnection,
  resolveEvolutionCreds,
} from "../_shared/evolution.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Validate if the number looks like a valid phone number
function isValidPhoneNumber(phone: string): boolean {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // Valid phone numbers should be between 10 and 15 digits
  // And should NOT be a Facebook/Instagram ID (which are typically longer IDs without country codes)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  // Check if it starts with a valid country code pattern
  // Most country codes start with digits 1-9
  // Facebook IDs are very long numbers that don't follow phone patterns
  
  // Brazilian numbers start with 55 and have 12-13 digits total
  if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
    return true;
  }
  
  // US/Canada numbers start with 1 and have 11 digits
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return true;
  }
  
  // Generic validation: 10-15 digits is acceptable for international numbers
  // But exclude numbers that look like Facebook IDs (15+ digits without valid patterns)
  if (cleaned.length >= 10 && cleaned.length <= 14) {
    return true;
  }
  
  // If it's exactly 15 digits, check if it looks like a real phone number
  // (Facebook IDs tend to be longer random-looking numbers)
  if (cleaned.length === 15) {
    // Check if starts with common country code patterns
    const validPrefixes = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    return validPrefixes.some(p => cleaned.startsWith(p));
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, phone, text, conversationId } = await req.json();

    if (!connectionId || !phone || !text) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: connectionId, phone, text" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, "");

    // Validate phone number before attempting to send
    if (!isValidPhoneNumber(cleanPhone)) {
      console.log(`❌ Número inválido detectado: ${cleanPhone} (comprimento: ${cleanPhone.length})`);
      console.log("   Este número parece ser um ID de Facebook/Instagram, não um número de WhatsApp.");
      
      return new Response(JSON.stringify({ 
        success: false,
        error: "Número de telefone inválido para WhatsApp",
        details: {
          message: "Este contato não possui um número de WhatsApp válido. Pode ser um contato do Facebook Messenger ou Instagram.",
          phone: cleanPhone,
          phoneLength: cleanPhone.length
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      console.error("Connection not found:", connError);
      return new Response(JSON.stringify({ 
        error: "Connection not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { token, base_url } = connection;

    // ---------- Evolution API branch ----------
    if (isEvolutionConnection(connection)) {
      const creds = resolveEvolutionCreds(connection);
      if (!creds) {
        return new Response(JSON.stringify({
          success: false,
          error: "Evolution connection missing base_url, apiKey or instance_name",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log(`📤 [Evolution] Enviando texto para ${cleanPhone} via ${creds.baseUrl}`);
      const evoRes = await evolutionSendText({
        ...creds,
        phone: cleanPhone,
        text,
      });

      if (!evoRes.ok) {
        console.error("[Evolution] send failed:", evoRes.data);
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to send message",
          details: evoRes.data,
        }), { status: evoRes.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const evoMsgId = extractEvolutionMessageId(evoRes.data);

      if (conversationId) {
        await supabase.from("messages").insert({
          id_da_conversa: conversationId,
          remetente: "sistema",
          conteudo: text,
          tipo: "text",
          recebido: false,
          uazapi_message_id: evoMsgId,
        });
        await supabase.from("conversations").update({
          last_message: text,
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      }

      return new Response(JSON.stringify({ success: true, data: evoRes.data, provider: "evolution" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Legacy Evolution branch ----------
    if (!token || !base_url) {
      return new Response(JSON.stringify({
        error: "Connection missing token or base_url"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`📤 Enviando mensagem para ${cleanPhone} via ${base_url}/send/text`);


    // Send message via Evolution
    const sendUrl = `${base_url}/send/text`;
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": token
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text
      })
    });

    const responseText = await response.text();
    console.log("Evolution response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    // Check for "not on WhatsApp" error from Evolution
    if (result?.error?.includes("not on WhatsApp")) {
      console.log(`❌ Número não está no WhatsApp: ${cleanPhone}`);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Número não está no WhatsApp",
        details: {
          message: "Este número não está registrado no WhatsApp.",
          phone: cleanPhone
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!response.ok) {
      console.error("Failed to send message:", result);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to send message",
        details: result 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`✅ Mensagem enviada com sucesso para ${cleanPhone}`);

    // Save sent message to database
    if (conversationId) {
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          id_da_conversa: conversationId,
          remetente: "sistema",
          conteudo: text,
          tipo: "text",
          recebido: false,
          uazapi_message_id: result?.key?.id || null
        });

      if (msgError) {
        console.error("Error saving message:", msgError);
      }

      // Update conversation last_message
      await supabase
        .from("conversations")
        .update({ 
          last_message: text,
          updated_at: new Date().toISOString()
        })
        .eq("id", conversationId);
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
