import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Sessão inválida");

    const { cobrancaId } = await req.json();
    if (!cobrancaId) throw new Error("cobrancaId obrigatório");

    const { data: cobranca, error: cErr } = await supabase
      .from("cobrancas")
      .select("*")
      .eq("id", cobrancaId)
      .maybeSingle();
    if (cErr || !cobranca) throw new Error("Cobrança não encontrada");

    const { data: config } = await supabase
      .from("mercado_pago_configs")
      .select("access_token")
      .eq("company_id", cobranca.company_id)
      .maybeSingle();

    if (!config?.access_token) {
      throw new Error("Mercado Pago não configurado. Adicione seu Access Token na aba Pagamentos.");
    }

    const idempotencyKey = crypto.randomUUID();
    const body = {
      transaction_amount: Number(cobranca.valor),
      description: cobranca.descricao || `Cobrança ${cobranca.cliente_nome}`,
      payment_method_id: "pix",
      payer: {
        email: `cliente-${cobranca.id.slice(0, 8)}@marketflow.local`,
        first_name: cobranca.cliente_nome?.split(" ")[0] || "Cliente",
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP error", mpData);
      throw new Error(mpData?.message || "Erro ao criar Pix no Mercado Pago");
    }

    const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code_base64;
    const copiaCola = mpData?.point_of_interaction?.transaction_data?.qr_code;
    const ticketUrl = mpData?.point_of_interaction?.transaction_data?.ticket_url;

    await supabase
      .from("cobrancas")
      .update({
        pix_qr_code: qrCode || null,
        pix_copia_cola: copiaCola || null,
        checkout_url: ticketUrl || null,
        mercado_pago_payment_id: String(mpData?.id || ""),
      })
      .eq("id", cobrancaId);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: mpData?.id,
        qr_code_base64: qrCode,
        copia_cola: copiaCola,
        ticket_url: ticketUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
