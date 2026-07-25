import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isEvolutionConnection,
  resolveEvolutionCreds,
  evolutionFindContacts,
  evolutionCheckNumbers,
} from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const extractPhoneFromJid = (jid: string): string =>
  String(jid || "").replace(/@.*$/, "").replace(/\D/g, "");

// Only real user contacts. Skip groups, broadcasts, newsletters, status, LID (hidden IDs).
const isIndividualJid = (jid: string): boolean => {
  const s = String(jid || "").toLowerCase();
  if (!s) return false;
  if (s.includes("@g.us")) return false;
  if (s.includes("@broadcast")) return false;
  if (s.includes("@newsletter")) return false;
  if (s.includes("@lid")) return false;
  if (s.startsWith("status@")) return false;
  // Accept @s.whatsapp.net, @c.us, or bare numeric ids
  return s.includes("@s.whatsapp.net") || s.includes("@c.us") || /^\d+$/.test(s);
};

const normalizeContactsPayload = (result: any): any[] => {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    return result.contacts || result.data || result.response || [];
  }
  return [];
};

// Evolution also returns unsaved numbers discovered in groups/chats. Those are
// not phonebook contacts and must never be imported into the leads list.
const isSavedEvolutionContact = (contact: any): boolean => {
  if (contact?.isGroup === true) return false;
  if (typeof contact?.isSaved === "boolean" && !contact.isSaved) return false;
  if (typeof contact?.type === "string" && contact.type.toLowerCase() !== "contact") return false;
  return true;
};

