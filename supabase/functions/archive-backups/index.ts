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
    const { userId, backupIds, archiveAll, month, archiveFolderName } = await req.json();
    
    console.log('📦 Archive backups request:', { userId, backupIds, archiveAll, month, archiveFolderName });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Drive tokens
    const { data: tokenData } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!tokenData) {
      throw new Error('Google Drive não conectado');
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now >= expiresAt) {
      console.log('🔄 Refreshing access token...');
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
        throw new Error('Erro ao renovar token do Drive');
      }

      accessToken = tokens.access_token;
      await supabase
        .from('google_drive_tokens')
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('user_id', userId);
    }

    // Get main folder
    const mainFolderId = tokenData.folder_id;
    if (!mainFolderId) {
      throw new Error('Pasta principal do Drive não encontrada');
    }

    // Create or find archive folder
    const archiveName = archiveFolderName || `Arquivo - ${new Date().toISOString().slice(0, 7)}`;
    
    // Search for existing archive folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${archiveName}' and '${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );
    
    const searchData = await searchResponse.json();
    let archiveFolderId: string;

    if (searchData.files && searchData.files.length > 0) {
      archiveFolderId = searchData.files[0].id;
      console.log('📁 Using existing archive folder:', archiveFolderId);
    } else {
      // Create new archive folder
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: archiveName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [mainFolderId],
        }),
      });

      const createData = await createResponse.json();
      archiveFolderId = createData.id;
      console.log('📁 Created new archive folder:', archiveFolderId);
    }

    // Get backups to archive
    let query = supabase.from('conversation_backups').select('*');
    
    if (archiveAll) {
      query = query.eq('user_id', userId);
    } else if (month) {
      query = query.eq('user_id', userId).eq('backup_month', month);
    } else if (backupIds && backupIds.length > 0) {
      query = query.in('id', backupIds);
    } else {
      throw new Error('Especifique backupIds, month, ou archiveAll');
    }

    const { data: backups, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    
    console.log(`📝 Found ${backups?.length || 0} backups to archive`);

    let archived = 0;
    let failed = 0;

    // Move files to archive folder
    if (backups) {
      for (const backup of backups) {
        if (backup.drive_file_id) {
          try {
            // Move file to archive folder (update parents)
            const moveResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${backup.drive_file_id}?addParents=${archiveFolderId}&removeParents=${mainFolderId}`,
              {
                method: 'PATCH',
                headers: { 
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (moveResponse.ok) {
              archived++;
              console.log('✅ Archived:', backup.drive_file_id);
            } else {
              failed++;
              const errorData = await moveResponse.json();
              console.log('❌ Failed to archive:', backup.drive_file_id, errorData);
            }
          } catch (err) {
            failed++;
            console.error('❌ Error archiving:', err);
          }
        }
      }
    }

    // Get archive folder URL
    const archiveFolderUrl = `https://drive.google.com/drive/folders/${archiveFolderId}`;

    return new Response(
      JSON.stringify({
        success: true,
        archived,
        failed,
        archiveFolderId,
        archiveFolderUrl,
        archiveName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Archive error:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
