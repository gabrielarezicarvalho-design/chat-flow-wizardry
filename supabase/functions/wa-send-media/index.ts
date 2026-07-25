import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  evolutionSendAudio,
  evolutionSendMedia,
  evolutionSendText,
  extractEvolutionMessageId,
  isEvolutionConnection,
  resolveEvolutionCreds,
} from "../_shared/evolution.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      connectionId, 
      phone, 
      type, // text, image, video, audio, document, button, list, carousel, poll, pix
      // For media
      file,
      caption,
      docName,
      // For menu/list
      text,
      footerText,
      listButton,
      choices,
      imageButton,
      selectableCount,
      // For carousel
      carousel,
      // For PIX
      pixType,
      pixKey,
      pixName,
      // Optional
      conversationId
    } = await req.json();

    if (!connectionId || !phone) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "connectionId and phone are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      console.error("[wa-send-media] Connection not found:", connError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Connection not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { token, base_url } = connection;
    const cleanPhone = phone.replace(/\D/g, "");

    // ---------- Evolution API branch ----------
    if (isEvolutionConnection(connection)) {
      const creds = resolveEvolutionCreds(connection);
      if (!creds) {
        return new Response(JSON.stringify({
          success: false,
          error: "Evolution connection missing base_url, apiKey or instance_name",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let evoRes: any;
      if (type === "text") {
        evoRes = await evolutionSendText({
          ...creds,
          phone: cleanPhone,
          text: (text as string) || (caption as string) || "",
        });
      } else if (type === "image" || type === "video" || type === "document") {
        evoRes = await evolutionSendMedia({
          ...creds,
          phone: cleanPhone,
          mediaType: type,
          media: file,
          caption: caption,
          fileName: type === "document" ? docName : undefined,
        });
      } else if (type === "audio") {
        evoRes = await evolutionSendAudio({
          ...creds,
          phone: cleanPhone,
          audio: file,
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: `Type "${type}" not yet supported on Evolution API. Supported: text, image, video, audio, document.`,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!evoRes.ok) {
        console.error("[Evolution] send failed:", evoRes.data);
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to send message",
          details: evoRes.data,
        }), { status: evoRes.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (conversationId) {
        const messageContent = type === "text"
          ? ((text as string) || (caption as string) || "")
          : JSON.stringify({ url: file, caption: caption || "", type });

        await supabase.from("messages").insert({
          id_da_conversa: conversationId,
          remetente: "sistema",
          conteudo: messageContent,
          tipo: type,
          recebido: false,
          uazapi_message_id: extractEvolutionMessageId(evoRes.data),
        });

        const displayMessage = type === "text"
          ? messageContent
          : (caption ? `[${type}] ${caption}` : `[${type}]`);
        await supabase.from("conversations").update({
          last_message: displayMessage,
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      }

      return new Response(JSON.stringify({ success: true, data: evoRes.data, provider: "evolution" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Legacy Evolution branch ----------
    if (!token || !base_url) {
      return new Response(JSON.stringify({
        success: false,
        error: "Connection missing token or base_url"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let endpoint: string;
    let body: Record<string, unknown> = { number: cleanPhone };


    switch (type) {
      case "text":
        // UZAPI: POST /send/text
        endpoint = `${base_url}/send/text`;
        body.text = text || caption;
        break;

      case "image":
      case "video":
      case "audio":
      case "document":
        // UZAPI: POST /send/media
        endpoint = `${base_url}/send/media`;
        body.type = type;
        body.file = file;
        // UZAPI uses 'text' as caption for media, not 'caption'
        if (caption) body.text = caption;
        if (type === "document" && docName) body.docName = docName;
        break;

      case "button":
        // UZAPI: POST /send/menu with type: button
        endpoint = `${base_url}/send/menu`;
        body.type = "button";
        body.text = text;
        if (footerText) body.footerText = footerText;
        if (choices) body.choices = choices;
        if (imageButton) body.imageButton = imageButton;
        break;

      case "list":
        // UZAPI: POST /send/menu with type: list
        endpoint = `${base_url}/send/menu`;
        body.type = "list";
        body.text = text;
        if (footerText) body.footerText = footerText;
        body.listButton = listButton || "Ver opções";
        if (choices) body.choices = choices;
        break;

      case "poll":
        // UZAPI: POST /send/menu with type: poll
        endpoint = `${base_url}/send/menu`;
        body.type = "poll";
        body.text = text;
        if (choices) body.choices = choices;
        body.selectableCount = selectableCount || 1;
        break;

      case "carousel":
        // UZAPI: POST /send/carousel (structured format)
        endpoint = `${base_url}/send/carousel`;
        body.text = text;
        body.carousel = carousel;
        break;

      case "pix":
        endpoint = `${base_url}/send/pix-button`;
        body.pixType = pixType || "EVP";
        body.pixKey = pixKey;
        body.pixName = pixName;
        break;

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Invalid type: ${type}. Use: text, image, video, audio, document, button, list, carousel, poll, pix` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    console.log(`[wa-send-media] Type: ${type}, Endpoint: ${endpoint}`);
    console.log(`[wa-send-media] Body:`, JSON.stringify(body, null, 2));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": token
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log("[wa-send-media] Evolution response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to send message",
        details: result 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Save message to database if conversationId provided
    if (conversationId) {
      // For media messages, store the file URL in conteudo for display
      let messageContent: string;
      if (type === "text") {
        messageContent = text || caption || "";
      } else {
        // Store JSON with file URL and caption for media messages
        messageContent = JSON.stringify({
          url: file,
          caption: caption || "",
          type: type
        });
      }
      
      await supabase.from("messages").insert({
        id_da_conversa: conversationId,
        remetente: "sistema",
        conteudo: messageContent,
        tipo: type,
        recebido: false,
        uazapi_message_id: result?.messageId || result?.id || null
      });

      const displayMessage = type === "text" ? messageContent : 
                            caption ? `[${type}] ${caption}` : `[${type}]`;
      
      await supabase.from("conversations").update({
        last_message: displayMessage,
        updated_at: new Date().toISOString()
      }).eq("id", conversationId);
    }

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[wa-send-media] Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});