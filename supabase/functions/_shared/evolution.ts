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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    return readJson(res);
  } finally {
    clearTimeout(timeoutId);
  }
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

// ---------- Sending helpers (Evolution API v2) ----------

function cleanNumber(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

export async function evolutionSendText(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone: string;
  text: string;
  delay?: number;
}) {
  return evoFetch(
    opts.baseUrl,
    `/message/sendText/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber(opts.phone),
        text: opts.text,
        delay: opts.delay ?? 0,
      }),
    },
  );
}

export async function evolutionSendMedia(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone: string;
  mediaType: "image" | "video" | "document";
  media: string; // URL or base64
  caption?: string;
  fileName?: string;
  mimetype?: string;
}) {
  const body: Record<string, unknown> = {
    number: cleanNumber(opts.phone),
    mediatype: opts.mediaType,
    media: opts.media,
  };
  if (opts.caption) body.caption = opts.caption;
  if (opts.fileName) body.fileName = opts.fileName;
  if (opts.mimetype) body.mimetype = opts.mimetype;
  return evoFetch(
    opts.baseUrl,
    `/message/sendMedia/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function evolutionSendAudio(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone: string;
  audio: string; // URL or base64
}) {
  return evoFetch(
    opts.baseUrl,
    `/message/sendWhatsAppAudio/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber(opts.phone),
        audio: opts.audio,
      }),
    },
  );
}

// Extract Evolution/Baileys message id from send responses.
export function extractEvolutionMessageId(data: any): string | null {
  return (
    data?.key?.id ??
    data?.messageId ??
    data?.message?.key?.id ??
    data?.id ??
    null
  );
}

// Determine if a connection row targets Evolution API.
export function isEvolutionConnection(connection: {
  environment?: string | null;
  base_url?: string | null;
}): boolean {
  const env = String(connection?.environment || "").toUpperCase();
  if (env === "EVOLUTION") return true;
  const base = String(connection?.base_url || "").toLowerCase();
  return base.includes("yakuzacreditos") || base.includes("evolution");
}

// Resolve Evolution credentials from a connection row, falling back to env.
export function resolveEvolutionCreds(connection: {
  base_url?: string | null;
  token?: string | null;
  instance_name?: string | null;
  instance_id?: string | null;
}): { baseUrl: string; apiKey: string; instanceName: string } | null {
  const baseUrl = normalizeEvolutionBaseUrl(connection?.base_url ?? undefined);
  const apiKey = (connection?.token ?? "").trim() || getEvolutionApiKey();
  const instanceName =
    (connection?.instance_name ?? "").trim() ||
    (connection?.instance_id ?? "").trim();
  if (!baseUrl || !apiKey || !instanceName) return null;
  return { baseUrl, apiKey, instanceName };
}


// ---------- Auxiliaries: Contacts / Labels (Phase 3) ----------

export async function evolutionFindContacts(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  return evoFetch(
    opts.baseUrl,
    `/chat/findContacts/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    { method: "POST", body: JSON.stringify({ where: {} }) },
  );
}

export async function evolutionCheckNumbers(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  numbers: string[];
}) {
  return evoFetch(
    opts.baseUrl,
    `/chat/whatsappNumbers/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    {
      method: "POST",
      body: JSON.stringify({ numbers: opts.numbers.map(cleanNumber) }),
    },
  );
}

export async function evolutionFindLabels(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  return evoFetch(
    opts.baseUrl,
    `/label/findLabels/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    { method: "GET" },
  );
}

export async function evolutionHandleLabel(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone: string;
  labelId: string;
  action: "add" | "remove";
}) {
  const number = cleanNumber(opts.phone);
  return evoFetch(
    opts.baseUrl,
    `/label/handleLabel/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        number,
        labelId: opts.labelId,
        action: opts.action,
      }),
    },
  );
}

// ---------- Admin / Multi-tenant (Phase 4) ----------

// Fetch all instances from Evolution API (admin-level, requires global apikey).
export async function evolutionListInstances(opts: {
  baseUrl: string;
  apiKey: string;
}) {
  return evoFetch(opts.baseUrl, "/instance/fetchInstances", opts.apiKey, {
    method: "GET",
  });
}

// Permanently delete an Evolution instance (admin operation).
export async function evolutionDeleteInstance(opts: {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  return evoFetch(
    opts.baseUrl,
    `/instance/delete/${encodeURIComponent(opts.instanceName)}`,
    opts.apiKey,
    { method: "DELETE" },
  );
}

// Normalize an Evolution instance row into the shape used by the UI/sync.
export function normalizeEvolutionInstance(raw: any) {
  const inst = raw?.instance ?? raw ?? {};
  const id =
    inst?.instanceId ?? inst?.id ?? inst?.instanceName ?? inst?.name ?? null;
  const name = inst?.instanceName ?? inst?.name ?? id;
  const state = String(inst?.state ?? inst?.status ?? "").toLowerCase();
  return {
    id,
    name,
    status: state || "unknown",
    connected: state === "open" || state === "connected",
    token: raw?.hash?.apikey ?? raw?.hash ?? inst?.apikey ?? null,
    owner: inst?.owner ?? inst?.profileName ?? null,
    created: inst?.createdAt ?? inst?.created ?? null,
  };
}
