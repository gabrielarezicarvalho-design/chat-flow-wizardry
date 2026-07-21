// AI ad analysis via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const { ad } = await req.json();
    if (!ad) throw new Error("ad é obrigatório");

    const firstImage = ad.images?.[0];
    const context = `
Página: ${ad.page_name || "—"}
Título: ${ad.title || "—"}
Texto do anúncio: ${ad.body || "—"}
CTA: ${ad.cta_text || "—"}
Link: ${ad.link_url || "—"}
Plataformas: ${Array.isArray(ad.platforms) ? ad.platforms.join(", ") : "—"}
Formato: ${ad.display_format || "—"}
Imagens: ${ad.images?.length || 0} | Vídeos: ${ad.videos?.length || 0}
`.trim();

    const userContent: any[] = [
      {
        type: "text",
        text: `Analise este anúncio da Meta Ad Library e retorne em Markdown:

**1. Gancho principal** (headline/promessa)
**2. Público-alvo provável**
**3. Fórmula copy usada** (AIDA, PAS, storytelling etc)
**4. Gatilhos mentais** (escassez, prova social, autoridade...)
**5. Análise do criativo** (cor, estilo, formato)
**6. Pontos fortes**
**7. O que copiar/adaptar** — 3 sugestões práticas de como reutilizar
**8. Copy alternativa pronta** — reescreva o texto no mesmo estilo, adaptado para outro nicho

DADOS DO ANÚNCIO:
${context}`,
      },
    ];

    if (firstImage) {
      userContent.push({ type: "image_url", image_url: { url: firstImage } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em copywriting e mídia paga (Facebook/Instagram Ads). Suas análises são práticas, diretas e acionáveis." },
          { role: "user", content: userContent },
        ],
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`AI Gateway ${res.status}:`, text);
      return new Response(
        JSON.stringify({ error: `AI Gateway ${res.status}`, details: text }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = JSON.parse(text);
    const analysis = data?.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("analyze-ad error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
