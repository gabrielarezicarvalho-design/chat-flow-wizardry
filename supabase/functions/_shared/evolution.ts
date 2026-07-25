// Shared helper for Evolution API v2 integration.
// Docs: https://doc.evolution-api.com/

export const EVOLUTION_EVENTS = [
  "APPLICATION_STARTUP",
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "CONTACTS_UPSERT",
  "CONTACTS_UPDATE",
  "CHATS_UPSERT",
  "CHATS_UPDATE",
  "PRESENCE_UPDATE",
  "GROUPS_UPSERT",
  "GROUP_UPDATE",
  "GROUP_PARTICIPANTS_UPDATE",
  "CALL",
];

export function normalizeEvolutionBaseUrl(value?: string | null): string | null {
  const raw = (value ?? Deno.env.get("EVOLUTION_BASE_URL") ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getEvolutionApiKey(): string | null {
  const key = (Deno.env.get("EVOLUTION_API_KEY") ?? "").trim();
  return key || null;
}

export function webhookUrl(): string {
  return `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/wa-webhook-listener`;
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, status: res.status, data: { rawResponse: text.slice(0, 300) } };
  }
}

export async function evoFetch(
  baseUrl: string,
  path: string,
  apiKey: string,
  init: RequestInit = {},
) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  return readJson(res);
}

export async function createEvolutionInstance(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone?: string;
  webhook?: string;
}) {
  const body: Record<string, unknown> = {
    instanceName: opts.instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };
  if (opts.phone) body.number = opts.phone.replace(/\D/g, "");
  if (opts.webhook) {
    body.webhook = {
      url: opts.webhook,
      byEvents: false,
      base64: true,
      events: EVOLUTION_EVENTS,
    };
  }
  return evoFetch(opts.baseUrl, "/instance/create", opts.apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function connectEvolutionInstance(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone?: string;
}) {
  const qs = opts.phone ? `?number=${encodeURIComponent(opts.phone.replace(/\D/g, ""))}` : "";
  return evoFetch(
    opts.baseUrl,
    `/instance/connect/${encodeURIComponent(opts.instanceName)}${qs}`,
    opts.apiKey,
    { method: "GET" },
  );
}

export async function evolutionConnectionState(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  return evoFetch(
    opts.baseUrl,
    `/instance/connectionState/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    { method: "GET" },
  );
}

export async function setEvolutionWebhook(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  url: string;
}) {
  return evoFetch(
    opts.baseUrl,
    `/webhook/set/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: opts.url,
          byEvents: false,
          base64: true,
          events: EVOLUTION_EVENTS,
        },
      }),
    },
  );
}

// Best-effort extraction of the base64 QR string from Evolution responses.
export function extractQrBase64(data: any): string | null {
  const candidates = [
    data?.qrcode?.base64,
    data?.qrcode,
    data?.base64,
    data?.instance?.qrcode?.base64,
    data?.instance?.qrcode,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 40) return c;
  }
  return null;
}

export function extractPairingCode(data: any): string | null {
  return (
    data?.qrcode?.pairingCode ??
    data?.pairingCode ??
    data?.instance?.pairingCode ??
    null
  );
}

// Evolution v2 returns per-instance apikey in `hash` (string or {apikey}).
export function extractInstanceApiKey(data: any): string | null {
  const h = data?.hash;
  if (typeof h === "string") return h;
  if (h && typeof h === "object" && typeof h.apikey === "string") return h.apikey;
  return data?.instance?.apikey ?? null;
}
