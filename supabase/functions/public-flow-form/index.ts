import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const formId = String(body?.formId ?? "");

    if (!UUID_RE.test(formId)) return json({ error: "invalid formId" }, 400);

    const { data: form, error } = await supabase
      .from("flow_forms")
      .select("id, connection_id, phone, initial_message, questions, answered, expires_at, created_at")
      .eq("id", formId)
      .maybeSingle();

    if (error) return json({ error: "database error" }, 500);
    if (!form) return json({ error: "not_found" }, 404);

    const expired = new Date(form.expires_at) < new Date();

    if (action === "get") {
      return json({ form, expired });
    }

    if (action === "submit") {
      if (expired) return json({ error: "expired" }, 410);
      if (form.answered) return json({ error: "already_answered" }, 409);

      const name = String(body?.name ?? "").trim().slice(0, 200);
      const phone = String(body?.phone ?? "").replace(/\D/g, "").slice(0, 20);
      const address = String(body?.address ?? "").trim().slice(0, 500);
      const answers = body?.answers;

      if (!name) return json({ error: "name required" }, 400);
      if (phone.length < 10 || phone.length > 13) return json({ error: "invalid phone" }, 400);
      if (answers === null || typeof answers !== "object" || Array.isArray(answers)) {
        return json({ error: "invalid answers" }, 400);
      }
      if (JSON.stringify(answers).length > 20000) return json({ error: "answers too large" }, 400);

      const { error: insErr } = await supabase.from("leads_forms_responses").insert({
        form_id: form.id,
        connection_id: form.connection_id,
        phone,
        name,
        address,
        answers,
      });
      if (insErr) {
        console.error("insert error", insErr);
        return json({ error: "could not save" }, 500);
      }

      await supabase.from("flow_forms").update({ answered: true }).eq("id", form.id);

      return json({ success: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("public-flow-form error", e);
    return json({ error: "unexpected error" }, 500);
  }
});
