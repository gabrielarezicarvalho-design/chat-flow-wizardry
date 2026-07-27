import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const accessToken = Deno.env.get("MERCADOPAGO_PLATFORM_ACCESS_TOKEN");

  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const type = (body as any)?.type || params.type || (body as any)?.topic || params.topic;
    const dataId = (body as any)?.data?.id || params["data.id"] || params.id;

    console.log("MP webhook", { type, dataId, params });

    if (!accessToken) throw new Error("MERCADOPAGO_PLATFORM_ACCESS_TOKEN missing");
    if (!dataId) return new Response("ok", { headers: corsHeaders });

    if (type === "preapproval" || type === "subscription_preapproval") {
      const res = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const preap = await res.json();
      if (!res.ok) throw new Error(preap?.message || "erro ao ler preapproval");

      let ref: any = {};
      try { ref = JSON.parse(preap.external_reference || "{}"); } catch { /* ignore */ }

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

      await admin
        .from("platform_subscriptions")
        .update({
          status: newStatus,
          current_period_end: nextEnd,
          raw: preap,
        })
        .eq("mp_preapproval_id", dataId);

      // On authorized: apply plan tier to the company
      if (newStatus === "authorized" && ref?.company_id && ref?.tier) {
        await admin
          .from("companies")
          .update({ plan: ref.tier, is_active: true })
          .eq("id", ref.company_id);
        console.log("Applied plan", ref.tier, "to company", ref.company_id);
      }
      if ((newStatus === "cancelled" || newStatus === "expired") && ref?.company_id) {
        // downgrade to start (or you can disable). Keep company active.
        await admin
          .from("companies")
          .update({ plan: "start" })
          .eq("id", ref.company_id);
      }
    } else if (type === "authorized_payment" || type === "payment") {
      // record last_payment_at
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${dataId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const pay = await res.json().catch(() => null);
      const preapId = pay?.preapproval_id;
      if (preapId && pay?.status === "approved") {
        await admin
          .from("platform_subscriptions")
          .update({ last_payment_at: new Date().toISOString() })
          .eq("mp_preapproval_id", preapId);
      }
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (err) {
    console.error("webhook error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
