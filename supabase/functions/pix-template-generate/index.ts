// deno-lint-ignore-file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_LABELS: Record<string, string> = {
  before_3: "3 dias antes do vencimento",
  before_1: "1 dia antes do vencimento",
  on_day: "no dia do vencimento",
  overdue: "após o vencimento (cliente em atraso, use a variável {dias_atraso})",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { windowKey, tone } = await req.json();
    const label = WINDOW_LABELS[windowKey] || "lembrete de cobrança";
    const toneDesc =
      tone === "Firme"
        ? "tom firme, direto, profissional, sem ser rude"
        : "tom cordial, gentil, amigável, com 1 ou 2 emojis";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const sys = `Você gera mensagens curtas de WhatsApp para cobranças de Pix em português do Brasil.
Regras:
- Use apenas as variáveis: {cliente} {valor} {vencimento} {descricao} {dias_atraso}
- Nunca invente outras variáveis.
- Máximo 3 linhas curtas. Sem markdown de título. Negrito apenas com *asteriscos*.
- Responda somente com o texto final da mensagem, sem aspas nem explicações.`;

    const user = `Gere a mensagem para o cenário: ${label}. Estilo: ${toneDesc}.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!resp.ok) throw new Error(`AI Gateway ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const text = (data.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
