import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaigns, responses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from campaign data
    const campaignContext = campaigns?.length > 0 
      ? `Campanhas enviadas:\n${campaigns.map((c: any) => 
          `- "${c.name}": ${c.type}, ${c.sent}/${c.total} enviados (${c.successRate}% sucesso), conteúdo: "${c.content?.substring(0, 100) || 'N/A'}"`
        ).join('\n')}`
      : "Nenhuma campanha enviada ainda.";

    const responseContext = responses 
      ? `Respostas: ${responses.total} total, ${responses.buttonClicks} cliques em botões, ${responses.textResponses} respostas de texto.`
      : "Sem dados de respostas.";

    const systemPrompt = `Você é um especialista em marketing digital e campanhas de WhatsApp. Analise os dados das campanhas e forneça insights acionáveis.

Você deve retornar EXATAMENTE um JSON válido com a seguinte estrutura:
{
  "insights": [
    {
      "type": "idea" | "remarketing" | "optimization",
      "title": "Título curto e claro",
      "description": "Descrição detalhada com ação específica",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Tipos de insights:
- "idea": Nova ideia de campanha baseada nos padrões de sucesso
- "remarketing": Estratégia de remarketing para reengajar contatos
- "optimization": Sugestão para melhorar campanhas existentes

Regras:
- Forneça 3-5 insights relevantes
- Seja específico e acionável
- Base-se nos dados reais fornecidos
- Priorize insights de alto impacto
- Se não houver campanhas, sugira ideias para começar`;

    const userPrompt = `Analise estas campanhas de WhatsApp e forneça insights:

${campaignContext}

${responseContext}

Retorne apenas o JSON com os insights, sem texto adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let insights;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Provide fallback insights if parsing fails
      insights = {
        insights: [
          {
            type: "idea",
            title: "Comece com campanhas de texto simples",
            description: "Campanhas de texto têm alta taxa de entrega. Comece com mensagens curtas e personalizadas para testar seu público.",
            priority: "high"
          },
          {
            type: "optimization",
            title: "Use botões interativos",
            description: "Campanhas com botões interativos têm maior engajamento. Adicione opções de resposta rápida para facilitar a interação.",
            priority: "medium"
          },
          {
            type: "remarketing",
            title: "Reengaje contatos inativos",
            description: "Crie uma campanha específica para contatos que não responderam nos últimos 30 dias com uma oferta especial.",
            priority: "medium"
          }
        ]
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in campaign-ai-insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
