import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verify HMAC signature for state parameter
async function verifyStateSignature(data: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  try {
    // Decode signature from base64
    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Get the app URL from referer or use a default
  const getAppUrl = () => {
    const referer = req.headers.get('referer');
    if (referer) {
      try {
        const url = new URL(referer);
        return `${url.protocol}//${url.host}`;
      } catch {}
    }
    return 'https://nextpro.app';
  };

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('❌ OAuth error:', error);
      const appUrl = getAppUrl();
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/admin?drive_error=${encodeURIComponent(error)}` }
      });
    }

    if (!code || !state) {
      throw new Error('Missing code or state');
    }

    // Parse signed state: base64(JSON) + "." + signature
    const stateParts = state.split('.');
    if (stateParts.length !== 2) {
      console.error('❌ Invalid state format - missing signature');
      throw new Error('Invalid state format');
    }

    const [stateBase64, signature] = stateParts;
    
    // Verify signature using service role key
    const signingSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let stateJson: string;
    
    try {
      stateJson = atob(stateBase64);
    } catch {
      console.error('❌ Invalid state encoding');
      throw new Error('Invalid state encoding');
    }

    const isValid = await verifyStateSignature(stateJson, signature, signingSecret);
    if (!isValid) {
      console.error('❌ State signature verification failed - possible tampering');
      throw new Error('State verification failed');
    }

    console.log('✅ State signature verified');

    // Parse state data
    let stateData: { adminUserId: string; returnUrl?: string; createdAt: number; nonce: string };
    try {
      stateData = JSON.parse(stateJson);
    } catch {
      throw new Error('Invalid state data');
    }

    // Check state expiry (5 minutes max)
    const stateAge = Date.now() - stateData.createdAt;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (stateAge > maxAge) {
      console.error('❌ State expired:', stateAge, 'ms old');
      throw new Error('OAuth session expired. Please try again.');
    }

    const adminUserId = stateData.adminUserId;
    const returnUrl = stateData.returnUrl;
    
    console.log('📝 Processing OAuth callback for Next Pro admin:', adminUserId);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-drive-callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('❌ Token exchange error:', tokens);
      throw new Error(tokens.error_description || tokens.error);
    }

    console.log('✅ Got tokens, saving to database...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate expires_at
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Create main backup folder in Drive for Next Pro
    const folderResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Next Pro - Backups Centralizados',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }
    );

    const folder = await folderResponse.json();
    console.log('📁 Created Next Pro backup folder:', folder.id);

    // Save tokens to google_drive_tokens (admin's centralized tokens)
    const { error: saveError } = await supabase
      .from('google_drive_tokens')
      .upsert({
        user_id: adminUserId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        folder_id: folder.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (saveError) {
      console.error('❌ Error saving tokens:', saveError);
      throw saveError;
    }

    console.log('✅ Google Drive connected successfully for Next Pro admin:', adminUserId);

    // Redirect back to the app with success parameter
    const finalUrl = returnUrl || `${getAppUrl()}/admin`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${finalUrl}?drive_connected=true` }
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Callback error:', error);
    
    const appUrl = getAppUrl();
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${appUrl}/admin?drive_error=${encodeURIComponent(errMsg)}` }
    });
  }
});
