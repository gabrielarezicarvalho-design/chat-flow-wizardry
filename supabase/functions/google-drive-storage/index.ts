import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to refresh token if expired
async function getValidAccessToken(supabase: any, tokenData: any) {
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);

  if (now < expiresAt) {
    return tokenData.access_token;
  }

  console.log('🔄 Token expired, refreshing...');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  
  if (tokens.error) {
    throw new Error(`Token refresh failed: ${tokens.error}`);
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabase
    .from('google_drive_tokens')
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', tokenData.user_id);

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    console.log('📊 Fetching Drive storage for user:', userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's Drive tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      console.log('❌ No Drive tokens found');
      return new Response(
        JSON.stringify({ error: 'Google Drive not connected', connected: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, tokenData);

    // Get Drive about info with storage quota
    const aboutResponse = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!aboutResponse.ok) {
      const errorText = await aboutResponse.text();
      console.error('❌ Drive API error:', errorText);
      throw new Error(`Drive API error: ${aboutResponse.status}`);
    }

    const aboutData = await aboutResponse.json();
    console.log('✅ Got Drive storage info');

    // Get folder info (files count in backup folder)
    let folderInfo = { filesCount: 0, folderSize: 0 };
    
    if (tokenData.folder_id) {
      // List files in backup folder
      const filesResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${tokenData.folder_id}' in parents and trashed=false&fields=files(id,size),nextPageToken&pageSize=1000`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        folderInfo.filesCount = filesData.files?.length || 0;
        folderInfo.folderSize = filesData.files?.reduce((acc: number, file: any) => 
          acc + (parseInt(file.size) || 0), 0
        ) || 0;
        
        console.log(`📁 Backup folder: ${folderInfo.filesCount} files, ${folderInfo.folderSize} bytes`);
      }
    }

    const storageQuota = aboutData.storageQuota || {};
    
    return new Response(
      JSON.stringify({
        connected: true,
        user: {
          email: aboutData.user?.emailAddress,
          displayName: aboutData.user?.displayName,
          photoUrl: aboutData.user?.photoLink,
        },
        storage: {
          limit: parseInt(storageQuota.limit) || 0,
          usage: parseInt(storageQuota.usage) || 0,
          usageInDrive: parseInt(storageQuota.usageInDrive) || 0,
          usageInDriveTrash: parseInt(storageQuota.usageInDriveTrash) || 0,
        },
        backupFolder: {
          id: tokenData.folder_id,
          filesCount: folderInfo.filesCount,
          size: folderInfo.folderSize,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching storage:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
