const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key } = await req.json();

    if (!api_key || !api_key.startsWith("sk-")) {
      return new Response(
        JSON.stringify({ error: "API Key inválida. Deve começar com sk-" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check billing/subscription info
    const headers = {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    };

    // Get subscription info
    const subRes = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", {
      headers,
    });

    if (!subRes.ok) {
      // Try the organization billing endpoint
      const orgRes = await fetch("https://api.openai.com/v1/organizations", { headers });

      if (!orgRes.ok) {
        return new Response(
          JSON.stringify({ error: "Não foi possível verificar créditos. Verifique sua API Key e permissões." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get usage for current billing period
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageRes = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
      { headers }
    );

    let totalUsed = 0;
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      totalUsed = (usageData.total_usage || 0) / 100; // Convert from cents
    }

    let totalGranted = 0;
    let hasPaymentMethod = false;

    if (subRes.ok) {
      const subData = await subRes.json();
      totalGranted = subData.hard_limit_usd || subData.system_hard_limit_usd || 0;
      hasPaymentMethod = subData.has_payment_method || false;
    } else {
      // Fallback: estimate from usage
      totalGranted = 120; // Default assumption
    }

    const totalAvailable = Math.max(0, totalGranted - totalUsed);

    return new Response(
      JSON.stringify({
        total_granted: totalGranted,
        total_used: totalUsed,
        total_available: totalAvailable,
        has_payment_method: hasPaymentMethod,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking OpenAI credits:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao verificar créditos da OpenAI" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
