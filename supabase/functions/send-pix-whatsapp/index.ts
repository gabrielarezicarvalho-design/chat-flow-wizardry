import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(Number(v || 0));
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("pt-BR");
}
function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cobrancaId, connectionId: overrideConnId } = await req.json();
    if (!cobrancaId) throw new Error("cobrancaId obrigatório");

    // Usa service_role para poder ser invocado por outra edge function (create-pix)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cobranca, error: cErr } = await supabase
      .from("cobrancas")
      .select("*")
      .eq("id", cobrancaId)
      .maybeSingle();
    if (cErr || !cobranca) throw new Error("Cobrança não encontrada");
    if (!cobranca.telefone) throw new Error("Cobrança sem telefone do cliente");
    if (!cobranca.pix_copia_cola && !cobranca.checkout_url) {
      throw new Error("Cobrança sem Pix gerado. Gere o Pix antes de enviar.");
    }

    const { data: config } = await supabase
      .from("mercado_pago_configs")
      .select("pix_template, auto_send, default_connection_id")
      .eq("company_id", cobranca.company_id)
      .maybeSingle();

    const connectionId =
      overrideConnId ||
      cobranca.whatsapp_connection_id ||
      config?.default_connection_id;

    if (!connectionId) throw new Error("Nenhuma conexão WhatsApp definida para envio");

    const tpl =
      config?.pix_template ||
      "Olá {cliente}! Segue seu Pix de R$ {valor}\n\nCopia e cola:\n{pix_copia_cola}\n\nLink: {link_pagamento}";

    const text = render(tpl, {
      cliente: cobranca.cliente_nome || "",
      valor: fmtBRL(cobranca.valor),
      descricao: cobranca.descricao || "",
      vencimento: fmtDate(cobranca.vencimento),
      pix_copia_cola: cobranca.pix_copia_cola || "",
      link_pagamento: cobranca.checkout_url || "",
      telefone: cobranca.telefone || "",
    });

    const { data: sent, error: sErr } = await supabase.functions.invoke("wa-send-text", {
      body: { connectionId, phone: cobranca.telefone, text },
    });

    // Registra histórico do lembrete (sucesso ou falha)
    await supabase.from("pix_reminder_history").insert({
      company_id: cobranca.company_id,
      cobranca_id: cobranca.id,
      connection_id: connectionId,
      telefone: cobranca.telefone,
      cliente_nome: cobranca.cliente_nome,
      valor: cobranca.valor,
      vencimento: cobranca.vencimento,
      template: tpl,
      message_text: text,
      pix_copia_cola: cobranca.pix_copia_cola,
      link_pagamento: cobranca.checkout_url,
      source: "manual",
      success: !sErr,
      error_message: sErr ? (sErr.message || "Falha ao enviar WhatsApp") : null,
    });

    if (sErr) throw new Error(sErr.message || "Falha ao enviar WhatsApp");

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("send-pix-whatsapp error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
