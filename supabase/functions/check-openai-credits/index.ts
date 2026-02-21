import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all companies' OpenAI credit configs
    const { data: configs, error } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "openai_credits_config");

    if (error) throw error;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma configuração encontrada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const config of configs) {
      const val = config.value as any;
      if (!val?.enabled || !val?.api_key || !val?.telegram_chat_id) continue;

      try {
        // Check credits
        const headers = {
          Authorization: `Bearer ${val.api_key}`,
          "Content-Type": "application/json",
        };

        const subRes = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", { headers });

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const usageRes = await fetch(
          `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
          { headers }
        );

        let totalUsed = 0;
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          totalUsed = (usageData.total_usage || 0) / 100;
        }

        let totalGranted = 0;
        if (subRes.ok) {
          const subData = await subRes.json();
          totalGranted = subData.hard_limit_usd || subData.system_hard_limit_usd || 120;
        } else {
          totalGranted = 120;
        }

        const totalAvailable = Math.max(0, totalGranted - totalUsed);
        const percentRemaining = totalGranted > 0 ? (totalAvailable / totalGranted) * 100 : 0;
        const threshold = val.threshold || 20;

        // Check if below threshold
        if (percentRemaining <= threshold) {
          // Check cooldown - don't spam alerts (max 1 per 6 hours)
          const lastAlert = val.last_telegram_alert ? new Date(val.last_telegram_alert) : null;
          const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

          if (lastAlert && lastAlert > sixHoursAgo) {
            results.push({ company_id: config.company_id, skipped: true, reason: "cooldown" });
            continue;
          }

          const botToken = val.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
          if (!botToken) {
            results.push({ company_id: config.company_id, skipped: true, reason: "no_bot_token" });
            continue;
          }

          // Send Telegram alert
          const message = `⚠️ *Alerta de Créditos OpenAI*\n\n` +
            `💰 Total: $${totalGranted.toFixed(2)}\n` +
            `📉 Usado: $${totalUsed.toFixed(2)}\n` +
            `✅ Disponível: $${totalAvailable.toFixed(2)}\n` +
            `📊 Restante: ${percentRemaining.toFixed(1)}%\n\n` +
            `🔴 Seus créditos estão abaixo de ${threshold}%!\n` +
            `Considere recarregar em platform.openai.com`;

          const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const telegramRes = await fetch(telegramUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: val.telegram_chat_id,
              text: message,
              parse_mode: "Markdown",
            }),
          });

          const telegramResult = await telegramRes.json();

          // Update last alert timestamp
          await supabase
            .from("settings")
            .update({
              value: { ...val, last_telegram_alert: new Date().toISOString() } as any,
            })
            .eq("id", config.id);

          results.push({
            company_id: config.company_id,
            sent: telegramRes.ok,
            percent: percentRemaining.toFixed(1),
            telegram_ok: telegramResult.ok,
          });
        } else {
          results.push({ company_id: config.company_id, ok: true, percent: percentRemaining.toFixed(1) });
        }
      } catch (err) {
        console.error(`Error checking credits for company ${config.company_id}:`, err);
        results.push({ company_id: config.company_id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in check-openai-credits:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
