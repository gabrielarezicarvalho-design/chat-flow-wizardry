import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, city, limit = 100 } = await req.json();
    if (!query || !city) throw new Error("query and city required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps connector not configured. Connect it in admin.");
    }

    const collected: any[] = [];
    let pageToken: string | undefined;

    // Places API (New) - Text Search, paginated (max 20 per page, 60 total nativo)
    while (collected.length < limit) {
      const body: any = {
        textQuery: `${query} em ${city}`,
        pageSize: 20,
        languageCode: "pt-BR",
        regionCode: "BR",
      };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName,nextPageToken",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Places error:", res.status, errText);
        throw new Error(`Google Places: ${res.status} ${errText}`);
      }

      const data = await res.json();
      const places = data.places || [];

      for (const p of places) {
        collected.push({
          name: p.displayName?.text || "Sem nome",
          address: p.formattedAddress || "",
          phone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
          website: p.websiteUri || "",
          rating: p.rating,
          reviews: p.userRatingCount,
          category: p.primaryTypeDisplayName?.text || "",
        });
      }

      pageToken = data.nextPageToken;
      if (!pageToken || places.length === 0) break;
      // Google exige pequena espera antes de usar nextPageToken
      await new Promise((r) => setTimeout(r, 2000));
    }

    return new Response(JSON.stringify({ leads: collected.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