const contactName = (contact: any): string => {
  const value = contact?.name || contact?.pushName || contact?.notify || contact?.contact_name;
  return typeof value === "string" && value.trim() ? value.trim() : "Sem nome";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, connectionId, phone, name, numbers, token, environment, userId } =
      await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let connection: any = null;
    let instanceToken = token;
    let baseUrl = "";

    if (connectionId) {
      const { data: conn, error: connError } = await supabase
        .from("connections")
        .select("*")
        .eq("id", connectionId)
        .single();
      if (connError || !conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      connection = conn;
      instanceToken = conn.token;
      baseUrl = conn.base_url || "";
    } else if (token && environment) {
      instanceToken = token;
      baseUrl = environment === "PROD" ? "https://app.uazapi.com" : "https://free.uazapi.com";
    }

    const isEvo = connection ? isEvolutionConnection(connection) : false;
    const evoCreds = isEvo ? resolveEvolutionCreds(connection) : null;

    if (!isEvo && !instanceToken) {
      return new Response(JSON.stringify({ error: "Missing token or connectionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isEvo && !baseUrl) {
      return new Response(JSON.stringify({ error: "Could not determine base_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isEvo && !evoCreds) {
      return new Response(
        JSON.stringify({ error: "Evolution connection missing base_url, token or instance_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- SYNC ----------
    if (action === "sync") {
      const ownerId = userId || connection?.user_id;
      if (!ownerId) {
        return new Response(JSON.stringify({ error: "Missing user_id for sync" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let contacts: any[] = [];
      if (isEvo && evoCreds) {
        const r = await evolutionFindContacts(evoCreds);
        if (!r.ok) {
          return new Response(
            JSON.stringify({ success: false, error: "Falha ao buscar contatos (Evolution)", details: r.data }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        contacts = normalizeContactsPayload(r.data);
      } else {
        const response = await fetch(`${baseUrl}/contacts`, {
          method: "GET",
          headers: { Accept: "application/json", "Content-Type": "application/json", token: instanceToken },
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          const isAuth = response.status === 401 || /invalid token/i.test(errText);
          return new Response(
            JSON.stringify({
              success: false,
              error: isAuth
                ? "Token da instância WhatsApp inválido ou expirado. Reconecte em Conexões."
                : `Falha ao buscar contatos (HTTP ${response.status})`,
              needsReconnect: isAuth,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        contacts = normalizeContactsPayload(await response.json().catch(() => []));
      }

      const { data: existingLeads } = await supabase
        .from("leads")
        .select("phone, source")
        .eq("user_id", ownerId);
      const existingPhones = new Set(
        (existingLeads || [])
          .filter((lead: any) => lead.source !== "WhatsApp Sync")
          .map((lead: any) => String(lead.phone || "").replace(/\D/g, ""))
          .filter(Boolean),
      );

      let skippedCount = 0;
      const seen = new Set<string>();
      const rows: any[] = [];

      for (const contact of contacts) {
        if (isEvo && !isSavedEvolutionContact(contact)) { skippedCount++; continue; }
        const rawJid =
          contact.remoteJid || contact.jid || contact.id || contact.number || "";
        if (!isIndividualJid(rawJid)) { skippedCount++; continue; }
        const p = extractPhoneFromJid(rawJid);
        if (!p || p.length < 8 || p.length > 15) { skippedCount++; continue; }
        if (seen.has(p) || existingPhones.has(p)) { skippedCount++; continue; }
        seen.add(p);
        rows.push({
          user_id: ownerId,
          phone: p,
          name: contactName(contact),
          source: "WhatsApp Sync",
          status: "new",
        });
      }

      // A sync is a fresh mirror of the connected phonebook. Remove records from
      // earlier syncs (including group members imported by previous versions).
      const { error: clearError } = await supabase
        .from("leads")
        .delete()
        .eq("user_id", ownerId)
        .eq("source", "WhatsApp Sync");
      if (clearError) {
        throw new Error(`Falha ao limpar sincronização anterior: ${clearError.message}`);
      }

      // Bulk insert in chunks (avoids one-by-one round-trips that time out).
      let addedCount = 0;
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const { data: inserted, error } = await supabase
          .from("leads")
          .insert(slice)
          .select("id");
        if (error) {
          console.error("[wa-contacts] bulk insert error:", error.message);
          skippedCount += slice.length;
        } else {
          addedCount += inserted?.length ?? slice.length;
        }
      }

      return new Response(
        JSON.stringify({ success: true, added: addedCount, skipped: skippedCount, total: contacts.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- LIST ----------
    if (action === "list") {
      if (isEvo && evoCreds) {
        const r = await evolutionFindContacts(evoCreds);
        const all = normalizeContactsPayload(r.data);
        const filtered = all
          .filter((c: any) =>
            isSavedEvolutionContact(c) &&
            isIndividualJid(c.remoteJid || c.jid || c.id || c.number || ""),
          )
          .map((c: any) => ({
            ...c,
            phone: extractPhoneFromJid(c.remoteJid || c.jid || c.id || c.number || ""),
            name: contactName(c),
          }));
        return new Response(
          JSON.stringify({ success: r.ok, contacts: filtered }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const r = await fetch(`${baseUrl}/contacts`, {
        headers: { Accept: "application/json", token: instanceToken },
      });
      const data = await r.json().catch(() => []);
      return new Response(
        JSON.stringify({ success: r.ok, contacts: normalizeContactsPayload(data) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- CHECK numbers exist on WhatsApp ----------
    if (action === "check") {
      if (!numbers || !Array.isArray(numbers)) {
        return new Response(JSON.stringify({ error: "Missing numbers array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (isEvo && evoCreds) {
        const r = await evolutionCheckNumbers({ ...evoCreds, numbers });
        return new Response(JSON.stringify({ success: r.ok, results: r.data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`${baseUrl}/chat/check`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", token: instanceToken },
        body: JSON.stringify({ numbers: numbers.map((n: string) => n.replace(/\D/g, "")) }),
      });
      return new Response(JSON.stringify({ success: r.ok, results: await r.json().catch(() => ({})) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- ADD contact to WhatsApp phonebook ----------
    if (action === "add") {
      if (!phone || !name) {
        return new Response(JSON.stringify({ error: "Missing phone or name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Evolution API v2 has no native phonebook endpoint; store locally.
      if (isEvo) {
        const ownerId = userId || connection?.user_id;
        if (ownerId) {
          await supabase.from("leads").upsert(
            { user_id: ownerId, phone: phone.replace(/\D/g, ""), name, source: "Manual", status: "new" },
            { onConflict: "user_id,phone", ignoreDuplicates: true },
          );
        }
        return new Response(JSON.stringify({ success: true, localOnly: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`${baseUrl}/contact/add`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", token: instanceToken },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), name }),
      });
      return new Response(JSON.stringify({ success: r.ok, data: await r.json().catch(() => ({})) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use list, add, check, sync" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[wa-contacts] error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
