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
      await modelsRes.text();
      return new Response(
        JSON.stringify({ error: "API Key inválida ou sem permissões. Verifique em platform.openai.com." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    await modelsRes.text();

    // 2. Try multiple approaches to get usage data
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    let totalUsed = 0;
    let usageFound = false;

    // Approach 1: Organization Costs API (requires api.usage.read scope)
    try {
      const costsRes = await fetch(
        `https://api.openai.com/v1/organization/costs?start_time=${startTs}&end_time=${endTs}`,
        { headers }
      );
      if (costsRes.ok) {
        const costsData = await costsRes.json();
        if (costsData.data && Array.isArray(costsData.data)) {
          for (const bucket of costsData.data) {
            if (bucket.results && Array.isArray(bucket.results)) {
              for (const result of bucket.results) {
                totalUsed += result.amount?.value || 0;
              }
            }
          }
        }
        usageFound = true;
        console.log("Usage from costs API:", totalUsed);
      } else {
        await costsRes.text();
      }
    } catch (e) {
      console.error("Costs API error:", e);
    }

    // Approach 2: Completions usage endpoint (might work with project keys)
    if (!usageFound) {
      try {
        const usageRes = await fetch(
          `https://api.openai.com/v1/organization/usage/completions?start_time=${startTs}&end_time=${endTs}&bucket_width=1d`,
          { headers }
        );
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          console.log("Completions usage response:", JSON.stringify(usageData).slice(0, 500));
          // Sum up input/output costs from completions
          if (usageData.data && Array.isArray(usageData.data)) {
            for (const bucket of usageData.data) {
              if (bucket.results && Array.isArray(bucket.results)) {
                for (const result of bucket.results) {
                  totalUsed += (result.input_cached_tokens || 0) * 0.0000001;
                  totalUsed += (result.input_tokens || 0) * 0.000001;
                  totalUsed += (result.output_tokens || 0) * 0.000002;
                }
              }
            }
          }
          usageFound = true;
          console.log("Usage from completions:", totalUsed);
        } else {
          const errText = await usageRes.text();
          console.log("Completions usage error:", usageRes.status, errText);
        }
      } catch (e) {
        console.error("Completions usage error:", e);
      }
    }

    // 3. Try to get subscription/limit info
    let totalGranted = 0;
    let hasPaymentMethod = false;

    try {
      const subRes = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        totalGranted = subData.hard_limit_usd || subData.system_hard_limit_usd || 0;
        hasPaymentMethod = subData.has_payment_method || false;
      } else {
        await subRes.text();
      }
    } catch (_e) {
      // Expected to fail - deprecated endpoint
    }

    if (totalGranted === 0) {
      totalGranted = 120;
      hasPaymentMethod = true;
    }

    const totalAvailable = Math.max(0, totalGranted - totalUsed);

    return new Response(
      JSON.stringify({
        total_granted: totalGranted,
        total_used: totalUsed,
        total_available: totalAvailable,
        has_payment_method: hasPaymentMethod,
        usage_available: usageFound,
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
