import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_TPL = `✅ *Pagamento confirmado!*

Olá {nome}, recebemos seu pagamento de *R$ {valor}* referente a *{descricao}*.

Muito obrigado! 🙌`;

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(Number(v || 0));
}
function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cobrancaId } = await req.json();
    if (!cobrancaId) throw new Error("cobrancaId obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cobranca } = await supabase
      .from("cobrancas")
      .select("*")
      .eq("id", cobrancaId)
      .maybeSingle();
    if (!cobranca) throw new Error("Cobrança não encontrada");
    if (cobranca.status !== "paid") {
      return new Response(JSON.stringify({ ok: false, reason: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cobranca.confirmation_sent_at) {
      return new Response(JSON.stringify({ ok: true, already_sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cobranca.telefone) throw new Error("Cobrança sem telefone");

    const { data: config } = await supabase
      .from("mercado_pago_configs")
      .select("confirmation_template, confirmation_enabled, default_connection_id")
      .eq("company_id", cobranca.company_id)
      .maybeSingle();

    if (config && config.confirmation_enabled === false) {
      return new Response(JSON.stringify({ ok: false, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Descobre a conexão de WhatsApp (mesma lógica do send-pix-whatsapp)
    let connectionId: string | undefined =
      cobranca.whatsapp_connection_id || config?.default_connection_id;
    if (!connectionId) {
      const { data: anyConn } = await supabase
        .from("connections")
        .select("id")
        .eq("company_id", cobranca.company_id)
        .in("status", ["connected", "open", "active", "ready"])
        .limit(1)
        .maybeSingle();
      connectionId = anyConn?.id;
    }
    if (!connectionId) {
      const { data: anyConn2 } = await supabase
        .from("connections")
        .select("id")
        .eq("company_id", cobranca.company_id)
        .limit(1)
        .maybeSingle();
      connectionId = anyConn2?.id;
    }
    if (!connectionId) throw new Error("Nenhuma conexão WhatsApp disponível");

    const tpl = (config?.confirmation_template || DEFAULT_TPL).trim();
    const text = render(tpl, {
      nome: cobranca.cliente_nome || "",
      valor: fmtBRL(Number(cobranca.valor || 0)),
      descricao: cobranca.descricao || "",
    });

    const { data: sendData, error: sendErr } = await supabase.functions.invoke("wa-send-text", {
      body: { connectionId, phone: cobranca.telefone, text },
    });

    if (sendErr) throw new Error(`Falha no envio: ${sendErr.message}`);

    await supabase
      .from("cobrancas")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", cobrancaId);

    return new Response(JSON.stringify({ ok: true, sent: true, sendData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pix-send-confirmation error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
