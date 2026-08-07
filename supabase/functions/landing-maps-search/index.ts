import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

// Somente consultas de demonstração da landing são permitidas.
const ALLOWED_QUERIES = new Set([
  "dentistas",
  "clínicas odontológicas",
  "salões de beleza",
  "oficinas mecânicas",
  "padarias",
  "academias",
  "pet shops",
  "restaurantes",
  "clínicas de estética",
  "imobiliárias",
  "advogados",
  "barbearias",
  "escolas de idiomas",
]);

const CAPITALS = new Set([
  "Rio Branco", "Maceió", "Macapá", "Manaus", "Salvador", "Fortaleza", "Vitória",
  "Goiânia", "São Luís", "Cuiabá", "Campo Grande", "Belo Horizonte", "Belém",
  "João Pessoa", "Curitiba", "Recife", "Teresina", "Rio de Janeiro", "Natal",
  "Porto Alegre", "Porto Velho", "Boa Vista", "Florianópolis", "São Paulo",
  "Aracaju", "Palmas", "Brasília",
]);

const cache = new Map<string, { at: number; leads: unknown[] }>();
const TTL = 1000 * 60 * 60 * 6; // 6h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? "dentistas").trim();
    const city = String(body?.city ?? "").trim();

    if (!ALLOWED_QUERIES.has(query.toLowerCase()) || !CAPITALS.has(city)) {
      return new Response(JSON.stringify({ error: "Consulta não permitida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `${query.toLowerCase()}|${city}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) {
      return new Response(JSON.stringify({ leads: hit.leads, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps não configurado" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callGateway = () =>
      fetch(`${GATEWAY}/places/v1/places:searchText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({
          textQuery: `${query} em ${city}`,
          pageSize: 8,
          languageCode: "pt-BR",
          regionCode: "BR",
        }),
      });

    // Retry: o gateway pode devolver 502/503/504 transitório (connection termination)
    let res: Response | null = null;
    let lastDetails = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
      try {
        const r = await callGateway();
        if (r.ok) {
          res = r;
          break;
        }
        lastDetails = await r.text();
        console.error(`Places search failed [${r.status}] attempt ${attempt + 1}: ${lastDetails}`);
        if (r.status < 500 && r.status !== 429) break;
      } catch (e) {
        lastDetails = String(e);
        console.error(`Places search threw attempt ${attempt + 1}: ${lastDetails}`);
      }
    }

    if (!res) {
      // Degrada com elegância: a landing é apenas demonstração, não deve quebrar.
      return new Response(
        JSON.stringify({ leads: [], degraded: true, details: lastDetails.slice(0, 500) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const leads = (data.places ?? []).slice(0, 6).map((p: any) => ({
      name: p.displayName?.text ?? "Sem nome",
      address: p.formattedAddress ?? "",
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? null,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));

    cache.set(key, { at: Date.now(), leads });

    return new Response(JSON.stringify({ leads }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
