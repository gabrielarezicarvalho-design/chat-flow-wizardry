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
    const { action, connectionId, token, base_url, labelName, labelColor, labelId, contactPhone, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let instanceToken = token;
    let baseUrl = base_url || "";
    let ownerId = userId;

    // If connectionId is provided, fetch connection details
    if (connectionId) {
      const { data: conn, error: connError } = await supabase
        .from("connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (connError || !conn) {
        console.error("Connection not found:", connError);
        return new Response(JSON.stringify({ 
          error: "Connection not found" 
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      instanceToken = conn.token;
      baseUrl = conn.base_url || "";
      ownerId = ownerId || conn.user_id;
    }
    
    if (!instanceToken) {
      return new Response(JSON.stringify({ 
        error: "Missing required field: token or connectionId" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!baseUrl) {
      return new Response(JSON.stringify({ 
        error: "Could not determine base_url" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Action: ${action}, baseUrl: ${baseUrl}`);

    switch (action) {
      case "list": {
        // List all labels from WhatsApp
        // Try different endpoints that might work
        const endpoints = [
          `${baseUrl}/label/list`,
          `${baseUrl}/labels`,
          `${baseUrl}/misc/getLabels`
        ];

        let labels: any[] = [];
        let success = false;

        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": instanceToken
              }
            });

            if (response.ok) {
              const result = await response.json();
              console.log(`Response from ${endpoint}:`, JSON.stringify(result));
              
              if (Array.isArray(result)) {
                labels = result;
                success = true;
                break;
              } else if (result?.labels || result?.data) {
                labels = result.labels || result.data;
                success = true;
                break;
              } else if (result && typeof result === 'object' && !result.error) {
                // Handle object response with label properties
                if (Object.keys(result).length > 0) {
                  labels = Object.values(result);
                  success = true;
                  break;
                }
              }
            }
          } catch (err) {
            console.log(`Endpoint ${endpoint} failed:`, err);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          labels,
          message: success ? "Labels retrieved" : "No labels endpoint found or no labels exist"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "create": {
        // Create a new label in WhatsApp
        if (!labelName) {
          return new Response(JSON.stringify({ 
            error: "Missing labelName" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Try different create endpoints
        const createEndpoints = [
          { url: `${baseUrl}/label/create`, body: { name: labelName, color: labelColor || 1 } },
          { url: `${baseUrl}/misc/createLabel`, body: { name: labelName, labelColor: labelColor || 1 } }
        ];

        for (const endpoint of createEndpoints) {
          try {
            console.log(`Trying create endpoint: ${endpoint.url}`);
            const response = await fetch(endpoint.url, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": instanceToken
              },
              body: JSON.stringify(endpoint.body)
            });

            const result = await response.json();
            console.log(`Response:`, JSON.stringify(result));

            if (response.ok && !result.error) {
              // Also save to local tags table
              if (ownerId) {
                await supabase
                  .from("tags")
                  .upsert({
                    user_id: ownerId,
                    name: labelName,
                    color: typeof labelColor === 'string' ? labelColor : '#3b82f6'
                  }, { onConflict: 'user_id,name', ignoreDuplicates: true });
              }

              return new Response(JSON.stringify({
                success: true,
                label: result,
                message: "Label created successfully"
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          } catch (err) {
            console.log(`Create endpoint failed:`, err);
          }
        }

        // If WhatsApp creation fails, still save locally
        if (ownerId) {
          const { error: localError } = await supabase
            .from("tags")
            .insert({
              user_id: ownerId,
              name: labelName,
              color: typeof labelColor === 'string' ? labelColor : '#3b82f6'
            });

          if (!localError) {
            return new Response(JSON.stringify({
              success: true,
              localOnly: true,
              message: "Tag saved locally (WhatsApp label creation not available)"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        return new Response(JSON.stringify({
          success: false,
          error: "Could not create label"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete": {
        // Delete a label
        if (!labelId) {
          return new Response(JSON.stringify({ 
            error: "Missing labelId" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const deleteEndpoints = [
          `${baseUrl}/label/delete/${labelId}`,
          `${baseUrl}/misc/deleteLabel/${labelId}`
        ];

        for (const endpoint of deleteEndpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "DELETE",
              headers: {
                "Accept": "application/json",
                "token": instanceToken
              }
            });

            if (response.ok) {
              return new Response(JSON.stringify({
                success: true,
                message: "Label deleted"
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          } catch (err) {
            console.log(`Delete endpoint failed:`, err);
          }
        }

        return new Response(JSON.stringify({
          success: false,
          error: "Could not delete label"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "add_to_contact": {
        // Add label to a contact
        if (!labelId || !contactPhone) {
          return new Response(JSON.stringify({ 
            error: "Missing labelId or contactPhone" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const phone = contactPhone.replace(/\D/g, "");
        const chatId = `${phone}@s.whatsapp.net`;

        const addEndpoints = [
          { url: `${baseUrl}/label/addToChat`, body: { labelId, chatId } },
          { url: `${baseUrl}/misc/addLabelToChat`, body: { labelId, chatId } }
        ];

        for (const endpoint of addEndpoints) {
          try {
            const response = await fetch(endpoint.url, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": instanceToken
              },
              body: JSON.stringify(endpoint.body)
            });

            if (response.ok) {
              return new Response(JSON.stringify({
                success: true,
                message: "Label added to contact"
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          } catch (err) {
            console.log(`Add to contact failed:`, err);
          }
        }

        return new Response(JSON.stringify({
          success: false,
          error: "Could not add label to contact"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "sync": {
        // Sync labels from WhatsApp to local tags table
        if (!ownerId) {
          return new Response(JSON.stringify({ 
            error: "Missing userId for sync" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Fetch labels from WhatsApp
        const endpoints = [
          `${baseUrl}/label/list`,
          `${baseUrl}/labels`,
          `${baseUrl}/misc/getLabels`
        ];

        let labels: any[] = [];

        for (const endpoint of endpoints) {
          try {
            console.log(`Sync - trying endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": instanceToken
              }
            });

            if (response.ok) {
              const result = await response.json();
              console.log(`Sync response:`, JSON.stringify(result));
              
              if (Array.isArray(result)) {
                labels = result;
                break;
              } else if (result?.labels || result?.data) {
                labels = result.labels || result.data;
                break;
              }
            }
          } catch (err) {
            console.log(`Sync endpoint ${endpoint} failed:`, err);
          }
        }

        let addedCount = 0;
        let skippedCount = 0;

        // Color mapping for WhatsApp label colors (numeric)
        const colorMap: { [key: number]: string } = {
          0: '#808080', // Gray
          1: '#25D366', // Green
          2: '#128C7E', // Teal
          3: '#075E54', // Dark teal
          4: '#DCF8C6', // Light green
          5: '#34B7F1', // Blue
          6: '#FF6B6B', // Red
          7: '#F7DC6F', // Yellow
          8: '#BB8FCE', // Purple
          9: '#F5B041', // Orange
        };

        for (const label of labels) {
          const labelName = label.name || label.displayName || label.title;
          if (!labelName) continue;

          // Convert numeric color to hex
          let labelColor = '#3b82f6';
          if (typeof label.color === 'number') {
            labelColor = colorMap[label.color] || '#3b82f6';
          } else if (typeof label.color === 'string' && label.color.startsWith('#')) {
            labelColor = label.color;
          }

          // Check if tag exists
          const { data: existing } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', ownerId)
            .eq('name', labelName)
            .maybeSingle();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('tags')
              .insert({
                user_id: ownerId,
                name: labelName,
                color: labelColor
              });

            if (!insertError) {
              addedCount++;
            } else {
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        }

        return new Response(JSON.stringify({
          success: true,
          added: addedCount,
          skipped: skippedCount,
          total: labels.length,
          message: labels.length === 0 
            ? "Nenhuma etiqueta encontrada no WhatsApp Business" 
            : `${addedCount} etiquetas sincronizadas`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: "Invalid action. Use: list, create, delete, add_to_contact, or sync" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

  } catch (error) {
    console.error("Error:", error);
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
