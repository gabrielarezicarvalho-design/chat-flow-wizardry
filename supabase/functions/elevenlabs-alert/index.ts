import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, alertType, storageUsed, storageLimit } = await req.json();

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    // Create alert message in Portuguese
    let alertMessage = '';
    
    switch (alertType) {
      case 'storage_warning':
        alertMessage = `Atenção! A empresa ${companyName} está com ${storageUsed} de ${storageLimit} de armazenamento utilizado. Recomendamos verificar o uso do disco.`;
        break;
      case 'storage_critical':
        alertMessage = `Alerta crítico! A empresa ${companyName} está com armazenamento quase cheio. ${storageUsed} de ${storageLimit} utilizados. Ação imediata necessária.`;
        break;
      case 'connection_failed':
        alertMessage = `Falha de conexão! Não foi possível conectar ao Supabase da empresa ${companyName}. Verifique as credenciais.`;
        break;
      default:
        alertMessage = `Alerta para a empresa ${companyName}: ${alertType}`;
    }

    console.log('Generating audio for:', alertMessage);

    // Generate speech using ElevenLabs TTS
    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/pFZP5JQG7iQjIQuC4Bku', // Lily voice
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: alertMessage,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', error);
      throw new Error(`Failed to generate speech: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
