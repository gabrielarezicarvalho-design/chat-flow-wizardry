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
    const { connection_id, action } = await req.json();

    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch connection details
    const { data: connection, error: connError } = await supabaseAdmin
      .from("connections")
      .select("id, name, instance_name, token, base_url, environment, status, qr_code, company_id")
      .eq("id", connection_id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already connected, return status
    if (connection.status === "connected") {
      return new Response(JSON.stringify({
        success: true,
        connected: true,
        name: connection.name || connection.instance_name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company branding
    let companyName = "MarketFlow";
    let logoUrl = null;
    let primaryColor = "#10b981";
    
    if (connection.company_id) {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("name, logo_url, primary_color")
        .eq("id", connection.company_id)
        .single();
      
      if (company) {
        companyName = company.name;
        logoUrl = company.logo_url;
        primaryColor = company.primary_color || "#10b981";
      }
    }

    // If action is "refresh", generate a new QR code
    if (action === "refresh" && connection.token) {
      const BASE_URL = connection.base_url || 
        (connection.environment?.toUpperCase() === "PROD" 
          ? (Deno.env.get("EVOLUTION_BASE_URL") ?? "") 
          : (Deno.env.get("EVOLUTION_BASE_URL") ?? ""));

      console.log(`Generating QR code from ${BASE_URL}/instance/connect`);

      const response = await fetch(`${BASE_URL}/instance/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": connection.token,
        },
        body: JSON.stringify({}),
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        return new Response(JSON.stringify({ error: "Erro ao gerar QR Code" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const qrBase64 = data?.instance?.qrcode || null;
      const paircode = data?.instance?.paircode || null;

      // Save QR to database
      if (qrBase64) {
        await supabaseAdmin
          .from("connections")
          .update({ qr_code: qrBase64, status: "connecting" })
          .eq("id", connection_id);
      }

      return new Response(JSON.stringify({
        success: true,
        connected: false,
        qrcode: qrBase64,
        paircode,
        name: connection.name || connection.instance_name,
        companyName,
        logoUrl,
        primaryColor,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return current QR code info
    return new Response(JSON.stringify({
      success: true,
      connected: false,
      qrcode: connection.qr_code,
      name: connection.name || connection.instance_name,
      companyName,
      logoUrl,
      primaryColor,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
