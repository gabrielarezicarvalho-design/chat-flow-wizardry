import { requireActivePlan } from "../_shared/planGuard.ts";
// Instagram Leads via Apify actors
// Requires APIFY_TOKEN secret. Uses run-sync-get-dataset-items to get results in one call.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

// Actor slug format: user~actor (URL encoded as user~actor)
const ACTORS = {
  // Profile / bulk profile scraper — returns full profile data (bio, followers, contact)
  profile: "apify~instagram-profile-scraper",
  // Hashtag scraper — posts by hashtag; we then dedupe by owner
  hashtag: "apify~instagram-hashtag-scraper",
  // Comment scraper — comments on a post URL
  comments: "apify~instagram-comment-scraper",
  // Followers scraper (community actor)
  followers: "apify~instagram-scraper",
};

async function runActorSync(actorId: string, input: Record<string, unknown>, timeoutSec = 120) {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSec}&memory=1024`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Apify ${actorId} failed [${res.status}]:`, text.slice(0, 500));
    throw new Error(`Apify ${actorId} ${res.status}: ${text.slice(0, 300)}`);
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

function normalizeProfileItem(p: any) {
  const bio = p.biography || p.bio;
  return {
    username: p.username || p.ownerUsername || p.owner?.username,
    full_name: p.fullName || p.full_name || p.ownerFullName,
    bio,
    followers: p.followersCount ?? p.followers,
    phone: p.businessPhoneNumber || p.public_phone_number,
    email: p.businessEmail || p.public_email || extractEmailFromBio(bio),
    website: p.externalUrl || p.website,
    city: p.businessAddressJson?.city_name || p.city,
    category: p.businessCategoryName || p.categoryName || p.category,
    profile_pic: p.profilePicUrl || p.profilePicUrlHD,
    is_business: p.isBusinessAccount ?? p.is_business_account ?? false,
  };
}

async function scrapeProfiles(usernames: string[]) {
  if (!usernames.length) return [];
  const items = await runActorSync(ACTORS.profile, { usernames });
  return items.map(normalizeProfileItem).filter((x: any) => x.username);
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

    let leads: any[] = [];

    if (mode === "bulk") {
      // Aceita lista separada por vírgula/linha/espaço
      const usernames = raw
        .split(/[\s,;\n]+/)
        .map((u) => u.replace(/^@/, "").trim())
        .filter(Boolean)
        .slice(0, limit);
      leads = await scrapeProfiles(usernames);
    } else if (mode === "hashtag") {
      const tag = raw.replace(/^#/, "");
      const posts = await runActorSync(ACTORS.hashtag, {
        hashtags: [tag],
        resultsLimit: limit,
      });
      const usernames = Array.from(
        new Set(
          posts
            .map((p: any) => p.ownerUsername || p.owner?.username)
            .filter(Boolean),
        ),
      ).slice(0, limit) as string[];
      leads = await scrapeProfiles(usernames);
    } else if (mode === "comments") {
      // input = URL do post
      const postUrl = raw.startsWith("http") ? raw : `https://www.instagram.com/p/${raw}/`;
      const comments = await runActorSync(ACTORS.comments, {
        directUrls: [postUrl],
        resultsLimit: limit,
      });
      const usernames = Array.from(
        new Set(
          comments
            .map((c: any) => c.ownerUsername || c.owner?.username)
            .filter(Boolean),
        ),
      ).slice(0, limit) as string[];
      leads = await scrapeProfiles(usernames);
    } else if (mode === "followers") {
      // input = username do perfil alvo
      const target = raw.replace(/^@/, "");
      // Usa instagram-scraper com resultsType=details para posts recentes, e extraímos owners únicos
      // Observação: raspar followers privados oficialmente exige actor pago específico.
      const results = await runActorSync(ACTORS.followers, {
        directUrls: [`https://www.instagram.com/${target}/`],
        resultsType: "posts",
        resultsLimit: limit,
        addParentData: false,
      });
      const usernames = Array.from(
        new Set(
          results
            .flatMap((r: any) => [
              ...(r.latestComments || []).map((c: any) => c.ownerUsername),
              ...(r.taggedUsers || []).map((t: any) => t.username),
              r.ownerUsername,
            ])
            .filter(Boolean),
        ),
      )
        .filter((u) => u !== target)
        .slice(0, limit) as string[];
      leads = usernames.length ? await scrapeProfiles(usernames) : [];
    } else {
      throw new Error(`Modo desconhecido: ${mode}`);
    }

    return new Response(
      JSON.stringify({ leads, mode, count: leads.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("instagram-leads error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
