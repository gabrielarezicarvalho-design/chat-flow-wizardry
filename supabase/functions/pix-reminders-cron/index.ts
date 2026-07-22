import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: Array<Record<string, unknown>> = [];
  const now = new Date();

  try {
    // Load all MP configs with reminders enabled
    const { data: configs, error: cfgErr } = await supabase
      .from("mercado_pago_configs")
      .select("company_id, reminders_enabled, reminder_days_before, reminder_interval_hours, remind_after_due, reminder_template, reminder_templates, pix_template, default_connection_id")
      .eq("reminders_enabled", true);
    if (cfgErr) throw cfgErr;

    for (const cfg of configs || []) {
      const daysBefore = cfg.reminder_days_before ?? 3;
      const intervalHours = cfg.reminder_interval_hours ?? 24;
      const remindAfter = cfg.remind_after_due ?? true;

      // Window: from today to (today + daysBefore). If remindAfter, no upper limit.
      const upper = new Date(now);
      upper.setDate(upper.getDate() + daysBefore);
      const upperISO = upper.toISOString().slice(0, 10);

      let query = supabase
        .from("cobrancas")
        .select("*")
        .eq("company_id", cfg.company_id)
        .eq("status", "pending")
        .not("telefone", "is", null);

      if (!remindAfter) {
        query = query.lte("vencimento", upperISO);
        // also gte today handled below in code (allow overdue only if remindAfter)
      } else {
        query = query.lte("vencimento", upperISO);
      }

      const { data: cobrancas, error: cbErr } = await query;
      if (cbErr) {
        results.push({ company_id: cfg.company_id, error: cbErr.message });
        continue;
      }

      for (const c of cobrancas || []) {
        // Only send if has pix generated
        if (!c.pix_copia_cola && !c.checkout_url) continue;

        // Skip overdue if remindAfter=false
        const dueDate = new Date((c.vencimento as string) + "T00:00:00");
        const isOverdue = dueDate < new Date(now.toDateString());
        if (isOverdue && !remindAfter) continue;

        // Respect interval since last reminder
        if (c.last_reminder_at) {
          const last = new Date(c.last_reminder_at as string);
          const hoursSince = (now.getTime() - last.getTime()) / 36e5;
          if (hoursSince < intervalHours) continue;
        }

        // Escolhe template baseado nos dias até o vencimento
        const daysDiff = Math.floor((dueDate.getTime() - new Date(now.toDateString()).getTime()) / 86400000);
        const tplMap = (cfg as any).reminder_templates || {};
        let tplEntry: any = null;
        if (daysDiff < 0) tplEntry = tplMap.overdue;
        else if (daysDiff === 0) tplEntry = tplMap.on_day;
        else if (daysDiff === 1) tplEntry = tplMap.before_1;
        else tplEntry = tplMap.before_3;
        const tpl = (tplEntry && tplEntry.text) || cfg.reminder_template || cfg.pix_template ||
          "Lembrete de Pix R$ {valor} — {link_pagamento}";

        const diasAtraso = daysDiff < 0 ? Math.abs(daysDiff) : 0;
        const text = render(tpl, {
          cliente: c.cliente_nome || "",
          valor: fmtBRL(c.valor as number),
          descricao: c.descricao || "",
          vencimento: fmtDate(c.vencimento as string),
          dias_atraso: String(diasAtraso),
          pix_copia_cola: c.pix_copia_cola || "",
          link_pagamento: c.checkout_url || "",
          telefone: c.telefone || "",
        });

        const connectionId = c.whatsapp_connection_id || cfg.default_connection_id;
        if (!connectionId) {
          results.push({ cobranca_id: c.id, skipped: "no_connection" });
          continue;
        }

        const { error: sErr } = await supabase.functions.invoke("wa-send-text", {
          body: { connectionId, phone: c.telefone, text },
        });

        // Registra histórico do lembrete (sucesso ou falha)
        await supabase.from("pix_reminder_history").insert({
          company_id: cfg.company_id,
          cobranca_id: c.id,
          connection_id: connectionId,
          telefone: c.telefone,
          cliente_nome: c.cliente_nome,
          valor: c.valor,
          vencimento: c.vencimento,
          template: tpl,
          message_text: text,
          pix_copia_cola: c.pix_copia_cola,
          link_pagamento: c.checkout_url,
          source: "cron",
          success: !sErr,
          error_message: sErr ? sErr.message : null,
        });

        if (sErr) {
          results.push({ cobranca_id: c.id, error: sErr.message });
          continue;
        }

        await supabase
          .from("cobrancas")
          .update({
            last_reminder_at: now.toISOString(),
            reminder_count: (c.reminder_count ?? 0) + 1,
          })
          .eq("id", c.id);

        results.push({ cobranca_id: c.id, sent: true, overdue: isOverdue });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("pix-reminders-cron error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
