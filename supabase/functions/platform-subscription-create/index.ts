import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICES: Record<string, Record<string, number>> = {
  start: { monthly: 49.9, annual: 499.0 },
  business: { monthly: 99.9, annual: 999.0 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Sessão inválida");

    const { tier, billing, backUrl } = await req.json();
    if (!["start", "business"].includes(tier)) throw new Error("Plano inválido");
    if (!["monthly", "annual"].includes(billing)) throw new Error("Recorrência inválida");

    const amount = PRICES[tier][billing];

    const { data: profile } = await admin
      .from("profiles")
      .select("company_id, full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.company_id) throw new Error("Usuário sem empresa vinculada");

    const accessToken = Deno.env.get("MERCADOPAGO_PLATFORM_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADOPAGO_PLATFORM_ACCESS_TOKEN não configurado");

    const frequency = billing === "monthly" ? 1 : 12;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/platform-subscription-webhook`;

    const preapprovalBody = {
      reason: `Next Pro ${tier === "start" ? "Start" : "Business"} ${billing === "monthly" ? "Mensal" : "Anual"}`,
      external_reference: JSON.stringify({
        company_id: profile.company_id,
        user_id: user.id,
        tier,
        billing,
      }),
      payer_email: user.email,
      back_url: backUrl || `${req.headers.get("origin") || "https://chat-flow-wizardry.lovable.app"}/home?subscription=success`,
      auto_recurring: {
        frequency,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL",
      },
      notification_url: webhookUrl,
      status: "pending",
    };

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalBody),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP preapproval error", mpData);
      throw new Error(mpData?.message || "Erro ao criar assinatura no Mercado Pago");
    }

    await admin.from("platform_subscriptions").insert({
      company_id: profile.company_id,
      user_id: user.id,
      tier,
      billing,
      amount,
      mp_preapproval_id: mpData.id,
      mp_init_point: mpData.init_point,
      status: "pending",
      raw: mpData,
    });

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, preapproval_id: mpData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
