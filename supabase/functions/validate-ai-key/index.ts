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
    const { provider, apiKey } = await req.json();

    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Provider and API key are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let isValid = false;
    let errorMessage = '';

    if (provider === 'openai') {
      // Validate OpenAI key by making a simple request
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          }
        });
        isValid = response.ok;
        if (!isValid) {
          const error = await response.json();
          errorMessage = error?.error?.message || 'Invalid API key';
        }
      } catch (e) {
        errorMessage = 'Failed to validate OpenAI key';
        console.error('OpenAI validation error:', e);
      }
    } else if (provider === 'google') {
      // Validate Google AI key
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        isValid = response.ok;
        if (!isValid) {
          const error = await response.json();
          errorMessage = error?.error?.message || 'Invalid API key';
        }
      } catch (e) {
        errorMessage = 'Failed to validate Google AI key';
        console.error('Google AI validation error:', e);
      }
    } else if (provider === 'lovable') {
      // Lovable AI is always valid as it uses internal key
      isValid = true;
    } else if (provider === 'asaas') {
      // Validate Asaas API key by checking balance endpoint
      try {
        const response = await fetch('https://api.asaas.com/v3/myAccount', {
          headers: {
            'access_token': apiKey,
          }
        });
        isValid = response.ok;
        if (!isValid) {
          const error = await response.json();
          errorMessage = error?.errors?.[0]?.description || 'Chave API Asaas inválida';
        }
      } catch (e) {
        errorMessage = 'Falha ao validar chave Asaas';
        console.error('Asaas validation error:', e);
      }
    } else {
      errorMessage = 'Unknown provider';
    }

    console.log(`Validation result for ${provider}: ${isValid ? 'valid' : 'invalid'}`);

    return new Response(
      JSON.stringify({ valid: isValid, error: errorMessage || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating AI key:', error);
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: errMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
