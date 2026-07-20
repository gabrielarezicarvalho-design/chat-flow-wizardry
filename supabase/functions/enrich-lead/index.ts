import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-\/?=&]+/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-\/?=&]+/gi,
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9_.\-\/?=&]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_.\-\/?=&]+/gi,
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/[A-Za-z0-9_.\-\/?=&@]+/gi,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@?[A-Za-z0-9_.\-\/?=&]+/gi,
  whatsapp: /https?:\/\/(?:api\.whatsapp\.com|wa\.me|chat\.whatsapp\.com)\/[A-Za-z0-9_.\-\/?=&+]+/gi,
};

const IGNORE_EMAIL_EXT = /\.(png|jpe?g|gif|svg|webp|css|js)$/i;

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextProBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

function extract(html: string) {
  const emailsRaw = html.match(EMAIL_RE) || [];
  const emails = Array.from(new Set(emailsRaw
    .map(e => e.toLowerCase())
    .filter(e => !IGNORE_EMAIL_EXT.test(e))
    .filter(e => !/@(sentry|wixpress|example|godaddy|domain)\./i.test(e))
  )).slice(0, 5);

  const socials: Record<string, string> = {};
  for (const [key, re] of Object.entries(SOCIAL_PATTERNS)) {
    const m = html.match(re);
    if (m && m.length > 0) {
      const clean = m[0].replace(/["'<>].*$/, '').replace(/\/$/, '');
      socials[key] = clean;
    }
  }
  return { emails, socials };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { website } = await req.json();
    if (!website || typeof website !== 'string') {
      return new Response(JSON.stringify({ error: 'website required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let base = website.trim();
    if (!/^https?:\/\//i.test(base)) base = 'https://' + base;

    const urlObj = new URL(base);
    const origin = urlObj.origin;
    const candidates = [base, `${origin}/contato`, `${origin}/contact`, `${origin}/sobre`];

    const htmls = await Promise.all(candidates.map(u => fetchText(u)));
    const combined = htmls.join('\n');

    const { emails, socials } = extract(combined);

    return new Response(JSON.stringify({ emails, socials }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
