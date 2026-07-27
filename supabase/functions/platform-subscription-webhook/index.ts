import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PLAN_FEATURES: Record<string, string[]> = {
  start: [
    "conversations",
    "contacts",
    "campaigns",
    "flows",
    "agents",
    "internal_chat",
    "ai_agents",
    "sales",
    "cobrancas",
    "segmentation",
    "reports",
    "departments",
  ],
  business: [
    "conversations",
    "contacts",
    "campaigns",
    "flows",
    "flows_advanced",
    "agents",
    "ai_agents",
    "internal_chat",
    "sales",
    "cobrancas",
    "segmentation",
    "reports",
    "departments",
    "google_maps_leads",
    "instagram_leads",
    "tiktok_leads",
    "facebook_ads_spy",
    "auto_prospecting",
    "image_designer",
    "birthday_campaigns",
    "priority_support",
  ],
};

async function applyPlanToCompany(
  admin: ReturnType<typeof createClient>,
  companyId: string,
  tier: string,
  billing?: string,
  active = true,
) {
  const features = PLAN_FEATURES[tier] || PLAN_FEATURES.start;
  const patch: Record<string, unknown> = {
    plan: tier,
    features,
    is_active: active,
    updated_at: new Date().toISOString(),
  };
  if (billing) patch["billing_cycle"] = billing;
  const { error } = await admin.from("companies").update(patch).eq("id", companyId);
  if (error) console.error("apply plan error", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const accessToken = Deno.env.get("MERCADOPAGO_PLATFORM_ACCESS_TOKEN");

  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const type =
      (body as any)?.type ||
      params.type ||
      (body as any)?.topic ||
      params.topic ||
      (body as any)?.action;
    const dataId = (body as any)?.data?.id || params["data.id"] || params.id;

    console.log("MP webhook", { type, dataId, params, body });

    if (!accessToken) throw new Error("MERCADOPAGO_PLATFORM_ACCESS_TOKEN missing");
    if (!dataId) return new Response("ok", { headers: corsHeaders });

    const isPreapproval =
      typeof type === "string" &&
      (type.includes("preapproval") || type === "subscription_preapproval");
    const isPayment =
      typeof type === "string" && (type.includes("payment") || type === "authorized_payment");

    if (isPreapproval) {
      const res = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const preap = await res.json();
      if (!res.ok) throw new Error(preap?.message || "erro ao ler preapproval");

      let ref: any = {};
      try {
        ref = JSON.parse(preap.external_reference || "{}");
      } catch {
        /* ignore */
      }

      const mpStatus = preap.status as string;
      const statusMap: Record<string, string> = {
        authorized: "authorized",
        paused: "paused",
        cancelled: "cancelled",
        pending: "pending",
        finished: "expired",
      };
      const newStatus = statusMap[mpStatus] || "pending";

      const nextEnd = preap.next_payment_date || null;
      const amount = preap?.auto_recurring?.transaction_amount ?? null;

      // Ensure a subscription row exists (upsert-like)
      const { data: existing } = await admin
        .from("platform_subscriptions")
        .select("id")
        .eq("mp_preapproval_id", dataId)
        .maybeSingle();

      const subPatch: Record<string, unknown> = {
        status: newStatus,
        current_period_end: nextEnd,
        raw: preap,
        updated_at: new Date().toISOString(),
      };
      if (ref?.tier) subPatch.tier = ref.tier;
      if (ref?.billing) subPatch.billing = ref.billing;
      if (amount != null) subPatch.amount = amount;

      if (existing?.id) {
        await admin.from("platform_subscriptions").update(subPatch).eq("id", existing.id);
      } else if (ref?.company_id && ref?.tier && ref?.billing) {
        await admin.from("platform_subscriptions").insert({
          company_id: ref.company_id,
          user_id: ref.user_id ?? null,
          tier: ref.tier,
          billing: ref.billing,
          amount: amount ?? 0,
          mp_preapproval_id: dataId,
          status: newStatus,
          current_period_end: nextEnd,
          raw: preap,
        });
      }

      if (newStatus === "authorized" && ref?.company_id && ref?.tier) {
        await applyPlanToCompany(admin, ref.company_id, ref.tier, ref.billing, true);
        console.log("Plan activated", ref.tier, "→ company", ref.company_id);
      }

      if ((newStatus === "cancelled" || newStatus === "expired") && ref?.company_id) {
        await applyPlanToCompany(admin, ref.company_id, "start", ref.billing, true);
        console.log("Plan downgraded to start for company", ref.company_id);
      }

      if (newStatus === "paused" && ref?.company_id) {
        // keep tier but flag inactive so gates block usage
        await admin
          .from("companies")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", ref.company_id);
      }
    } else if (isPayment) {
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${dataId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const pay = await res.json().catch(() => null);
      const preapId = pay?.preapproval_id;
      if (preapId && pay?.status === "approved") {
        // mark last payment
        const { data: sub } = await admin
          .from("platform_subscriptions")
          .select("id, company_id, tier, billing, status")
          .eq("mp_preapproval_id", preapId)
          .maybeSingle();

        if (sub) {
          await admin
            .from("platform_subscriptions")
            .update({
              last_payment_at: new Date().toISOString(),
              status: "authorized",
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          // ensure plan is applied on the company too
          if (sub.company_id && sub.tier) {
            await applyPlanToCompany(admin, sub.company_id, sub.tier, sub.billing, true);
          }
        }
      }
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("webhook error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
