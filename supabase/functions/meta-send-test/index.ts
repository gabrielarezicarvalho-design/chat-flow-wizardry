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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { connectionId, to, message, templateName, templateLanguage } = await req.json();

    if (!connectionId || !to) {
      return new Response(JSON.stringify({ error: "connectionId e to são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch connection
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!conn.meta_access_token || !conn.meta_phone_number_id) {
      return new Response(JSON.stringify({ error: "Conexão Meta sem token ou phone_number_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API version from app_settings
    const { data: appSettings } = await supabaseAdmin
      .from("app_settings")
      .select("meta_api_version")
      .eq("id", 1)
      .maybeSingle();

    const apiVersion = appSettings?.meta_api_version || "v22.0";

    // Format phone number (remove non-digits)
    const formattedTo = to.replace(/\D/g, "");

    let body: any;

    if (templateName) {
      // Send template message
      body = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage || "pt_BR" },
        },
      };
    } else {
      // Send text message
      body = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "text",
        text: { body: message || "Mensagem de teste do Next Pro 🚀" },
      };
    }

    console.log("📤 Sending message:", JSON.stringify(body));

    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${conn.meta_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${conn.meta_access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();
    console.log("📨 Meta API response:", JSON.stringify(result));

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: result?.error?.message || "Erro ao enviar mensagem",
        details: result?.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save message to whatsapp_messages
    await supabaseAdmin.from("whatsapp_messages").insert({
      company_id: conn.company_id,
      connection_id: conn.id,
      provider: "meta",
      direction: "outbound",
      to_number: formattedTo,
      body: templateName ? `[Template: ${templateName}]` : (message || "Mensagem de teste"),
      message_type: templateName ? "template" : "text",
      wa_message_id: result?.messages?.[0]?.id || null,
      phone_number_id: conn.meta_phone_number_id,
      status: "sent",
    });

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: result?.messages?.[0]?.id,
      message: "Mensagem enviada com sucesso!" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
