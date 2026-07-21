const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simulated Instagram lead extractor.
// Real Instagram scraping requires a specialized provider (RapidAPI, Apify, etc.)
// This function returns realistic sample data based on the input for UI/UX testing.

const CATEGORIES = [
  "Loja de Roupas", "Academia", "Barbearia", "Salão de Beleza",
  "Restaurante", "Advocacia", "Clínica", "Imobiliária", "Pet Shop",
];

const CITIES = [
  "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba",
  "Porto Alegre", "Salvador", "Recife", "Fortaleza", "Brasília",
];

const FIRST_NAMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro"];
const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string | undefined {
  if (Math.random() > 0.3) return undefined; // ~30% have phones
  const ddd = 11 + Math.floor(Math.random() * 88);
  const n = Math.floor(90000000 + Math.random() * 9999999);
  return `+55 ${ddd} 9${String(n).slice(0, 4)}-${String(n).slice(4, 8)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, input, quantity = 50 } = await req.json();
    if (!mode || !input) throw new Error("mode and input required");

    const seed = String(input).replace(/[@#]/g, "").toLowerCase();
    const n = Math.min(Math.max(Number(quantity) || 50, 1), 500);

    const leads = Array.from({ length: n }, (_, i) => {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const category = pick(CATEGORIES);
      const username = `${seed}_${first.toLowerCase()}${i + 1}`;
      const followers = Math.floor(500 + Math.random() * 50000);
      const phone = generatePhone();
      const hasWebsite = Math.random() > 0.6;
      return {
        username,
        full_name: `${first} ${last}`,
        bio: `${category} | ${pick(CITIES)} 🌎 ${hasWebsite ? "🔗 Link na bio" : ""}`,
        followers,
        phone,
        email: Math.random() > 0.7 ? `${username}@gmail.com` : undefined,
        website: hasWebsite ? `https://${username}.com.br` : undefined,
        city: pick(CITIES),
        category,
        is_business: Math.random() > 0.5,
      };
    });

    return new Response(
      JSON.stringify({
        leads,
        mode,
        note: "Dados simulados. Conecte um provedor de scraping (Apify/RapidAPI) para dados reais.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
