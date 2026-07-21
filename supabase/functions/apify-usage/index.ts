// Apify usage stats — returns monthly compute units usage vs plan limit
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!APIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: "APIFY_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = { Authorization: `Bearer ${APIFY_TOKEN}` };

    // 1) User info (plan + limits)
    const userRes = await fetch("https://api.apify.com/v2/users/me", { headers });
    const userJson = await userRes.json();
    const user = userJson?.data ?? {};

    // 2) Current monthly usage
    const usageRes = await fetch("https://api.apify.com/v2/users/me/usage/monthly", { headers });
    const usageJson = await usageRes.json();
    const usage = usageJson?.data ?? {};

    const plan = user?.plan?.id || user?.plan || "FREE";
    const monthlyUsageUsd = usage?.monthlyServiceUsage?.total?.priceUsd
      ?? usage?.monthlyServiceUsage?.priceUsd
      ?? usage?.totalUsageCreditsUsd
      ?? 0;

    // Plan limits (best effort; Apify exposes it in user.limits when available)
    const limits = user?.limits ?? {};
    const monthlyLimitUsd = limits?.monthlyUsageUsd
      ?? user?.plan?.monthlyUsageCreditsUsd
      ?? (plan === "FREE" ? 5 : null);

    const computeUnits = usage?.monthlyServiceUsage?.ACTOR_COMPUTE_UNITS?.baseAmount
      ?? usage?.monthlyServiceUsage?.total?.computeUnits
      ?? null;

    const percent = monthlyLimitUsd ? (Number(monthlyUsageUsd) / Number(monthlyLimitUsd)) * 100 : null;

    return new Response(
      JSON.stringify({
        plan,
        monthlyUsageUsd: Number(monthlyUsageUsd),
        monthlyLimitUsd: monthlyLimitUsd ? Number(monthlyLimitUsd) : null,
        percent,
        computeUnits,
        username: user?.username,
        billingPeriodEnd: usage?.monthlyServiceUsageDate || usage?.periodEnd || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("apify-usage error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
