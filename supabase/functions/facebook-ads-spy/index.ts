// Facebook Ad Library scraper via Apify
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");
const ACTOR = "apify~facebook-ads-scraper";

type JsonRecord = Record<string, unknown>;

async function runActorAsync(input: JsonRecord, maxWaitMs = 130_000) {
  // Start run asynchronously
  const startUrl = `https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}&memory=1024`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const startText = await startRes.text();
  if (!startRes.ok) {
    console.error(`Apify start failed [${startRes.status}]:`, startText.slice(0, 500));
    throw new Error(`Apify ${ACTOR} ${startRes.status}: ${startText.slice(0, 300)}`);
  }
  const startJson = JSON.parse(startText);
  const runId = startJson?.data?.id;
  const datasetId = startJson?.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new Error("Apify: resposta inválida ao iniciar run");

  // Poll status until finished or timeout
  const deadline = Date.now() + maxWaitMs;
  let status = startJson?.data?.status;
  while (Date.now() < deadline && !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
    await new Promise((r) => setTimeout(r, 3000));
    const sRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const sJson = await sRes.json();
    status = sJson?.data?.status;
  }

  // Fetch whatever items exist (partial results OK if timed out)
  const dsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&format=json`);
  const dsText = await dsRes.text();
  try { return { items: JSON.parse(dsText), status }; } catch { return { items: [], status }; }
}

function buildSearchUrl(params: {
  query?: string;
  pageId?: string;
  country?: string;
  activeStatus?: string;
  adType?: string;
  platform?: string;
}) {
  const {
    query, pageId,
    country = "BR",
    activeStatus = "active",
    adType = "all",
    platform = "",
  } = params;

  const base = "https://www.facebook.com/ads/library/";
  const qs = new URLSearchParams({
    active_status: activeStatus,
    ad_type: adType === "all" ? "all" : adType,
    country,
    media_type: "all",
  });
  if (platform) qs.set("publisher_platforms[0]", platform);
  if (pageId) {
    qs.set("view_all_page_id", pageId);
    qs.set("search_type", "page");
  } else if (query) {
    qs.set("q", query);
    qs.set("search_type", "keyword_unordered");
  }
  return `${base}?${qs.toString()}`;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replaceAll("&amp;", "&");
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function textFrom(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  const record = asRecord(value);
  return firstString(record.text, asArray(record.markdown)[0], record.value);
}

function pushUnique(target: string[], value: unknown) {
  const url = cleanUrl(value);
  if (url && !target.includes(url)) target.push(url);
}

function looksLikeImageKey(key: string, hint: string) {
  const lower = `${hint}.${key}`.toLowerCase();
  if (lower.includes("profilepicture") || lower.includes("profile_picture")) return false;
  return lower.includes("image") || lower.includes("thumbnail") || lower.includes("preview");
}

function looksLikeVideoKey(key: string, hint: string) {
  const lower = `${hint}.${key}`.toLowerCase();
  return lower.includes("video") && !lower.includes("previewimage") && !lower.includes("preview_image");
}

function collectMedia(value: unknown, images: string[], videos: string[], hint = "", depth = 0) {
  if (depth > 6) return;

  const lowerHint = hint.toLowerCase();
  const url = cleanUrl(value);
  if (url) {
    if (lowerHint.includes("video") && !lowerHint.includes("preview")) pushUnique(videos, url);
    if (lowerHint.includes("image") || lowerHint.includes("thumbnail") || lowerHint.includes("preview")) pushUnique(images, url);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectMedia(item, images, videos, hint, depth + 1);
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const childUrl = cleanUrl(child);
    const childHint = hint ? `${hint}.${key}` : key;
    const lowerKey = key.toLowerCase();

    if (childUrl) {
      if (looksLikeImageKey(key, hint) || ((lowerKey === "url" || lowerKey === "src" || lowerKey === "uri") && lowerHint.includes("image"))) {
        pushUnique(images, childUrl);
        continue;
      }
      if (looksLikeVideoKey(key, hint) || ((lowerKey === "url" || lowerKey === "src" || lowerKey === "uri") && lowerHint.includes("video"))) {
        pushUnique(videos, childUrl);
        continue;
      }
    }

    collectMedia(child, images, videos, childHint, depth + 1);
  }
}

function normalize(rawItem: unknown) {
  const item = asRecord(rawItem);
  const snap = asRecord(item.snapshot || item.ad_snapshot);
  const cards = asArray(snap.cards);
  const firstCard = asRecord(cards[0]);
  const body = textFrom(snap.body) || firstString(item.ad_creative_body, item.text);

  const images: string[] = [];
  const videos: string[] = [];

  // Apify returns the official Facebook fields in camelCase. Older actors may return snake_case.
  // The recursive collector covers both formats, root creatives, carousels, extraImages and extraVideos.
  collectMedia(snap.images, images, videos, "snapshot.images");
  collectMedia(snap.videos, images, videos, "snapshot.videos");
  collectMedia(snap.cards, images, videos, "snapshot.cards");
  collectMedia(snap.extraImages, images, videos, "snapshot.extraImages");
  collectMedia(snap.extraVideos, images, videos, "snapshot.extraVideos");
  collectMedia(item.images, images, videos, "item.images");
  collectMedia(item.videos, images, videos, "item.videos");
  collectMedia(item.media, images, videos, "item.media");
  collectMedia(item.creative, images, videos, "item.creative");

  pushUnique(images, item.imageUrl || item.image_url);
  pushUnique(videos, item.videoUrl || item.video_url);

  const cta_text = firstString(snap.ctaText, snap.cta_text, asRecord(snap.call_to_action).value, firstCard.ctaText, firstCard.cta_text);
  const link_url = firstString(snap.linkUrl, snap.link_url, firstCard.linkUrl, firstCard.link_url, item.linkUrl, item.link_url);
  const title = firstString(snap.title, firstCard.title, item.title);

  if (!images.length && !videos.length) {
    console.log("No media mapped for ad:", JSON.stringify({
      adArchiveID: item.adArchiveID || item.adArchiveId || item.ad_archive_id,
      displayFormat: snap.displayFormat || snap.display_format,
      snapshotMediaKeys: {
        images: asArray(snap.images).length,
        videos: asArray(snap.videos).length,
        cards: cards.length,
        extraImages: asArray(snap.extraImages).length,
        extraVideos: asArray(snap.extraVideos).length,
      },
    }));
  }

  return {
    ad_archive_id: item.ad_archive_id || item.adArchiveID || item.adArchiveId || item.id,
    page_id: item.page_id || item.pageId || item.pageID || snap.pageId || snap.page_id,
    page_name: item.page_name || item.pageName || snap.pageName || snap.page_name,
    page_profile_pic: snap.pageProfilePictureUrl || snap.page_profile_picture_url || item.page_profile_picture_url,
    page_categories: snap.pageCategories || snap.page_categories || item.page_categories,
    page_likes: snap.pageLikeCount || snap.page_like_count || item.page_like_count,
    body,
    title,
    cta_text,
    cta_type: snap.ctaType || snap.cta_type || firstCard.ctaType || firstCard.cta_type,
    link_url,
    display_format: snap.displayFormat || snap.display_format || item.display_format,
    images: Array.from(new Set(images)),
    videos: Array.from(new Set(videos)),
    start_date: item.start_date || item.startDate || item.startDateFormatted || item.ad_delivery_start_time,
    end_date: item.end_date || item.endDate || item.endDateFormatted || item.ad_delivery_stop_time,
    is_active: item.is_active ?? item.isActive ?? (item.ad_delivery_stop_time ? false : true),
    platforms: item.publisher_platform || item.publisherPlatform || item.publisher_platforms,
    impressions: item.impressions || item.impressionsWithIndex || item.impressions_with_index,
    spend: item.spend,
    currency: item.currency,
    reach_estimate: item.reach_estimate || item.reachEstimate || item.eu_total_reach,
    ad_library_url: item.url || (item.adArchiveID || item.adArchiveId || item.ad_archive_id ? `https://www.facebook.com/ads/library/?id=${item.adArchiveID || item.adArchiveId || item.ad_archive_id}` : undefined),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!APIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: "APIFY_TOKEN não configurado nos secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      query,
      pageId,
      username,
      country = "BR",
      activeStatus = "active",
      adType = "all",
      platform = "",
      quantity = 30,
    } = await req.json();

    // Normalize @handle: aceitar "@nome", "nome", "https://instagram.com/nome", "https://facebook.com/nome"
    let handle: string | undefined;
    if (typeof username === "string" && username.trim()) {
      let u = username.trim();
      const urlMatch = u.match(/(?:facebook\.com|instagram\.com|fb\.com)\/([^/?#]+)/i);
      if (urlMatch) u = urlMatch[1];
      handle = u.replace(/^@+/, "").replace(/\/+$/, "").trim();
    }

    if (!query && !pageId && !handle) {
      throw new Error("Informe uma palavra-chave (query), o ID da página (pageId) ou um @usuário (username).");
    }

    const limit = Math.min(Math.max(Number(quantity) || 30, 1), 200);

    // Para @handle: o ator aceita URL de página do FB. Se o handle for só do Instagram,
    // caímos na busca da Ad Library por palavra-chave como fallback.
    const startUrls: { url: string }[] = [];
    if (handle && !query && !pageId) {
      startUrls.push({ url: `https://www.facebook.com/${handle}` });
      startUrls.push({
        url: buildSearchUrl({ query: handle, country, activeStatus, adType, platform }),
      });
    } else {
      const searchUrl = buildSearchUrl({ query, pageId, country, activeStatus, adType, platform });
      startUrls.push({ url: searchUrl });
    }

    const { items, status } = await runActorAsync({
      startUrls,
      resultsLimit: limit,
      activeStatus,
    });

    // Debug: log raw sample keys of first item to understand actor output
    if (items?.[0]) {
      console.log("Sample keys:", Object.keys(items[0]));
      console.log("Sample snapshot keys:", Object.keys(items[0].snapshot || items[0].ad_snapshot || {}));
      console.log("Sample first item:", JSON.stringify(items[0]).slice(0, 2000));
    }

    const ads = (Array.isArray(items) ? items : []).slice(0, limit).map(normalize);

    return new Response(
      JSON.stringify({ ads, count: ads.length, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("facebook-ads-spy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
