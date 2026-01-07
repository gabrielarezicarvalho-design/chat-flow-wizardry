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
    const { token, environment, phone, base_url } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing instance token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use the connection's base_url if provided, otherwise fall back to defaults
    let BASE_URL = base_url;
    if (!BASE_URL) {
      BASE_URL = environment?.toUpperCase() === "PROD"
        ? "https://app.uazapi.com"
        : "https://free.uazapi.com";
    }

    console.log(`Generating QR code from ${BASE_URL}/instance/connect`);
    console.log(`Token: ${token.substring(0, 8)}...`);

    const body = phone ? JSON.stringify({ phone }) : JSON.stringify({});

    const response = await fetch(`${BASE_URL}/instance/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": token
      },
      body
    });

    // Get response as text first to handle non-JSON responses
    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response text preview: ${responseText.substring(0, 200)}`);

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", responseText);
      return new Response(JSON.stringify({
        error: "Invalid response from UZAPI",
        details: responseText.substring(0, 200)
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!response.ok) {
      console.error("UZAPI error:", data);
      return new Response(JSON.stringify({
        error: "Failed to fetch QR code",
        status: response.status,
        details: data
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const qrBase64 = data?.instance?.qrcode || null;

    console.log(`QR code generated: ${qrBase64 ? 'yes' : 'no'}`);

    return new Response(JSON.stringify({
      success: true,
      qrcode: qrBase64,
      paircode: data?.instance?.paircode
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
