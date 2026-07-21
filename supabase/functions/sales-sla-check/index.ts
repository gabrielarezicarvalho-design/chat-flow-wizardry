// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Load per-company SLA settings
    const { data: settings, error: sErr } = await supabase
      .from("sales_settings")
      .select("company_id, sla_minutes");
    if (sErr) throw sErr;

    let flagged = 0;
    let cleared = 0;

    for (const s of settings ?? []) {
      const cutoff = new Date(Date.now() - (s.sla_minutes ?? 30) * 60_000).toISOString();

      // Conversations assigned to a human agent, open, last message from client older than cutoff → flag
      const { data: toFlag } = await supabase
        .from("conversations")
        .select("id")
        .eq("company_id", s.company_id)
        .eq("status", "open")
        .eq("attendance_type", "agent")
        .eq("sla_flagged", false)
        .lt("last_message_at", cutoff)
        .not("assigned_to", "is", null);

      if (toFlag && toFlag.length > 0) {
        const ids = toFlag.map((c: any) => c.id);
        await supabase
          .from("conversations")
          .update({ sla_flagged: true, sla_flagged_at: new Date().toISOString() })
          .in("id", ids);
        flagged += ids.length;
      }

      // Clear flag when conversation moved recently (last_message_at newer than cutoff)
      const { data: toClear } = await supabase
        .from("conversations")
        .select("id")
        .eq("company_id", s.company_id)
        .eq("sla_flagged", true)
        .gt("last_message_at", cutoff);

      if (toClear && toClear.length > 0) {
        const ids = toClear.map((c: any) => c.id);
        await supabase
          .from("conversations")
          .update({ sla_flagged: false, sla_flagged_at: null })
          .in("id", ids);
        cleared += ids.length;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, flagged, cleared }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("sales-sla-check error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
