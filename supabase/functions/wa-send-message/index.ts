import { requireActivePlan } from "../_shared/planGuard.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const blocked = await requireActivePlan(req, corsHeaders);
  if (blocked) return blocked;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { instanceId, token, baseUrl, to, message, conversationId } = await req.json();

    if (!instanceId || !token || !to || !message) {
      return new Response(
        JSON.stringify({ error: 'instanceId, token, to, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalBaseUrl = baseUrl || (Deno.env.get('EVOLUTION_BASE_URL') ?? '');
    const sendUrl = `${finalBaseUrl}/instances/${instanceId}/send-text`;

    console.log(`Sending message to ${to} via instance ${instanceId}`);

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone: to,
        message: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Evolution error: ${response.status} - ${error}`);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: error }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    // Salvar mensagem no banco se conversationId foi fornecido
    if (conversationId) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'agent',
          type: 'text',
          content: message,
          timestamp: new Date().toISOString(),
        });

      // Atualizar última mensagem da conversa
      await supabase
        .from('conversations')
        .update({
          last_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wa-send-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
