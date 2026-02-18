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

    console.log(`Deleting instance from ${BASE_URL}/instance`);
    console.log(`Token: ${token.substring(0, 8)}...`);

    // Correct endpoint: DELETE to /instance with token header
    const response = await fetch(`${BASE_URL}/instance`, {
      method: "DELETE",
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
        result = { success: true, message: "Instance deleted" };
      } else {
        result = { error: responseText || "Unknown error from UAZAPI" };
      }
    }

    if (!response.ok) {
      // Treat "record not found" as success - instance already deleted
      const errorMessage = result?.error || result?.message || JSON.stringify(result);
      const isAlreadyDeleted = 
        errorMessage.includes("record not found") || 
        errorMessage.includes("not found") ||
        errorMessage.includes("instance not found") ||
        errorMessage.includes("Invalid token") ||
        response.status === 404 ||
        response.status === 401;
      
      if (isAlreadyDeleted) {
        console.log("Instance already deleted or not found, treating as success");
        return new Response(JSON.stringify({
          success: true,
          message: "Instance already deleted or not found",
          data: result
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      console.error("UAZAPI delete error:", result);
      return new Response(JSON.stringify({
        error: "Failed to delete instance",
        details: result
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Instance deleted successfully:", result);

    return new Response(JSON.stringify({
      success: true,
      message: "Instance deleted successfully",
      data: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error in delete:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
