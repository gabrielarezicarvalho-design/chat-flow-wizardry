import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { partner_id, partner_password, section, data } = await req.json();

    if (!partner_id || !partner_password || !section || !data) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify partner credentials
    const { data: partner, error: fetchError } = await supabase
      .from("white_label_partners")
      .select("id, partner_password")
      .eq("id", partner_id)
      .maybeSingle();

    if (fetchError || !partner) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (partner.partner_password !== partner_password) {
      return new Response(JSON.stringify({ error: "Senha inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build update object based on section
    let updateData: Record<string, any> = {};

    switch (section) {
      case "supabase":
        updateData = {
          supabase_url: data.supabase_url || null,
          supabase_anon_key: data.supabase_anon_key || null,
          supabase_service_role_key: data.supabase_service_role_key || null,
        };
        break;
      case "appearance":
        updateData = {
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || null,
          secondary_color: data.secondary_color || null,
          accent_color: data.accent_color || null,
          background_color: data.background_color || null,
        };
        break;
      case "domain":
        updateData = {
          custom_domain: data.custom_domain || null,
        };
        break;
      case "uazapi":
        updateData = {
          uazapi_base_url: data.uazapi_base_url || null,
          uazapi_admin_token: data.uazapi_admin_token || null,
          uazapi_environment: data.uazapi_environment || "TESTE",
        };
        break;
      default:
        return new Response(JSON.stringify({ error: "Seção inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { error: updateError } = await supabase
      .from("white_label_partners")
      .update(updateData)
      .eq("id", partner_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
