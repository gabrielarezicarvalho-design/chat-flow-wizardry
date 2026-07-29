import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireActivePlan } from "../_shared/planGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;
  }

  try {
    const { instanceId, token, baseUrl, phone, message } = await req.json();

    if (!instanceId || !token || !phone || !message) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: instanceId, token, phone, message" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const sendUrl = `${baseUrl || (Deno.env.get("EVOLUTION_BASE_URL") ?? "")}/instances/${instanceId}/messages/text/${token}`;
    
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    if (!response.ok) {
      const data = await response.json();
      return new Response(JSON.stringify({ 
        error: "Failed to send message",
        details: data 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
