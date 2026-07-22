import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Webhook público do Mercado Pago.
// Configure a URL no painel do Mercado Pago:
//   https://<PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // MP envia notificações via POST (topic/type + data.id) e também via query string
    const url = new URL(req.url);
    let paymentId: string | null =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      null;
    let topic: string | null =
      url.searchParams.get("type") ||
      url.searchParams.get("topic") ||
      null;

    let payload: any = null;
    if (req.method === "POST") {
      try {
        payload = await req.json();
      } catch (_) {
        payload = null;
      }
      if (payload) {
        paymentId = paymentId || payload?.data?.id?.toString() || payload?.id?.toString() || null;
        topic = topic || payload?.type || payload?.topic || null;
      }
    }

    console.log("MP webhook received", { topic, paymentId, method: req.method });

    // Só processamos eventos de pagamento
    if (!paymentId || (topic && !String(topic).includes("payment"))) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Busca a cobrança pelo payment_id para descobrir a empresa e o access_token
    const { data: cobranca, error: cErr } = await supabase
      .from("cobrancas")
      .select("id, company_id, status")
      .eq("mercado_pago_payment_id", paymentId)
      .maybeSingle();

    if (cErr) console.error("Erro ao buscar cobrança", cErr);

    if (!cobranca) {
      console.warn("Cobrança não encontrada para payment", paymentId);
      // Responde 200 para o MP não reenviar infinitamente
      return new Response(JSON.stringify({ ok: true, notFound: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Recupera access_token da empresa para consultar o pagamento na API do MP
    const { data: config } = await supabase
      .from("mercado_pago_configs")
      .select("access_token")
      .eq("company_id", cobranca.company_id)
      .maybeSingle();

    if (!config?.access_token) {
      console.error("Mercado Pago não configurado para company", cobranca.company_id);
      return new Response(JSON.stringify({ ok: false, error: "mp_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Consulta o pagamento no MP para confirmar o status real (não confiar só no payload)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${config.access_token}` },
    });
    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Erro ao consultar MP payment", mpData);
      return new Response(JSON.stringify({ ok: false, details: mpData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const mpStatus = mpData?.status; // approved | pending | rejected | cancelled | refunded
    console.log("MP payment status", { paymentId, mpStatus });

    let newStatus: string | null = null;
    let paidAt: string | null = null;

    if (mpStatus === "approved") {
      newStatus = "paid";
      paidAt = mpData?.date_approved || new Date().toISOString();
    } else if (mpStatus === "cancelled" || mpStatus === "rejected") {
      newStatus = "canceled";
    } else if (mpStatus === "refunded" || mpStatus === "charged_back") {
      newStatus = "canceled";
    }

    if (newStatus && newStatus !== cobranca.status) {
      const { error: upErr } = await supabase
        .from("cobrancas")
        .update({
          status: newStatus,
          paid_at: paidAt,
        })
        .eq("id", cobranca.id);

      if (upErr) {
        console.error("Erro atualizando cobrança", upErr);
      } else {
        console.log("Cobrança atualizada", { id: cobranca.id, status: newStatus });

        // Dispara envio automático da confirmação de pagamento no WhatsApp
        if (newStatus === "paid") {
          try {
            const { error: sendErr } = await supabase.functions.invoke(
              "pix-send-confirmation",
              { body: { cobrancaId: cobranca.id } }
            );
            if (sendErr) console.error("Falha ao enviar confirmação", sendErr);
          } catch (e) {
            console.error("Erro invocando pix-send-confirmation", e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, cobrancaId: cobranca.id, status: newStatus || cobranca.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("Webhook error", e);
    // Sempre 200 para evitar reenvios infinitos do MP
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
