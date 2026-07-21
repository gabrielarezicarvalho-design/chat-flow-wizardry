// Facebook Ad Library scraper via Apify
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");
const ACTOR = "apify~facebook-ads-scraper";

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
  try { return JSON.parse(text); } catch { return []; }
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

function normalize(item: any) {
  const snap = item.snapshot || item.ad_snapshot || {};
  const body = snap.body?.text || snap.body?.markdown?.[0] || snap.body || item.ad_creative_body || item.text;

  // Collect media from snapshot.images, snapshot.videos and snapshot.cards (carousel)
  const images: string[] = [];
  const videos: string[] = [];

  for (const i of (snap.images || [])) {
    const u = i?.original_image_url || i?.resized_image_url || i?.watermarked_resized_image_url;
    if (u) images.push(u);
  }
  for (const v of (snap.videos || [])) {
    const vu = v?.video_hd_url || v?.video_sd_url;
    if (vu) videos.push(vu);
    else if (v?.video_preview_image_url) images.push(v.video_preview_image_url);
  }
  for (const c of (snap.cards || [])) {
    const cu = c?.original_image_url || c?.resized_image_url;
    const cv = c?.video_hd_url || c?.video_sd_url;
    if (cu) images.push(cu);
    if (cv) videos.push(cv);
  }
  // Fallbacks
  if (!images.length && item.imageUrl) images.push(item.imageUrl);
  if (!videos.length && item.videoUrl) videos.push(item.videoUrl);

  // Extract CTA / link from first card if not on snapshot root
  const firstCard = snap.cards?.[0] || {};
  const cta_text = snap.cta_text || snap.call_to_action?.value || firstCard.cta_text;
  const link_url = snap.link_url || firstCard.link_url || item.link_url;
  const title = snap.title || firstCard.title || item.title;

  return {
    ad_archive_id: item.ad_archive_id || item.adArchiveID || item.id,
    page_id: item.page_id || snap.page_id,
    page_name: item.page_name || snap.page_name,
    page_profile_pic: snap.page_profile_picture_url || item.page_profile_picture_url,
    page_categories: snap.page_categories || item.page_categories,
    page_likes: snap.page_like_count || item.page_like_count,
    body,
    title,
    cta_text,
    cta_type: snap.cta_type || firstCard.cta_type,
    link_url,
    display_format: snap.display_format || item.display_format,
    images: Array.from(new Set(images)),
    videos: Array.from(new Set(videos)),
    start_date: item.start_date || item.ad_delivery_start_time,
    end_date: item.end_date || item.ad_delivery_stop_time,
    is_active: item.is_active ?? (item.ad_delivery_stop_time ? false : true),
    platforms: item.publisher_platform || item.publisher_platforms,
    impressions: item.impressions || item.impressions_with_index,
    spend: item.spend,
    currency: item.currency,
    reach_estimate: item.reach_estimate || item.eu_total_reach,
    ad_library_url: item.url || (item.ad_archive_id ? `https://www.facebook.com/ads/library/?id=${item.ad_archive_id}` : undefined),
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
      country = "BR",
      activeStatus = "active",
      adType = "all",
      platform = "",
      quantity = 30,
    } = await req.json();

    if (!query && !pageId) {
      throw new Error("Informe uma palavra-chave (query) ou o ID da página (pageId).");
    }

    const limit = Math.min(Math.max(Number(quantity) || 30, 1), 200);
    const searchUrl = buildSearchUrl({ query, pageId, country, activeStatus, adType, platform });

    const items = await runActorSync({
      startUrls: [{ url: searchUrl }],
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
      JSON.stringify({ ads, count: ads.length, searchUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("facebook-ads-spy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
