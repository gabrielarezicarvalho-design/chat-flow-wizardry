import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const today = now.getDate();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayISO = now.toISOString().slice(0, 10);

  const results: Array<Record<string, unknown>> = [];

  try {
    // Só rodamos se hoje for dia 5 ou 15
    if (today !== 5 && today !== 15) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: `Hoje é dia ${today}, cron só roda em dias 5 e 15.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: recorrencias, error: rErr } = await supabase
      .from("cobrancas_recorrentes")
      .select("*")
      .eq("status", "ativa")
      .eq("dia_vencimento", today);

    if (rErr) throw rErr;

    for (const rec of recorrencias || []) {
      // Verifica se já gerou este mês (evita duplicar em re-execuções)
      if (rec.ultima_geracao_em) {
        const last = new Date(rec.ultima_geracao_em as string);
        const lastYM = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}`;
        if (lastYM === yearMonth) {
          results.push({ recorrencia_id: rec.id, skipped: "already_generated_this_month" });
          continue;
        }
      }

      // Cria cobrança
      const { data: novaCobranca, error: cErr } = await supabase
        .from("cobrancas")
        .insert({
          company_id: rec.company_id,
          user_id: rec.user_id,
          cliente_nome: rec.cliente_nome,
          telefone: rec.telefone,
          valor: rec.valor,
          descricao: rec.descricao || `Mensalidade ${rec.cliente_nome}`,
          vencimento: todayISO,
          recorrencia: "mensal",
          whatsapp_connection_id: rec.connection_id,
          status: "pending",
        })
        .select()
        .single();

      if (cErr || !novaCobranca) {
        results.push({ recorrencia_id: rec.id, error: cErr?.message || "erro ao criar cobrança" });
        continue;
      }

      // Gera PIX no Mercado Pago (auto-envia WhatsApp se auto_send=true)
      const { error: pixErr } = await supabase.functions.invoke("mercadopago-create-pix", {
        body: { cobrancaId: novaCobranca.id },
      });

      // Atualiza recorrência
      await supabase
        .from("cobrancas_recorrentes")
        .update({
          ultima_geracao_em: now.toISOString(),
          ultima_cobranca_id: novaCobranca.id,
          total_geradas: (rec.total_geradas ?? 0) + 1,
        })
        .eq("id", rec.id);

      results.push({
        recorrencia_id: rec.id,
        cobranca_id: novaCobranca.id,
        cliente: rec.cliente_nome,
        pix_error: pixErr ? pixErr.message : null,
        success: !pixErr,
      });
    }

    return new Response(
      JSON.stringify({ success: true, day: today, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("cobrancas-recorrentes-cron error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
