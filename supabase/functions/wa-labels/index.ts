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
        console.log("=== ADD_TO_CONTACT ACTION STARTED ===");
        console.log(`Received: labelName=${labelName}, contactPhone=${contactPhone}, labelId=${labelId}`);
        
        // Add label to a contact - now accepts labelName and finds/creates the label
        const tagName = labelName;
        const phoneNumber = contactPhone;

        if (!tagName && !labelId) {
          console.log("ERROR: Missing labelName and labelId");
          return new Response(JSON.stringify({ 
            error: "Missing labelName or labelId" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!phoneNumber) {
          console.log("ERROR: Missing phoneNumber");
          return new Response(JSON.stringify({ 
            error: "Missing phone/contactPhone" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        console.log(`Adding label "${tagName}" to contact ${phoneNumber}`);

        // First, get all labels from WhatsApp to find the one matching our tag name
        let waLabelId = labelId;
        
        if (!waLabelId && tagName) {
          console.log("Looking for label in WhatsApp...");
          const listEndpoints = [
            `${baseUrl}/labels`,
            `${baseUrl}/label/list`,
            `${baseUrl}/misc/getLabels`
          ];

          let existingLabels: any[] = [];

          for (const endpoint of listEndpoints) {
            try {
              console.log(`Fetching labels from: ${endpoint}`);
              const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "token": instanceToken
                }
              });

              console.log(`Response status: ${response.status}`);
              
              if (response.ok) {
                const result = await response.json();
                console.log(`Labels found:`, JSON.stringify(result).substring(0, 500));
                
                if (Array.isArray(result)) {
                  existingLabels = result;
                  break;
                } else if (result?.labels || result?.data) {
                  existingLabels = result.labels || result.data;
                  break;
                }
              }
            } catch (err) {
              console.log(`List labels failed:`, err);
            }
          }

          console.log(`Total labels found: ${existingLabels.length}`);

          // Find label by name (case insensitive)
          const matchingLabel = existingLabels.find((l: any) => {
            const name = l.name || l.displayName || l.title;
            return name && name.toLowerCase() === tagName.toLowerCase();
          });

          if (matchingLabel) {
            waLabelId = matchingLabel.labelid || matchingLabel.id || matchingLabel.labelId;
            console.log(`Found existing WhatsApp label ID: ${waLabelId} for "${tagName}"`);
          } else {
            // Create the label in WhatsApp
            console.log(`Label "${tagName}" not found in WhatsApp, creating...`);
            
            const createEndpoints = [
              { url: `${baseUrl}/label/create`, body: { name: tagName, color: 1 } },
              { url: `${baseUrl}/misc/createLabel`, body: { name: tagName, labelColor: 1 } }
            ];

            for (const endpoint of createEndpoints) {
              try {
                console.log(`Creating label at: ${endpoint.url}`);
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
                console.log(`Create label response (${response.status}):`, JSON.stringify(result));

                if (response.ok && !result.error) {
                  waLabelId = result.labelid || result.id || result.labelId || result.label?.id;
                  console.log(`Created new WhatsApp label ID: ${waLabelId}`);
                  break;
                }
              } catch (err) {
                console.log(`Create label failed:`, err);
              }
            }
          }
        }

        if (!waLabelId) {
          console.log(`ERROR: Could not find or create WhatsApp label for "${tagName}"`);
          return new Response(JSON.stringify({
            success: false,
            error: "Could not find or create label in WhatsApp",
            localOnly: true
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Format phone number - just digits
        const phone = phoneNumber.replace(/\D/g, "");
        console.log(`Formatted phone: ${phone}, waLabelId: ${waLabelId}`);

        // According to UAZAPI docs:
        // PUT /labels/chats with body: { number: "5511999999999", add_labelid: "10" }
        const addEndpoints = [
          { url: `${baseUrl}/labels/chats`, method: "PUT", body: { number: phone, add_labelid: String(waLabelId) } },
          { url: `${baseUrl}/label/chats`, method: "PUT", body: { number: phone, add_labelid: String(waLabelId) } },
          { url: `${baseUrl}/labels/chat`, method: "PUT", body: { number: phone, add_labelid: String(waLabelId) } },
          { url: `${baseUrl}/chat/labels`, method: "PUT", body: { number: phone, add_labelid: String(waLabelId) } },
        ];

        let lastError = null;
        let lastResponse = null;

        for (const endpoint of addEndpoints) {
          try {
            console.log(`Trying: ${endpoint.method} ${endpoint.url}`);
            console.log(`Body:`, JSON.stringify(endpoint.body));
            
            const response = await fetch(endpoint.url, {
              method: endpoint.method,
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": instanceToken
              },
              body: JSON.stringify(endpoint.body)
            });

            const responseText = await response.text();
            console.log(`Response (${response.status}): ${responseText}`);

            let result;
            try {
              result = JSON.parse(responseText);
            } catch {
              result = { raw: responseText };
            }

            lastResponse = { status: response.status, result };

            if (response.ok && !result.error) {
              console.log("=== SUCCESS: Label added to WhatsApp! ===");
              return new Response(JSON.stringify({
                success: true,
                message: "Label added to contact in WhatsApp",
                waLabelId,
                response: result
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            } else {
              lastError = result.error || result.message || `Status ${response.status}`;
            }
          } catch (err) {
            console.log(`Request failed:`, err);
            lastError = String(err);
          }
        }

        console.log(`=== FAILED: Could not add label to WhatsApp. Last error: ${lastError} ===`);
        
        // Return success for local but indicate WhatsApp sync failed
        return new Response(JSON.stringify({
          success: true,
          localOnly: true,
          message: "Label saved locally. WhatsApp sync failed.",
          waLabelId,
          lastError,
          lastResponse
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "sync": {
        // Sync labels from WhatsApp to local tags table AND their contacts
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

        let addedTagsCount = 0;
        let addedContactsCount = 0;
        let skippedContactsCount = 0;

        // Color mapping for WhatsApp label colors (numeric)
        const colorMap: { [key: number]: string } = {
          0: '#ff9484', // Pink/Salmon
          1: '#64c4ff', // Blue
          2: '#fed428', // Yellow
          3: '#dfaef0', // Purple/Lavender
          4: '#9adf9c', // Green
          5: '#ffd099', // Orange/Peach
          6: '#8edaff', // Light Blue
          7: '#d2b48c', // Tan
          8: '#c0c0c0', // Silver
          9: '#87ceeb', // Sky Blue
          10: '#01d0e2', // Cyan
          11: '#98fb98', // Pale Green
          12: '#dda0dd', // Plum
          13: '#f64847', // Red
        };

        // Helper function to extract phone from JID
        const extractPhoneFromJid = (jid: string): string => {
          if (!jid) return '';
          return jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
        };

        for (const label of labels) {
          const labelName = label.name || label.displayName || label.title;
          if (!labelName) continue;

          // Convert numeric color to hex, also use colorHex if available
          let labelColor = label.colorHex || '#3b82f6';
          if (!label.colorHex && typeof label.color === 'number') {
            labelColor = colorMap[label.color] || '#3b82f6';
          }

          // Get label ID
          const labelId = label.labelid || label.id || label.labelId;

          // Check if tag exists
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id, name')
            .eq('user_id', ownerId)
            .eq('name', labelName)
            .maybeSingle();

          let tagId = existingTag?.id;
          const tagName = existingTag?.name || labelName;

          if (!existingTag) {
            const { data: newTag, error: insertError } = await supabase
              .from('tags')
              .insert({
                user_id: ownerId,
                name: labelName,
                color: labelColor
              })
              .select('id, name')
              .single();

            if (!insertError && newTag) {
              addedTagsCount++;
              tagId = newTag.id;
            }
          }

          // Now fetch contacts for this label
          if (labelId) {
            console.log(`Fetching contacts for label: ${labelName} (ID: ${labelId})`);
            
            const contactEndpoints = [
              `${baseUrl}/label/${labelId}/chats`,
              `${baseUrl}/label/chats/${labelId}`,
              `${baseUrl}/misc/getLabelChats/${labelId}`,
              `${baseUrl}/chat/findLabelChats/${labelId}`
            ];

            let labelContacts: any[] = [];

            for (const endpoint of contactEndpoints) {
              try {
                console.log(`Trying contacts endpoint: ${endpoint}`);
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
                  console.log(`Contacts response for ${labelName}:`, JSON.stringify(result).substring(0, 500));
                  
                  if (Array.isArray(result)) {
                    labelContacts = result;
                    break;
                  } else if (result?.chats || result?.contacts || result?.data) {
                    labelContacts = result.chats || result.contacts || result.data;
                    break;
                  }
                }
              } catch (err) {
                console.log(`Contacts endpoint failed:`, err);
              }
            }

            // Save contacts with this tag
            for (const contact of labelContacts) {
              const phone = extractPhoneFromJid(contact.id || contact.jid || contact.phone || '');
              const name = contact.name || contact.pushname || contact.notify || phone || 'Sem nome';

              if (!phone) continue;

              // Check if lead exists
              const { data: existingLead } = await supabase
                .from('leads')
                .select('id, tags')
                .eq('user_id', ownerId)
                .eq('phone', phone)
                .maybeSingle();

              if (existingLead) {
                // Update existing lead with new tag if not already present
                const currentTags = existingLead.tags || [];
                if (!currentTags.includes(tagName)) {
                  const { error: updateError } = await supabase
                    .from('leads')
                    .update({ tags: [...currentTags, tagName] })
                    .eq('id', existingLead.id);

                  if (!updateError) {
                    addedContactsCount++;
                  }
                } else {
                  skippedContactsCount++;
                }
              } else {
                // Insert new lead with tag
                const { error: insertError } = await supabase
                  .from('leads')
                  .insert({
                    user_id: ownerId,
                    name: name,
                    phone: phone,
                    source: 'whatsapp-label',
                    tags: [tagName]
                  });

                if (!insertError) {
                  addedContactsCount++;
                } else {
                  console.log(`Insert error for ${phone}:`, insertError);
                  skippedContactsCount++;
                }
              }
            }

            console.log(`Label ${labelName}: found ${labelContacts.length} contacts`);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          addedTags: addedTagsCount,
          addedContacts: addedContactsCount,
          skippedContacts: skippedContactsCount,
          totalLabels: labels.length,
          message: labels.length === 0 
            ? "Nenhuma etiqueta encontrada no WhatsApp Business" 
            : `${addedTagsCount} etiquetas e ${addedContactsCount} contatos sincronizados`
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
