import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC signature for state parameter
async function generateStateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Google Drive Auth - Starting...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User auth error:', userError);
      throw new Error('User not authenticated');
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user is admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: rolesData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = rolesData?.some(r => r.role === 'admin');

    if (!isAdmin) {
      console.error('❌ User is not admin');
      throw new Error('Only admins can connect Google Drive');
    }

    console.log('✅ User is admin');

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      console.error('❌ GOOGLE_CLIENT_ID not configured');
      throw new Error('Google OAuth not configured. Please add GOOGLE_CLIENT_ID secret.');
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-drive-callback`;

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ].join(' ');

    // Get return URL from request body if provided
    let returnUrl: string | undefined;
    try {
      const body = await req.json();
      returnUrl = body?.returnUrl;
    } catch {
      // No body or invalid JSON, that's ok
    }

    // Create state data with timestamp for expiry check
    const stateData = {
      adminUserId: user.id,
      returnUrl: returnUrl || undefined,
      createdAt: Date.now(),
      nonce: crypto.randomUUID() // Prevent replay attacks
    };

    // Get signing secret (use service role key as secret - it's already secure)
    const signingSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Create signed state: base64(JSON) + "." + signature
    const stateJson = JSON.stringify(stateData);
    const stateBase64 = btoa(stateJson);
    const signature = await generateStateSignature(stateJson, signingSecret);
    const signedState = `${stateBase64}.${signature}`;

    console.log('🔐 Generated signed OAuth state with HMAC protection');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', signedState);

    console.log('🔗 Generated Google OAuth URL for admin:', user.id);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error generating auth URL:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
