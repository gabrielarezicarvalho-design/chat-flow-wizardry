import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET request returns webhook info and available endpoints
    if (req.method === "GET") {
      const url = new URL(req.url);
      const userId = url.searchParams.get("user_id");
      
      if (!userId) {
        return new Response(JSON.stringify({
          name: "Campaign Webhook API",
          version: "1.0.0",
          description: "Webhook para integração com campanhas de envio em massa",
          endpoints: {
            "POST /campaign-webhook": {
              description: "Criar nova campanha ou adicionar contatos",
              body: {
                user_id: "UUID do usuário (obrigatório)",
                action: "create_campaign | add_contacts | send_message",
                // For create_campaign
                campaign_name: "Nome da campanha",
                connection_id: "UUID da conexão WhatsApp",
                message: "Conteúdo da mensagem",
                contacts: ["5511999999999", "5511888888888"],
                schedule_at: "2024-01-01T10:00:00Z (opcional)",
                // For add_contacts
                campaign_id: "UUID da campanha existente",
                // For send_message (single message)
                phone: "5511999999999",
              }
            }
          },
          webhook_url: `${supabaseUrl}/functions/v1/campaign-webhook`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get user's campaigns and connections for integration
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name, status, total_contacts, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: connections } = await supabase
        .from("connections")
        .select("id, name, status")
        .eq("user_id", userId);

      return new Response(JSON.stringify({
        success: true,
        user_id: userId,
        campaigns: campaigns || [],
        connections: connections || [],
        webhook_url: `${supabaseUrl}/functions/v1/campaign-webhook`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // POST request handles webhook actions
    if (req.method === "POST") {
      const body = await req.json();
      const { user_id, action, ...params } = body;

      if (!user_id) {
        return new Response(JSON.stringify({
          success: false,
          error: "user_id is required"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[campaign-webhook] Action: ${action}, User: ${user_id}`);

      switch (action) {
        case "create_campaign": {
          const { campaign_name, connection_id, message, contacts, message_type, schedule_at } = params;

          if (!campaign_name || !connection_id || !message || !contacts?.length) {
            return new Response(JSON.stringify({
              success: false,
              error: "Missing required fields: campaign_name, connection_id, message, contacts"
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const { data: campaign, error } = await supabase
            .from("campaigns")
            .insert({
              user_id,
              name: campaign_name,
              connection_id,
              message_content: message,
              message_type: message_type || "text",
              contacts: contacts,
              total_contacts: contacts.length,
              status: schedule_at ? "scheduled" : "pending",
              scheduled_at: schedule_at || null
            })
            .select()
            .single();

          if (error) {
            console.error("[campaign-webhook] Create error:", error);
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            campaign_id: campaign.id,
            message: "Campaign created successfully",
            data: campaign
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        case "add_contacts": {
          const { campaign_id, contacts } = params;

          if (!campaign_id || !contacts?.length) {
            return new Response(JSON.stringify({
              success: false,
              error: "Missing required fields: campaign_id, contacts"
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Get existing campaign
          const { data: campaign, error: getError } = await supabase
            .from("campaigns")
            .select("contacts, total_contacts")
            .eq("id", campaign_id)
            .eq("user_id", user_id)
            .single();

          if (getError || !campaign) {
            return new Response(JSON.stringify({
              success: false,
              error: "Campaign not found"
            }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const existingContacts = (campaign.contacts as string[]) || [];
          const newContacts = [...new Set([...existingContacts, ...contacts])];

          const { error: updateError } = await supabase
            .from("campaigns")
            .update({
              contacts: newContacts,
              total_contacts: newContacts.length
            })
            .eq("id", campaign_id);

          if (updateError) {
            return new Response(JSON.stringify({
              success: false,
              error: updateError.message
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: `Added ${contacts.length} contacts`,
            total_contacts: newContacts.length
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        case "get_status": {
          const { campaign_id } = params;

          if (!campaign_id) {
            return new Response(JSON.stringify({
              success: false,
              error: "Missing campaign_id"
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const { data: campaign, error } = await supabase
            .from("campaigns")
            .select("*")
            .eq("id", campaign_id)
            .eq("user_id", user_id)
            .single();

          if (error || !campaign) {
            return new Response(JSON.stringify({
              success: false,
              error: "Campaign not found"
            }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            campaign
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        case "list_campaigns": {
          const { status, limit } = params;

          let query = supabase
            .from("campaigns")
            .select("id, name, status, total_contacts, sent_count, failed_count, created_at, scheduled_at")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(limit || 50);

          if (status) {
            query = query.eq("status", status);
          }

          const { data: campaigns, error } = await query;

          if (error) {
            return new Response(JSON.stringify({
              success: false,
              error: error.message
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            campaigns
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        default:
          return new Response(JSON.stringify({
            success: false,
            error: `Unknown action: ${action}. Available: create_campaign, add_contacts, get_status, list_campaigns`
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
      }
    }

    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[campaign-webhook] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
