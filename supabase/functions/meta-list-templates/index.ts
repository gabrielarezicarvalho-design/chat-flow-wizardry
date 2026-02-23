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

    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId é obrigatório" }), {
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

    if (!conn.meta_access_token || !conn.meta_waba_id) {
      return new Response(JSON.stringify({ error: "Conexão Meta sem token ou WABA ID" }), {
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

    // Fetch templates from Meta API
    const url = `https://graph.facebook.com/${apiVersion}/${conn.meta_waba_id}/message_templates?fields=name,status,language,category,components&limit=100`;
    
    console.log("📋 Fetching templates from:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${conn.meta_access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta API error:", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        error: result?.error?.message || "Erro ao buscar templates",
        details: result?.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter only APPROVED templates and map to a clean format
    const templates = (result.data || []).map((t: any) => ({
      name: t.name,
      status: t.status,
      language: t.language,
      category: t.category,
      components: t.components,
    }));

    console.log(`📋 Found ${templates.length} templates`);

    return new Response(JSON.stringify({ 
      success: true, 
      templates,
      total: templates.length 
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
