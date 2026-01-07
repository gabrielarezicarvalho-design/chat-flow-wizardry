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
    const { token, environment, base_url } = await req.json();

    // Validação robusta do token
    if (!token || token.trim() === "") {
      console.error("Token ausente ou vazio");
      return new Response(JSON.stringify({ 
        success: false,
        error: "Token da instância ausente ou inválido" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use provided base_url if available, otherwise fall back to environment-based secrets
    let BASE_URL = base_url;
    if (!BASE_URL) {
      BASE_URL = environment?.toUpperCase() === "PROD"
        ? Deno.env.get("UZAPI_BASE_URL_PROD")
        : Deno.env.get("UZAPI_BASE_URL_TESTE");
    }

    if (!BASE_URL) {
      console.error("BASE_URL not configured for environment:", environment);
      return new Response(JSON.stringify({ 
        success: false,
        error: "BASE_URL not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Checking instance status from ${BASE_URL}/instance/status`);
    console.log(`Using token: ${token.substring(0, 8)}...`);

    const response = await fetch(`${BASE_URL}/instance/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "token": token
      }
    });

    const responseText = await response.text();
    console.log("UAZAPI response status:", response.status);
    console.log("UAZAPI raw response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid JSON response from UAZAPI",
        rawResponse: responseText.substring(0, 200)
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!response.ok) {
      console.error("UZAPI status error:", result);
      
      // Check if instance was deleted (500 with specific error message)
      const errorMessage = (result?.error || '').toLowerCase();
      const instanceDeleted = response.status === 500 && 
        (errorMessage.includes('instance details') || 
         errorMessage.includes('instance not found') ||
         errorMessage.includes('not found'));
      
      console.log("Instance deleted check:", instanceDeleted, "- Error message:", errorMessage);
      
      // Return 200 with instanceDeleted flag so frontend can handle it properly
      return new Response(JSON.stringify({
        success: false,
        connected: false,
        instanceDeleted,
        error: "Failed to fetch instance status",
        details: result,
        originalStatus: response.status
      }), {
        status: 200, // Return 200 so Supabase client doesn't throw
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const status = result?.instance?.status || "unknown";
    const connected = status === "connected";
    console.log("Instance status:", status, "- Connected:", connected);

    return new Response(JSON.stringify({
      success: true,
      connected,
      status,
      message: connected
        ? "Instância conectada com sucesso!"
        : "Aguardando conexão..."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error checking instance status:", err);
    return new Response(JSON.stringify({ 
      success: false,
      error: err instanceof Error ? err.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
