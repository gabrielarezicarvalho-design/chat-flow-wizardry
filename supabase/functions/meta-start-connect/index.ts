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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    if (!META_APP_ID) {
      return new Response(JSON.stringify({ error: "META_APP_ID not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a state token to identify this company during callback
    const stateToken = crypto.randomUUID();

    // Store state temporarily in the connection (or create a pending one)
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("id")
      .eq("company_id", company_id)
      .eq("provider", "meta")
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("whatsapp_connections")
        .update({ meta_verify_token: stateToken, status: "disconnected" })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin
        .from("whatsapp_connections")
        .insert({
          company_id,
          provider: "meta",
          status: "disconnected",
          meta_verify_token: stateToken,
        });
    }

    // The callback URL for the Meta Embedded Signup
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-connect-callback`;

    // Build the Facebook Login / Embedded Signup URL
    // See: https://developers.facebook.com/docs/whatsapp/embedded-signup
    const params = new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri: callbackUrl,
      state: stateToken,
      scope: "whatsapp_business_management,whatsapp_business_messaging",
      response_type: "code",
      config_id: "", // Leave empty or set to your Embedded Signup config ID if you have one
    });

    // Remove empty config_id if not set
    if (!params.get("config_id")) {
      params.delete("config_id");
    }

    const loginUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;

    return new Response(JSON.stringify({ login_url: loginUrl, state: stateToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
