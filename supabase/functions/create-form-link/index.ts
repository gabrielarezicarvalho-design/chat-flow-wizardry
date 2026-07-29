import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { connectionId, phone, questions, userId, initialMessage, expiresInHours = 24 } = await req.json();

    console.log('📋 Creating form link:', { connectionId, phone, questionsCount: questions?.length });

    if (!connectionId || !phone || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'connectionId, phone e userId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create form record
    const { data: formData, error: formError } = await supabase
      .from('flow_forms')
      .insert({
        user_id: userId,
        connection_id: connectionId,
        phone: phone,
        initial_message: initialMessage || null,
        questions: questions || [],
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (formError) {
      console.error('❌ Error creating form:', formError);
      return new Response(
        JSON.stringify({ success: false, error: formError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Form created:', formData.id);

    // Generate URL - use Next ProChat domain with fixed path
    const baseUrl = 'https://ia.nextprochat.com.br';
    const formUrl = `${baseUrl}/formulario/${formData.id}`;

    return new Response(
      JSON.stringify({
        success: true,
        formId: formData.id,
        url: formUrl,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
