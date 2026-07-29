import { requireActivePlan } from "../_shared/planGuard.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isEvolutionConnection,
  resolveEvolutionCreds,
  evolutionSendText,
  evolutionSendMedia,
  evolutionSendAudio,
} from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const sendCampaignStartTelegramNotification = async ({
  supabase,
  connection,
  params,
  result,
}: {
  supabase: any;
  connection: any;
  params: any;
  result: any;
}) => {
  try {
    const userId = connection?.user_id;
    if (!userId) {
      console.log("[wa-sender] Telegram notification skipped: missing user_id");
      return;
    }

    const { data: telegramConfigs, error: telegramConfigError } = await supabase
      .from("telegram_notification_configs")
      .select("id, name, telegram_chat_id, telegram_bot_token, connection_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("notify_campaign_start", true);

    if (telegramConfigError) {
      console.error("[wa-sender] Telegram config error:", telegramConfigError.message);
      return;
    }

    if (!telegramConfigs || telegramConfigs.length === 0) {
      console.log("[wa-sender] Telegram notification skipped: no active configs");
      return;
    }

    const campaignName = params?.info || "Campanha";
    const campaignType = params?.type || params?.menuType || "text";
    const totalContacts = Number(
      result?.count ||
      params?.numbers?.length ||
      params?.messages?.length ||
      0
    );

    const statusText = result?.status || "started";
    const folderId = result?.folder_id || null;
    const nowBr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const telegramMessage = [
      "📢 Campanha iniciada",
      "",
      `Nome: ${campaignName}`,
      `Tipo: ${campaignType}`,
      `Contatos: ${totalContacts}`,
      `Status: ${statusText}`,
      folderId ? `Fila: ${folderId}` : null,
      `Horário: ${nowBr}`
    ].filter(Boolean).join("\n");

    for (const config of telegramConfigs) {
      if (!config?.telegram_chat_id) continue;
      if (config.connection_id && config.connection_id !== connection.id) continue;

      const botToken = config.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!botToken) {
        console.log(`[wa-sender] Telegram config ${config.id} skipped: missing bot token`);
        continue;
      }

      try {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const telegramResponse = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: config.telegram_chat_id,
            text: telegramMessage,
          }),
        });

        const telegramResult = await telegramResponse.json();
        if (!telegramResponse.ok) {
          console.error("[wa-sender] Telegram send error:", JSON.stringify(telegramResult));
        } else {
          console.log(`[wa-sender] Telegram campaign-start notification sent (config: ${config.id})`);
        }
      } catch (telegramErr: any) {
        console.error("[wa-sender] Telegram send exception:", telegramErr?.message || telegramErr);
      }
    }
  } catch (err: any) {
    console.error("[wa-sender] Telegram campaign-start notification failed:", err?.message || err);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;

  try {
    const { action, connectionId, ...params } = await req.json();

    if (!connectionId) {
      return new Response(JSON.stringify({ 
        error: "Missing connectionId" 
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
      console.error("Connection not found:", connError);
      return new Response(JSON.stringify({ 
        error: "Connection not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { token, base_url } = connection;
    
    if (!token || !base_url) {
      return new Response(JSON.stringify({ 
        error: "Connection missing token or base_url" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let endpoint: string;
    let body: any;

    switch (action) {
      case "direct":
        // Direct send for testing - uses /send/text, /send/media, /send/menu, /send/carousel
        const directNumber = (params.numbers?.[0] || "").replace("@s.whatsapp.net", "").replace(/\D/g, "");
        const directType = params.type || "text";
        
        let directEndpoint: string;
        let directBody: any = {
          number: directNumber
        };
        
        switch (directType) {
          case "text":
            // Evolution: POST /send/text
            directEndpoint = `${base_url}/send/text`;
            directBody.text = params.text || "";
            if (params.linkPreview) directBody.linkPreview = true;
            break;
            
          case "image":
          case "video":
          case "audio":
          case "document":
            // Evolution: POST /send/media
            directEndpoint = `${base_url}/send/media`;
            directBody.type = directType;
            directBody.file = params.media || params.file || "";
            // Evolution uses 'text' as caption for media
            if (params.text) directBody.text = params.text;
            if (directType === "document" && params.docName) {
              directBody.docName = params.docName;
            }
            break;
            
          case "button":
            // Evolution: POST /send/menu with type: button
            directEndpoint = `${base_url}/send/menu`;
            directBody.type = "button";
            directBody.text = params.text || "Selecione uma opção:";
            directBody.choices = params.choices || [];
            if (params.footerText) directBody.footerText = params.footerText;
            if (params.imageButton) directBody.imageButton = params.imageButton;
            break;
            
          case "list":
            // Evolution: POST /send/menu with type: list
            directEndpoint = `${base_url}/send/menu`;
            directBody.type = "list";
            directBody.text = params.text || "Selecione uma opção:";
            directBody.choices = params.choices || [];
            directBody.listButton = params.listButton || "Ver opções";
            if (params.footerText) directBody.footerText = params.footerText;
            break;
            
          case "carousel":
            // Evolution: POST /send/carousel (alternative format)
            directEndpoint = `${base_url}/send/carousel`;
            directBody.text = params.text || "";
            directBody.carousel = params.carousel || [];
            break;
            
          case "poll":
            // Evolution: POST /send/menu with type: poll
            directEndpoint = `${base_url}/send/menu`;
            directBody.type = "poll";
            directBody.text = params.text || "Votação";
            directBody.choices = params.choices || [];
            directBody.selectableCount = params.selectableCount || 1;
            break;
            
          default:
            directEndpoint = `${base_url}/send/text`;
            directBody.text = params.text || "";
        }
        
        console.log(`[wa-sender] Direct send: ${directType} to ${directNumber}`);
        console.log(`[wa-sender] Direct endpoint: ${directEndpoint}`);
        console.log(`[wa-sender] Direct body:`, JSON.stringify(directBody, null, 2));
        
        const directResponse = await fetch(directEndpoint, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "token": token
          },
          body: JSON.stringify(directBody)
        });
        
        const directResult = await directResponse.json();
        console.log("[wa-sender] Direct response:", JSON.stringify(directResult));
        
        if (!directResponse.ok || directResult.error) {
          const errorMsg = directResult.error === "No session"
            ? "Instancia WhatsApp desconectada. Reconecte na pagina de Conexoes."
            : directResult.error || "Erro no envio";
          
          return new Response(JSON.stringify({
            success: false,
            error: errorMsg,
            details: directResult,
            needsReconnection: directResult.error === "No session"
          }), {
            status: directResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: directResult
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      case "simple": {
        // Evolution API branch: dispatch per-contact via Evolution endpoints.
        if (isEvolutionConnection(connection)) {
          const creds = resolveEvolutionCreds(connection);
          if (!creds) {
            return new Response(JSON.stringify({
              success: false,
              error: "Evolution connection missing base_url, token, or instance_name",
            }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          const evoNumbers: string[] = params.numbers || [];
          const evoTypeRaw = params.type || "text";
          const evoType = evoTypeRaw === "buttons" ? "button" : evoTypeRaw;
          const evoMedia = params.media || params.file;
          const dMin = Number(params.delayMin ?? 10);
          const dMax = Number(params.delayMax ?? 30);
          const campaignId = params.campaignId;

          const runDispatch = async () => {
            const results: any[] = [];
            let sent = 0, failed = 0;
            for (let i = 0; i < evoNumbers.length; i++) {
              const phone = String(evoNumbers[i] || "").replace("@s.whatsapp.net", "").replace(/\D/g, "");
              if (!phone) continue;
              try {
                let r;
                if (evoType === "text" || evoType === "button" || evoType === "list" || evoType === "poll" || evoType === "carousel") {
                  r = await evolutionSendText({ ...creds, phone, text: params.text || "" });
                } else if (evoType === "audio") {
                  r = await evolutionSendAudio({ ...creds, phone, audio: evoMedia });
                } else if (evoType === "image" || evoType === "video" || evoType === "document") {
                  r = await evolutionSendMedia({
                    ...creds, phone, mediaType: evoType, media: evoMedia,
                    caption: params.text, fileName: params.docName,
                  });
                } else {
                  r = await evolutionSendText({ ...creds, phone, text: params.text || "" });
                }
                if (r.ok) sent++; else failed++;
                results.push({ number: phone, ok: r.ok, data: r.data });
                if (campaignId) {
                  await supabase.from("campaign_contacts").update({
                    status: r.ok ? "sent" : "failed",
                    sent_at: r.ok ? new Date().toISOString() : null,
                    error_message: r.ok ? null : JSON.stringify(r.data).slice(0, 500),
                  }).eq("campaign_id", campaignId).ilike("phone", `%${phone}%`);
                  // Live progress: bump counters after each message
                  await supabase.from("campaigns").update({
                    sent_count: sent,
                    failed_count: failed,
                    status: "sending",
                  }).eq("id", campaignId);
                }
              } catch (e: any) {
                failed++;
                results.push({ number: phone, ok: false, error: e?.message || String(e) });
              }
              if (i < evoNumbers.length - 1) {
                const wait = (Math.floor(Math.random() * (dMax - dMin + 1)) + dMin) * 1000;
                await new Promise((res) => setTimeout(res, wait));
              }
            }
            if (campaignId) {
              await supabase.from("campaigns").update({
                status: sent === 0 ? "failed" : "completed",
                sent_count: sent,
                failed_count: failed,
                total_contacts: evoNumbers.length,
                completed_at: new Date().toISOString(),
              }).eq("id", campaignId);
            }
            console.log(`[wa-sender] Evolution dispatch done: sent=${sent} failed=${failed}`);
          };

          const result = { status: evoNumbers.length > 1 ? "queued" : "completed", count: evoNumbers.length };

          // Fast path for single contact: run inline so UI gets real result.
          if (evoNumbers.length <= 1) {
            await runDispatch();
            return new Response(JSON.stringify({ success: true, data: { ...result, status: "completed", sent: 1, failed: 0 } }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Multiple contacts: dispatch asynchronously, respond immediately.
          // @ts-ignore Deno edge runtime provides EdgeRuntime.waitUntil
          const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
          if (typeof waitUntil === "function") {
            waitUntil(runDispatch());
          } else {
            runDispatch().catch((e) => console.error("[wa-sender] bg error:", e));
          }
          await sendCampaignStartTelegramNotification({ supabase, connection, params, result }).catch(() => {});
          if (campaignId) {
            await supabase.from("campaigns").update({
              status: "queued", total_contacts: evoNumbers.length, started_at: new Date().toISOString(),
            }).eq("id", campaignId);
          }
          return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }



        // Use Evolution /sender/advanced endpoint with proper message formatting
        // IMPORTANT: Delay only works when there are MULTIPLE messages in the queue
        // For single message, we use scheduled_for to add delay
        endpoint = `${base_url}/sender/advanced`;

        
        const simpleNumbers = params.numbers || [];
        const simpleTypeRaw = params.type || "text";
        const simpleType = simpleTypeRaw === "buttons" ? "button" : simpleTypeRaw;
        const simpleMedia = params.media || params.file;
        const requestedDelayMin = params.delayMin || 10;
        const requestedDelayMax = params.delayMax || 30;
        
        console.log(`[wa-sender] ViewOnce param received: ${params.viewOnce}`);
        
        // Build messages array for /sender/advanced
        const advancedMessages: any[] = simpleNumbers.map((num: string) => {
          const cleanNumber = num.replace("@s.whatsapp.net", "").replace(/\D/g, "");
          const msg: any = {
            number: cleanNumber,
            type: simpleType
          };
          
          switch (simpleType) {
            case "text":
              msg.text = params.text || "";
              if (params.linkPreview) msg.linkPreview = true;
              break;
              
            case "image":
            case "video":
              msg.file = simpleMedia;
              if (params.text) msg.text = params.text;
              // Ensure viewOnce is properly set as boolean
              const isViewOnce = params.viewOnce === true || params.viewOnce === "true";
              if (isViewOnce) {
                msg.viewOnce = true;
                console.log(`[wa-sender] Setting viewOnce=true for ${cleanNumber}`);
              }
              break;
              
            case "audio":
              msg.file = simpleMedia;
              break;
              
            case "document":
              msg.file = simpleMedia;
              msg.docName = params.docName || "documento.pdf";
              if (params.text) msg.text = params.text;
              break;
              
            case "button":
              msg.text = params.text || "Selecione uma opção:";
              msg.choices = params.choices || [];
              if (params.footerText) msg.footerText = params.footerText;
              if (params.imageButton) msg.imageButton = params.imageButton;
              break;
              
            case "list":
              msg.text = params.text || "Selecione uma opção:";
              msg.choices = params.choices || [];
              msg.listButton = params.listButton || "Ver opções";
              if (params.footerText) msg.footerText = params.footerText;
              break;
              
            case "carousel":
              msg.text = params.text || "";
              msg.choices = params.carouselChoices || [];
              break;
              
            case "poll":
              msg.text = params.text || "Votação";
              msg.choices = params.choices || [];
              if (params.selectableCount) msg.selectableCount = params.selectableCount;
              break;
              
            default:
              msg.text = params.text || "";
          }
          
          return msg;
        });
        
        body = {
          delayMin: requestedDelayMin,
          delayMax: requestedDelayMax,
          info: params.info || "Campanha via Next Pro",
          messages: advancedMessages
        };
        
        // Handle scheduling - can be timestamp in ms or minutes from now
        // If user set scheduled_for, use it; otherwise check sendImmediately flag
        if (params.scheduled_for) {
          body.scheduled_for = params.scheduled_for;
        } else if (advancedMessages.length === 1 && params.sendImmediately !== true) {
          // For single message, use scheduled_for to simulate delay
          // Since delay only works between multiple messages, we schedule for X minutes from now
          // Use 1 minute as minimum to ensure the message is not sent immediately
          // Only do this if sendImmediately is not explicitly set to true
          body.scheduled_for = 1; // Schedule for 1 minute from now
          console.log(`[wa-sender] Single message detected, scheduling for 1 minute from now`);
        } else if (params.sendImmediately === true) {
          console.log(`[wa-sender] Send immediately mode enabled, not adding scheduled_for`);
        }
        
        console.log(`[wa-sender] Advanced campaign: ${advancedMessages.length} messages, delay ${body.delayMin}-${body.delayMax}s, immediate: ${params.sendImmediately}`);
        console.log(`[wa-sender] Full body:`, JSON.stringify(body, null, 2));
        break;
      }


      case "menu":
        // Send interactive menu (button, list, carousel, poll) to multiple numbers
        // Also supports media + buttons via imageButton parameter
        const menuNumbers = params.numbers || [];
        const menuType = params.menuType || "button"; // button, list, carousel, poll
        const menuText = params.text || "";
        const menuMediaUrl = params.mediaUrl || params.imageButton || ""; // Support media with buttons
        const delayMin = params.delayMin || 10;
        const delayMax = params.delayMax || 30;
        const pauseEveryX = params.pauseEveryX || 0; // 0 = no pause
        const pauseDuration = params.pauseDuration || 60;
        const campaignId = params.campaignId; // For tracking and pausing
        
        console.log(`[wa-sender] Sending menu type: ${menuType} to ${menuNumbers.length} contacts`);
        console.log(`[wa-sender] Text: ${menuText}`);
        console.log(`[wa-sender] Media URL: ${menuMediaUrl}`);
        console.log(`[wa-sender] Delay: ${delayMin}-${delayMax}s, Pause every ${pauseEveryX} with ${pauseDuration}s duration`);
        console.log(`[wa-sender] Campaign ID: ${campaignId}`);
        
        const results = [];
        let disconnectionDetected = false;
        let disconnectedAtIndex = -1;
        const failedNumbers: string[] = [];
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5; // Stop after 5 consecutive errors
        
        for (let i = 0; i < menuNumbers.length; i++) {
          const number = menuNumbers[i].replace("@s.whatsapp.net", "").replace(/\D/g, "");
          
          try {
            let menuEndpoint: string;
            let menuBody: any = {
              number: number,
              text: menuText || "Selecione uma opção:"
            };
            
            // Track if video was sent successfully (for video + buttons combo)
            let videoSentSuccessfully = false;
            
            if (menuType === "carousel") {
              // Use /send/carousel endpoint with carousel array format
              menuEndpoint = `${base_url}/send/carousel`;
              menuBody.carousel = params.carousel || [];
            } else {
              // Check if we have video/media that needs to be sent separately first
              const isVideoMedia = menuMediaUrl && (
                menuMediaUrl.toLowerCase().includes('.mp4') ||
                menuMediaUrl.toLowerCase().includes('.mov') ||
                menuMediaUrl.toLowerCase().includes('.avi') ||
                menuMediaUrl.toLowerCase().includes('.webm') ||
                menuMediaUrl.toLowerCase().includes('video')
              );
              
              const isImageMedia = menuMediaUrl && !isVideoMedia && (
                menuMediaUrl.toLowerCase().includes('.jpg') ||
                menuMediaUrl.toLowerCase().includes('.jpeg') ||
                menuMediaUrl.toLowerCase().includes('.png') ||
                menuMediaUrl.toLowerCase().includes('.gif') ||
                menuMediaUrl.toLowerCase().includes('.webp') ||
                menuMediaUrl.toLowerCase().includes('image')
              );
              
              // For videos with buttons: send video first, then send buttons separately
              if (isVideoMedia && (menuType === "button" || menuType === "buttons")) {
                console.log(`[wa-sender] Video + buttons detected, sending video first: ${menuMediaUrl}`);
                
                // Send video first
                const videoBody = {
                  number: number,
                  type: "video",
                  file: menuMediaUrl,
                  text: menuText || ""
                };
                
                const videoResponse = await fetch(`${base_url}/send/media`, {
                  method: "POST",
                  headers: { 
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "token": token
                  },
                  body: JSON.stringify(videoBody)
                });
                
                const videoResult = await videoResponse.json();
                console.log(`[wa-sender] Video sent to ${number}:`, JSON.stringify(videoResult));
                
                // Check if video was sent successfully
                const videoSuccess = videoResponse.ok && !videoResult.error;
                if (videoSuccess) {
                  videoSentSuccessfully = true;
                  console.log(`[wa-sender] Video delivered successfully to ${number}`);
                }
                
                // Check for disconnection only
                if (!videoSuccess) {
                  const videoErrorMsg = videoResult?.error || videoResult?.message || '';
                  const isVideoDisconnected = 
                    videoErrorMsg.toLowerCase().includes('disconnected') ||
                    videoErrorMsg.toLowerCase().includes('no session');
                  
                  if (isVideoDisconnected) {
                    console.log(`[wa-sender] WhatsApp disconnection detected during video send`);
                    disconnectionDetected = true;
                    disconnectedAtIndex = i;
                    failedNumbers.push(menuNumbers[i]);
                    for (let j = i + 1; j < menuNumbers.length; j++) {
                      failedNumbers.push(menuNumbers[j]);
                    }
                    results.push({ 
                      number, 
                      success: false, 
                      result: videoResult,
                      error: 'WhatsApp disconnected'
                    });
                    break;
                  }
                  
                  // If video failed but not due to disconnection, still try buttons
                  console.log(`[wa-sender] Video failed but trying to send buttons anyway`);
                }
                
                // Small delay between video and buttons
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Now send buttons without media
                menuEndpoint = `${base_url}/send/menu`;
                menuBody.type = "button";
                menuBody.choices = params.choices || [];
                menuBody.text = "Escolha uma opção:";
                
                if (params.footerText) {
                  menuBody.footerText = params.footerText;
                }
              } else {
                // Use /send/menu for button, list, poll
                menuEndpoint = `${base_url}/send/menu`;
                
                // Evolution uses "button" not "buttons"
                menuBody.type = menuType === "buttons" ? "button" : menuType;
                menuBody.choices = params.choices || [];
                
                if (menuType === "list") {
                  menuBody.listButton = params.listButton || "Ver opções";
                }
                if (params.footerText) {
                  menuBody.footerText = params.footerText;
                }
                if (menuType === "poll" && params.selectableCount) {
                  menuBody.selectableCount = params.selectableCount;
                }
                // Add image to buttons via imageButton parameter (images work, videos don't)
                if (isImageMedia && (menuType === "button" || menuType === "buttons")) {
                  menuBody.imageButton = menuMediaUrl;
                  console.log(`[wa-sender] Adding image to buttons: ${menuMediaUrl}`);
                }
              }
            }
            
            console.log(`[wa-sender] Sending to ${number}:`, JSON.stringify(menuBody, null, 2));
            
            const menuResponse = await fetch(menuEndpoint, {
              method: "POST",
              headers: { 
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": token
              },
              body: JSON.stringify(menuBody)
            });
            
            const menuResult = await menuResponse.json();
            const menuSuccess = menuResponse.ok && !menuResult.error;
            
            // Consider success if:
            // 1. Menu/buttons sent successfully, OR
            // 2. Video was sent successfully (even if buttons failed - user received the content)
            const success = menuSuccess || videoSentSuccessfully;
            
            console.log(`[wa-sender] Response for ${number}: menuSuccess=${menuSuccess}, videoSentSuccessfully=${videoSentSuccessfully}, finalSuccess=${success}`);
            console.log(`[wa-sender] Menu result:`, JSON.stringify(menuResult));
            
            // Check for WhatsApp disconnection error
            const errorMessage = menuResult?.error || menuResult?.message || '';
            const isDisconnected = 
              errorMessage.toLowerCase().includes('disconnected') ||
              errorMessage.toLowerCase().includes('no session') ||
              errorMessage === 'WhatsApp disconnected';
            
            // Only count as disconnection if video also wasn't sent
            if (!success && isDisconnected) {
              console.log(`[wa-sender] WhatsApp disconnection detected at index ${i}`);
              disconnectionDetected = true;
              disconnectedAtIndex = i;
              
              // Add current number and all remaining numbers to failed list
              failedNumbers.push(menuNumbers[i]);
              for (let j = i + 1; j < menuNumbers.length; j++) {
                failedNumbers.push(menuNumbers[j]);
              }
              
              results.push({ 
                number, 
                success: false, 
                result: menuResult,
                error: 'WhatsApp disconnected'
              });
              
              // Break the loop - stop sending
              break;
            }
            
            if (!success) {
              failedNumbers.push(menuNumbers[i]);
              consecutiveErrors++;
              
              // Check for too many consecutive errors - indicates a systemic problem
              if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.log(`[wa-sender] Too many consecutive errors (${consecutiveErrors}), stopping campaign`);
                
                // Add all remaining numbers to failed list
                for (let j = i + 1; j < menuNumbers.length; j++) {
                  failedNumbers.push(menuNumbers[j]);
                }
                
                // Update campaign status
                if (campaignId) {
                  try {
                    await supabase
                      .from("campaigns")
                      .update({
                        status: "paused_errors",
                        sent_count: results.filter(r => r.success).length,
                        failed_count: failedNumbers.length
                      })
                      .eq("id", campaignId);
                  } catch (updateErr) {
                    console.error(`[wa-sender] Failed to update campaign:`, updateErr);
                  }
                }
                
                break;
              }
            } else {
              consecutiveErrors = 0; // Reset on success
            }
            
            results.push({ 
              number, 
              success, 
              result: menuResult,
              error: menuResult.error || (menuResponse.ok ? null : `HTTP ${menuResponse.status}`)
            });
            
            // Update campaign progress in real-time every 5 messages or on last message
            if (campaignId && (i % 5 === 0 || i === menuNumbers.length - 1)) {
              try {
                const currentSent = results.filter(r => r.success).length;
                const currentFailed = results.filter(r => !r.success).length;
                await supabase
                  .from("campaigns")
                  .update({
                    sent_count: currentSent,
                    failed_count: currentFailed
                  })
                  .eq("id", campaignId);
                console.log(`[wa-sender] Progress update: ${currentSent} sent, ${currentFailed} failed`);
              } catch (updateErr) {
                console.error(`[wa-sender] Failed to update progress:`, updateErr);
              }
            }
            
            // Delay logic
            if (i < menuNumbers.length - 1 && !disconnectionDetected && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
              // Check if we need a longer pause
              if (pauseEveryX > 0 && (i + 1) % pauseEveryX === 0) {
                console.log(`[wa-sender] Taking ${pauseDuration}s pause after ${i + 1} messages`);
                await new Promise(resolve => setTimeout(resolve, pauseDuration * 1000));
              } else {
                // Random delay between sends
                const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
              }
            }
          } catch (err) {
            console.error(`[wa-sender] Error sending to ${number}:`, err);
            results.push({ number, success: false, error: String(err) });
            failedNumbers.push(menuNumbers[i]);
            consecutiveErrors++;
            
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              console.log(`[wa-sender] Too many consecutive errors, stopping`);
              for (let j = i + 1; j < menuNumbers.length; j++) {
                failedNumbers.push(menuNumbers[j]);
              }
              break;
            }
          }
        }
        
        const sentCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        console.log(`[wa-sender] Menu campaign complete: ${sentCount} sent, ${failedCount} failed, disconnected: ${disconnectionDetected}`);
        
        // If disconnection detected and we have a campaign ID, update campaign status
        if (disconnectionDetected && campaignId) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const supabaseClient = createClient(supabaseUrl, supabaseKey);
            
            await supabaseClient
              .from("campaigns")
              .update({
                status: "paused_disconnected",
                sent_count: sentCount,
                failed_count: failedNumbers.length
              })
              .eq("id", campaignId);
            
            console.log(`[wa-sender] Campaign ${campaignId} paused due to disconnection`);
          } catch (updateErr) {
            console.error(`[wa-sender] Failed to update campaign status:`, updateErr);
          }
        }

        if ((campaignId || params.info) && sentCount > 0) {
          await sendCampaignStartTelegramNotification({
            supabase,
            connection,
            params: { ...params, menuType },
            result: {
              count: sentCount + failedCount,
              status: disconnectionDetected ? "paused_disconnected" : "started",
              folder_id: null,
            },
          });
        }
        
        return new Response(JSON.stringify({
          success: sentCount > 0,
          disconnected: disconnectionDetected,
          disconnectedAtIndex,
          failedNumbers,
          data: { sent: sentCount, failed: failedCount, results }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      case "advanced":
        // Create advanced campaign
        endpoint = `${base_url}/sender/advanced`;
        body = {
          delayMin: params.delayMin || 3,
          delayMax: params.delayMax || 6,
          info: params.info,
          scheduled_for: params.scheduled_for,
          messages: params.messages
        };
        break;

      case "control":
        // Control campaign (start/stop/resume)
        endpoint = `${base_url}/sender/edit`;
        body = {
          folder_id: params.folder_id,
          action: params.controlAction // start, stop, resume
        };
        break;

      case "list":
        // List campaign messages
        endpoint = `${base_url}/sender/listmessages`;
        body = {
          folder_id: params.folder_id,
          messageStatus: params.messageStatus || "Scheduled",
          page: params.page || 1,
          pageSize: params.pageSize || 50
        };
        break;

      case "campaign_with_progress":
        // Campaign with real-time progress tracking via Supabase
        const progressNumbers = params.numbers || [];
        const progressType = params.type || "text";
        const delayInterval = params.delayInterval || 20;
        const progressPauseEveryX = params.pauseEveryX || 0;
        const progressPauseDuration = params.pauseDuration || 60;
        
        console.log(`[wa-sender] Starting campaign with progress: ${progressNumbers.length} contacts`);
        console.log(`[wa-sender] Delay: ${delayInterval}s, Pause every ${progressPauseEveryX} with ${progressPauseDuration}s duration`);
        
        // Get user from auth header
        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;
        
        if (authHeader) {
          const token_jwt = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token_jwt);
          userId = user?.id || null;
        }
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            error: "User authentication required" 
          }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        // Prepare messages
        const progressMessages = progressNumbers.map((num: string) => {
          const cleanNumber = num.replace("@s.whatsapp.net", "").replace(/\D/g, "");
          return {
            number: cleanNumber,
            type: progressType,
            text: params.text || "",
            status: 'pending'
          };
        });
        
        // Create progress record
        const { data: progressRecord, error: progressError } = await supabase
          .from('campaign_progress')
          .insert({
            user_id: userId,
            campaign_name: params.info || "Campanha",
            connection_id: connectionId,
            total_messages: progressMessages.length,
            sent_count: 0,
            failed_count: 0,
            current_status: 'pending',
            current_message_index: 0,
            delay_min: delayInterval,
            delay_max: delayInterval,
            pause_every_x: progressPauseEveryX,
            pause_duration: progressPauseDuration,
            messages: progressMessages,
            results: []
          })
          .select()
          .single();
        
        if (progressError || !progressRecord) {
          console.error("[wa-sender] Failed to create progress record:", progressError);
          return new Response(JSON.stringify({ 
            success: false,
            error: "Failed to create progress record" 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const progressId = progressRecord.id;
        console.log(`[wa-sender] Created progress record: ${progressId}`);
        
        // Start background task to send messages
        const sendMessagesInBackground = async () => {
          const results: any[] = [];
          let sentCount = 0;
          let failedCount = 0;
          
          // Update status to sending
          await supabase
            .from('campaign_progress')
            .update({ 
              current_status: 'sending',
              started_at: new Date().toISOString()
            })
            .eq('id', progressId);
          
          for (let i = 0; i < progressMessages.length; i++) {
            const msg = progressMessages[i];
            
            try {
              // Check if we need to pause
              if (progressPauseEveryX > 0 && i > 0 && i % progressPauseEveryX === 0) {
                console.log(`[wa-sender] Pausing for ${progressPauseDuration}s after ${i} messages`);
                
                const pauseUntil = new Date(Date.now() + progressPauseDuration * 1000).toISOString();
                
                await supabase
                  .from('campaign_progress')
                  .update({ 
                    current_status: 'paused',
                    pause_until: pauseUntil,
                    current_message_index: i
                  })
                  .eq('id', progressId);
                
                await new Promise(resolve => setTimeout(resolve, progressPauseDuration * 1000));
                
                await supabase
                  .from('campaign_progress')
                  .update({ 
                    current_status: 'sending',
                    pause_until: null
                  })
                  .eq('id', progressId);
              }
              
              // Send message based on type
              let sendEndpoint: string;
              let sendBody: any = { number: msg.number };
              
              switch (progressType) {
                case "text":
                  sendEndpoint = `${base_url}/send/text`;
                  sendBody.text = msg.text;
                  break;
                case "image":
                case "video":
                case "audio":
                case "document":
                  sendEndpoint = `${base_url}/send/media`;
                  sendBody.type = progressType;
                  sendBody.file = params.media || params.file || "";
                  if (msg.text) sendBody.text = msg.text;
                  if (progressType === "document" && params.docName) {
                    sendBody.docName = params.docName;
                  }
                  break;
                default:
                  sendEndpoint = `${base_url}/send/text`;
                  sendBody.text = msg.text;
              }
              
              console.log(`[wa-sender] Sending to ${msg.number} (${i + 1}/${progressMessages.length})`);
              
              const sendResponse = await fetch(sendEndpoint, {
                method: "POST",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "token": token
                },
                body: JSON.stringify(sendBody)
              });
              
              const sendResult = await sendResponse.json();
              const success = sendResponse.ok && !sendResult.error;
              
              if (success) {
                sentCount++;
              } else {
                failedCount++;
              }
              
              results.push({
                number: msg.number,
                success,
                result: sendResult,
                timestamp: new Date().toISOString()
              });
              
              // Update progress
              await supabase
                .from('campaign_progress')
                .update({ 
                  sent_count: sentCount,
                  failed_count: failedCount,
                  current_message_index: i + 1,
                  results: results
                })
                .eq('id', progressId);
              
              // Delay between messages (except for last one)
              if (i < progressMessages.length - 1) {
                console.log(`[wa-sender] Waiting ${delayInterval}s before next message`);
                await new Promise(resolve => setTimeout(resolve, delayInterval * 1000));
              }
              
            } catch (err) {
              console.error(`[wa-sender] Error sending to ${msg.number}:`, err);
              failedCount++;
              results.push({
                number: msg.number,
                success: false,
                error: String(err),
                timestamp: new Date().toISOString()
              });
              
              await supabase
                .from('campaign_progress')
                .update({ 
                  failed_count: failedCount,
                  current_message_index: i + 1,
                  results: results
                })
                .eq('id', progressId);
            }
          }
          
          // Mark as completed
          await supabase
            .from('campaign_progress')
            .update({ 
              current_status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', progressId);
          
          console.log(`[wa-sender] Campaign completed: ${sentCount} sent, ${failedCount} failed`);
        };
        
        // Use EdgeRuntime.waitUntil for background processing
        // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(sendMessagesInBackground());
        } else {
          // Fallback: run in foreground (will block response)
          await sendMessagesInBackground();
        }
        
        // Return immediately with progress ID
        return new Response(JSON.stringify({
          success: true,
          progressId: progressId,
          message: "Campaign started. Track progress via realtime updates."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      case "check_folder": {
        // Check folder status from Evolution sender queue
        const folderId = params.folderId;
        if (!folderId) {
          return new Response(JSON.stringify({ success: false, error: "Missing folderId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const folderUrl = `${base_url}/sender/folder/${folderId}`;
        console.log(`[wa-sender] Checking folder status: ${folderUrl}`);
        
        const folderResponse = await fetch(folderUrl, {
          method: "GET",
          headers: { "Accept": "application/json", "token": token }
        });
        
        const folderText = await folderResponse.text();
        console.log(`[wa-sender] Folder response: ${folderText}`);
        
        let folderResult;
        try { folderResult = JSON.parse(folderText); } catch { folderResult = { raw: folderText }; }
        
        // If Evolution returns 404, the folder was already processed and removed
        // This means all messages were sent - treat as completed
        if (folderResponse.status === 404 || folderResult?.code === 404) {
          console.log(`[wa-sender] Folder ${folderId} returned 404 - treating as completed (messages already processed)`);
          return new Response(JSON.stringify({
            success: true,
            data: folderResult,
            progress: { sent: 0, failed: 0, pending: 0, total: 0, completed: true, folderGone: true }
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // Calculate sent/failed/pending from folder data
        let sent = 0, failed = 0, pending = 0, total = 0;
        if (Array.isArray(folderResult)) {
          total = folderResult.length;
          for (const msg of folderResult) {
            const s = msg.status || msg.state || "";
            if (s === "sent" || s === "delivered" || s === "read") sent++;
            else if (s === "failed" || s === "error") failed++;
            else pending++;
          }
        } else if (folderResult?.messages && Array.isArray(folderResult.messages)) {
          total = folderResult.messages.length;
          for (const msg of folderResult.messages) {
            const s = msg.status || msg.state || "";
            if (s === "sent" || s === "delivered" || s === "read") sent++;
            else if (s === "failed" || s === "error") failed++;
            else pending++;
          }
        } else if (folderResult?.status) {
          return new Response(JSON.stringify({
            success: true,
            data: folderResult,
            progress: { sent: folderResult.sent || 0, failed: folderResult.failed || 0, pending: folderResult.pending || 0, total: folderResult.total || 0, completed: folderResult.status === "completed" || folderResult.status === "done" }
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        const completed = pending === 0 && total > 0;
        
        return new Response(JSON.stringify({
          success: true,
          data: folderResult,
          progress: { sent, failed, pending, total, completed }
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ 
          error: "Invalid action. Use: direct, simple, menu, advanced, control, list, campaign_with_progress, check_folder" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    console.log(`[wa-sender] Action: ${action}, Endpoint: ${endpoint}`);
    console.log(`[wa-sender] Body:`, JSON.stringify(body, null, 2));

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
    console.log("[wa-sender] Evolution response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!response.ok) {
      console.error("[wa-sender] Failed:", result);
      
      // Check for "No session" error and provide user-friendly message
      const errorMessage = result?.error === "No session" 
        ? "Instancia WhatsApp desconectada. Reconecte na pagina de Conexoes."
        : "Operation failed";
      
      return new Response(JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: result,
        needsReconnection: result?.error === "No session"
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "simple" && (params.campaignId || params.info)) {
      await sendCampaignStartTelegramNotification({
        supabase,
        connection,
        params,
        result,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[wa-sender] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});