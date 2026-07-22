import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Cron de fallback: consulta o status no Mercado Pago para cobranças ainda pendentes
// (caso o webhook não tenha sido configurado ou tenha falhado) e, quando aprovado,
// atualiza o registro e dispara a mensagem de confirmação no WhatsApp.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: any[] = [];

  try {
    // Verifica cobranças criadas nas últimas 48h que ainda não foram pagas
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: cobrancas, error } = await supabase
      .from("cobrancas")
      .select("id, company_id, status, mercado_pago_payment_id")
      .eq("status", "pending")
      .not("mercado_pago_payment_id", "is", null)
      .gte("created_at", since)
      .limit(200);

    if (error) throw error;

    // Cache dos access_tokens por empresa
    const tokenCache = new Map<string, string>();
    async function getToken(companyId: string): Promise<string | null> {
      if (tokenCache.has(companyId)) return tokenCache.get(companyId)!;
      const { data } = await supabase
        .from("mercado_pago_configs")
        .select("access_token")
        .eq("company_id", companyId)
        .maybeSingle();
      const t = data?.access_token || null;
      if (t) tokenCache.set(companyId, t);
      return t;
    }

    for (const c of cobrancas || []) {
      try {
        const token = await getToken(c.company_id);
        if (!token) continue;

        const mpRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${c.mercado_pago_payment_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const mp = await mpRes.json();
        if (!mpRes.ok) {
          results.push({ id: c.id, error: mp });
          continue;
        }

        if (mp?.status === "approved") {
          await supabase
            .from("cobrancas")
            .update({
              status: "paid",
              paid_at: mp?.date_approved || new Date().toISOString(),
            })
            .eq("id", c.id);

          // Envia confirmação (a função é idempotente via confirmation_sent_at)
          const { data: sendData, error: sendErr } = await supabase.functions.invoke(
            "pix-send-confirmation",
            { body: { cobrancaId: c.id } }
          );
          results.push({ id: c.id, paid: true, sendErr: sendErr?.message, sendData });
        } else if (mp?.status === "cancelled" || mp?.status === "rejected") {
          await supabase.from("cobrancas").update({ status: "canceled" }).eq("id", c.id);
          results.push({ id: c.id, canceled: true });
        } else {
          results.push({ id: c.id, status: mp?.status });
        }
      } catch (e) {
        results.push({ id: c.id, error: String((e as Error).message || e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: cobrancas?.length || 0, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pix-payment-check-cron error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
