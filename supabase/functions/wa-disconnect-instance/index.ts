import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, base_url } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing instance token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use the connection's base_url if provided, otherwise use default
    const BASE_URL = base_url || "https://marketflowchat.uazapi.com";

    console.log(`Disconnecting instance from ${BASE_URL}/instance/logout`);
    console.log(`Token: ${token.substring(0, 8)}...`);

    // Use /instance/logout endpoint with POST method (not DELETE)
    const response = await fetch(`${BASE_URL}/instance/logout`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": token
      }
    });

    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response text: ${responseText}`);

    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      if (response.ok) {
        result = { success: true, message: "Instance disconnected" };
      } else {
        result = { error: responseText || "Unknown error from UAZAPI" };
      }
    }

    if (!response.ok) {
      console.error("UAZAPI disconnect error:", result);
      return new Response(JSON.stringify({
        error: "Failed to disconnect instance",
        details: result
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Instance disconnected successfully:", result);

    return new Response(JSON.stringify({
      success: true,
      message: "Instance disconnected successfully",
      data: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error in disconnect:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
