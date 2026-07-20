import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = "";
  };

  for (const p of paragraphs) {
    if (p.length > CHUNK_SIZE) {
      flush();
      for (let i = 0; i < p.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(p.slice(i, i + CHUNK_SIZE).trim());
      }
      continue;
    }
    if ((buffer + "\n\n" + p).length > CHUNK_SIZE) {
      flush();
      buffer = p;
    } else {
      buffer = buffer ? `${buffer}\n\n${p}` : p;
    }
  }
  flush();
  return chunks;
}

async function embed(inputs: string[], lovableKey: string): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embeddings error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return (data.data ?? []).map((d: any) => d.embedding);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agentId } = await req.json();
    if (!agentId) throw new Error("agentId é obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY não configurada");

    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, company_id, knowledge_text")
      .eq("id", agentId)
      .maybeSingle();
    if (agentErr || !agent) throw new Error("Agente não encontrado");

    const text = (agent.knowledge_text ?? "").trim();

    // Limpa chunks antigos
    await supabase.from("agent_knowledge_chunks").delete().eq("agent_id", agentId);

    if (!text) {
      return new Response(
        JSON.stringify({ success: true, chunks: 0, message: "Base vazia — chunks removidos." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, chunks: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Embed em lotes de 50
    const BATCH = 50;
    const rows: any[] = [];
    let idx = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vectors = await embed(batch, lovableKey);
      for (let j = 0; j < batch.length; j++) {
        rows.push({
          agent_id: agentId,
          company_id: agent.company_id,
          chunk_index: idx++,
          content: batch[j],
          embedding: `[${vectors[j].join(",")}]`,
          token_count: Math.ceil(batch[j].length / 4),
        });
      }
    }

    // Insere em lotes de 100
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase
        .from("agent_knowledge_chunks")
        .insert(rows.slice(i, i + 100));
      if (error) throw new Error(`Erro ao inserir chunks: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, chunks: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("index-agent-knowledge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
