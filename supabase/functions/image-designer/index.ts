import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Mode = "generate" | "edit" | "remove_bg" | "upscale" | "ad_creative";

const MODE_PROMPT_PREFIX: Record<Mode, string> = {
  generate: "",
  edit: "Edit this image following the instruction: ",
  remove_bg:
    "Remove the background completely. Keep only the main subject with clean edges, on a transparent-looking checkerboard background. Preserve all details of the subject.",
  upscale:
    "Upscale this image to a much higher resolution. Enhance details, sharpness and clarity while preserving the original composition, colors and subject. Do not add or remove any elements.",
  ad_creative: "Create a professional advertising creative: ",
};

async function callGateway(
  model: string,
  prompt: string,
  sourceImageBase64?: string,
  sourceMime?: string,
): Promise<string> {
  // google/gemini-3-pro-image uses Vertex generateContent body via /v1/images/generations
  const isVertex = model === "google/gemini-3.1-flash-lite-image";
  const isGeminiChat = model.startsWith("google/") && !isVertex;
  const isOpenAI = model.startsWith("openai/");

  let body: Record<string, unknown>;

  if (isOpenAI) {
    body = {
      model,
      prompt,
      size: "1024x1024",
      quality: "low",
      n: 1,
    };
  } else if (isVertex) {
    const parts: unknown[] = [{ text: prompt }];
    if (sourceImageBase64) {
      parts.push({
        inlineData: { mimeType: sourceMime || "image/png", data: sourceImageBase64 },
      });
    }
    body = {
      model,
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };
  } else {
    // Gemini chat shape (gemini-2.5-flash-image, gemini-3-pro-image, gemini-3.1-flash-image)
    const content: unknown[] = [{ type: "text", text: prompt }];
    if (sourceImageBase64) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${sourceMime || "image/png"};base64,${sourceImageBase64}`,
        },
      });
    }
    body = {
      model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gateway ${res.status}: ${txt}`);
  }

  const json = await res.json();
  const b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from gateway");
  return b64;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function fetchImageAsBase64(url: string): Promise<{ b64: string; mime: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch source image: ${r.status}`);
  const mime = r.headers.get("content-type") || "image/png";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { b64: btoa(bin), mime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const {
      prompt,
      mode = "generate",
      model = "google/gemini-3-pro-image",
      sourceImageUrl,
      sourceImageBase64,
    } = (await req.json()) as {
      prompt?: string;
      mode?: Mode;
      model?: string;
      sourceImageUrl?: string;
      sourceImageBase64?: string;
    };

    const finalPrompt =
      (MODE_PROMPT_PREFIX[mode as Mode] || "") + (prompt || "");
    if (!finalPrompt.trim()) {
      return new Response(JSON.stringify({ error: "Prompt vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let srcB64: string | undefined;
    let srcMime: string | undefined;
    if (sourceImageBase64) {
      srcB64 = sourceImageBase64.replace(/^data:[^;]+;base64,/, "");
      const m = /^data:([^;]+);base64,/.exec(sourceImageBase64);
      srcMime = m?.[1] || "image/png";
    } else if (sourceImageUrl) {
      const f = await fetchImageAsBase64(sourceImageUrl);
      srcB64 = f.b64;
      srcMime = f.mime;
    }

    if ((mode === "edit" || mode === "remove_bg" || mode === "upscale") && !srcB64) {
      return new Response(
        JSON.stringify({ error: "Imagem de origem obrigatória para este modo" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const b64 = await callGateway(model, finalPrompt, srcB64, srcMime);

    // Get company id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    const companyId = profile?.company_id ?? null;

    const bytes = base64ToBytes(b64);
    const path = `designer/${companyId ?? "personal"}/${userId}/${Date.now()}-${crypto.randomUUID()}.png`;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error: upErr } = await admin.storage
      .from("campaign-media")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);

    const { data: pub } = admin.storage.from("campaign-media").getPublicUrl(path);
    const imageUrl = pub.publicUrl;

    const { data: row, error: insErr } = await admin
      .from("generated_images")
      .insert({
        company_id: companyId,
        user_id: userId,
        prompt: finalPrompt,
        mode,
        model,
        image_url: imageUrl,
        storage_path: path,
        source_image_url: sourceImageUrl || null,
      })
      .select()
      .single();
    if (insErr) throw new Error(`DB insert: ${insErr.message}`);

    return new Response(JSON.stringify({ image: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[image-designer]", msg);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
