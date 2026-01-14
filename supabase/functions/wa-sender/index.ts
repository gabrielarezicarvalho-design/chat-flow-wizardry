import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
            // UZAPI: POST /send/text
            directEndpoint = `${base_url}/send/text`;
            directBody.text = params.text || "";
            if (params.linkPreview) directBody.linkPreview = true;
            break;
            
          case "image":
          case "video":
          case "audio":
          case "document":
            // UZAPI: POST /send/media
            directEndpoint = `${base_url}/send/media`;
            directBody.type = directType;
            directBody.file = params.media || params.file || "";
            // UZAPI uses 'text' as caption for media
            if (params.text) directBody.text = params.text;
            if (directType === "document" && params.docName) {
              directBody.docName = params.docName;
            }
            break;
            
          case "button":
            // UZAPI: POST /send/menu with type: button
            directEndpoint = `${base_url}/send/menu`;
            directBody.type = "button";
            directBody.text = params.text || "Selecione uma opção:";
            directBody.choices = params.choices || [];
            if (params.footerText) directBody.footerText = params.footerText;
            if (params.imageButton) directBody.imageButton = params.imageButton;
            break;
            
          case "list":
            // UZAPI: POST /send/menu with type: list
            directEndpoint = `${base_url}/send/menu`;
            directBody.type = "list";
            directBody.text = params.text || "Selecione uma opção:";
            directBody.choices = params.choices || [];
            directBody.listButton = params.listButton || "Ver opções";
            if (params.footerText) directBody.footerText = params.footerText;
            break;
            
          case "carousel":
            // UZAPI: POST /send/carousel (alternative format)
            directEndpoint = `${base_url}/send/carousel`;
            directBody.text = params.text || "";
            directBody.carousel = params.carousel || [];
            break;
            
          case "poll":
            // UZAPI: POST /send/menu with type: poll
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

      case "simple":
        // Use UZAPI /sender/advanced endpoint with proper message formatting
        // IMPORTANT: Delay only works when there are MULTIPLE messages in the queue
        // For single message, we use scheduled_for to add delay
        endpoint = `${base_url}/sender/advanced`;
        
        const simpleNumbers = params.numbers || [];
        const simpleType = params.type || "text";
        const simpleMedia = params.media || params.file;
        const requestedDelayMin = params.delayMin || 10;
        const requestedDelayMax = params.delayMax || 30;
        
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
              if (params.viewOnce) msg.viewOnce = true;
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
          info: params.info || "Campanha via MarketFlow",
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

      case "menu":
        // Send interactive menu (button, list, carousel, poll) to multiple numbers
        const menuNumbers = params.numbers || [];
        const menuType = params.menuType || "button"; // button, list, carousel, poll
        const menuText = params.text || "";
        const delayMin = params.delayMin || 10;
        const delayMax = params.delayMax || 30;
        const pauseEveryX = params.pauseEveryX || 0; // 0 = no pause
        const pauseDuration = params.pauseDuration || 60;
        
        console.log(`[wa-sender] Sending menu type: ${menuType} to ${menuNumbers.length} contacts`);
        console.log(`[wa-sender] Text: ${menuText}`);
        console.log(`[wa-sender] Delay: ${delayMin}-${delayMax}s, Pause every ${pauseEveryX} with ${pauseDuration}s duration`);
        
        const results = [];
        for (let i = 0; i < menuNumbers.length; i++) {
          const number = menuNumbers[i].replace("@s.whatsapp.net", "").replace(/\D/g, "");
          
          try {
            let menuEndpoint: string;
            let menuBody: any = {
              number: number,
              text: menuText || "Selecione uma opção:"
            };
            
            if (menuType === "carousel") {
              // Use /send/carousel endpoint with carousel array format
              menuEndpoint = `${base_url}/send/carousel`;
              menuBody.carousel = params.carousel || [];
            } else {
              // Use /send/menu for button, list, poll
              menuEndpoint = `${base_url}/send/menu`;
              
              // UZAPI uses "button" not "buttons"
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
              if (params.imageButton) {
                menuBody.imageButton = params.imageButton;
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
            const success = menuResponse.ok && !menuResult.error;
            
            console.log(`[wa-sender] Response for ${number}:`, JSON.stringify(menuResult));
            
            results.push({ 
              number, 
              success, 
              result: menuResult,
              error: menuResult.error || (menuResponse.ok ? null : `HTTP ${menuResponse.status}`)
            });
            
            // Delay logic
            if (i < menuNumbers.length - 1) {
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
          }
        }
        
        const sentCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        console.log(`[wa-sender] Menu campaign complete: ${sentCount} sent, ${failedCount} failed`);
        
        return new Response(JSON.stringify({
          success: sentCount > 0,
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

      default:
        return new Response(JSON.stringify({ 
          error: "Invalid action. Use: direct, simple, menu, advanced, control, list, campaign_with_progress" 
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
    console.log("[wa-sender] UAZAPI response:", responseText);

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