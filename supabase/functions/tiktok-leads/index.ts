import { requireActivePlan } from "../_shared/planGuard.ts";
// TikTok Leads via Apify actors
// Requires APIFY_TOKEN secret.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

// Free TikTok scraper by clockworks (free-tiktok-scraper) — profiles, hashtags, search, videos.
const ACTOR = "clockworks~free-tiktok-scraper";

async function runActorSync(input: Record<string, unknown>, timeoutSec = 180) {
  const url = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSec}&memory=1024`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Apify ${ACTOR} failed [${res.status}]:`, text.slice(0, 500));
    throw new Error(`Apify ${ACTOR} ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function extractEmailFromBio(bio?: string): string | undefined {
  if (!bio) return undefined;
  const m = bio.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m?.[0];
}

function normalizeAuthor(a: any) {
  if (!a) return null;
  const bio = a.signature || a.bio || a.biography;
  return {
    username: a.uniqueId || a.username || a.name,
    full_name: a.nickname || a.fullName || a.name,
    bio,
    followers: a.fans ?? a.followers ?? a.followerCount,
    email: a.bioEmail || extractEmailFromBio(bio),
    website: a.bioLink?.link || a.website,
    verified: a.verified,
    profile_pic: a.avatar || a.avatarThumb || a.avatarMedium,
    region: a.region,
  };
}

function dedupeByUsername(list: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of list) {
    if (!item?.username) continue;
    const key = String(item.username).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;

  try {
    if (!APIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: "APIFY_TOKEN não configurado nos secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { mode, input, quantity = 50 } = await req.json();
    if (!mode || !input) throw new Error("mode e input são obrigatórios");

    const limit = Math.min(Math.max(Number(quantity) || 50, 1), 200);
    const raw = String(input).trim();

    let items: any[] = [];

    if (mode === "profile") {
      // input = @username ou lista separada
      const profiles = raw
        .split(/[\s,;\n]+/)
        .map((u) => u.replace(/^@/, "").trim())
        .filter(Boolean)
        .slice(0, 20);
      items = await runActorSync({
        profiles,
        resultsPerPage: Math.min(limit, 50),
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      });
    } else if (mode === "hashtag") {
      const tag = raw.replace(/^#/, "");
      items = await runActorSync({
        hashtags: [tag],
        resultsPerPage: Math.min(limit, 100),
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      });
    } else if (mode === "search") {
      items = await runActorSync({
        searchQueries: [raw],
        resultsPerPage: Math.min(limit, 100),
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      });
    } else if (mode === "bulk") {
      const profiles = raw
        .split(/[\s,;\n]+/)
        .map((u) => u.replace(/^@/, "").trim())
        .filter(Boolean)
        .slice(0, limit);
      items = await runActorSync({
        profiles,
        resultsPerPage: 1,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      });
    } else {
      throw new Error(`Modo desconhecido: ${mode}`);
    }

    // Cada item de vídeo tem authorMeta; itens de perfil já são o autor
    const authors = items
      .map((it: any) => normalizeAuthor(it.authorMeta || it.author || it))
      .filter(Boolean);

    const leads = dedupeByUsername(authors).slice(0, limit);

    return new Response(
      JSON.stringify({ leads, mode, count: leads.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("tiktok-leads error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
