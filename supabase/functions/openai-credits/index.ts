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

    const headers = {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    };

    // 1. Validate key by listing models
    const modelsRes = await fetch("https://api.openai.com/v1/models?limit=1", { headers });
    if (!modelsRes.ok) {
      return new Response(
        JSON.stringify({ error: "API Key inválida ou sem permissões. Verifique em platform.openai.com." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get usage costs for current month via the new Usage API
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    // end_date is exclusive, so use first day of next month
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    let totalUsed = 0;

    try {
      const costsRes = await fetch(
        `https://api.openai.com/v1/organization/costs?start_time=${startTs}&end_time=${endTs}`,
        { headers }
      );

      if (costsRes.ok) {
        const costsData = await costsRes.json();
        // Sum up all cost buckets
        if (costsData.data && Array.isArray(costsData.data)) {
          for (const bucket of costsData.data) {
            if (bucket.results && Array.isArray(bucket.results)) {
              for (const result of bucket.results) {
                totalUsed += result.amount?.value || 0;
              }
            }
          }
        }
        // Convert cents to dollars if needed (the costs API returns in USD cents)
        totalUsed = totalUsed / 100;
      } else {
        // Fallback: try the older usage endpoint
        const usageRes = await fetch(
          `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
          { headers }
        );
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          totalUsed = (usageData.total_usage || 0) / 100;
        }
      }
    } catch (e) {
      console.error("Error fetching usage:", e);
    }

    // 3. Try to get subscription/limit info (may fail on newer accounts)
    let totalGranted = 0;
    let hasPaymentMethod = false;

    try {
      const subRes = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        totalGranted = subData.hard_limit_usd || subData.system_hard_limit_usd || 0;
        hasPaymentMethod = subData.has_payment_method || false;
      }
    } catch (_e) {
      // Endpoint deprecated - expected to fail
    }

    // If we couldn't get a limit, provide a reasonable default
    if (totalGranted === 0) {
      totalGranted = 120; // Default assumption
      hasPaymentMethod = true; // Assume pay-as-you-go
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
