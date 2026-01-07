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
    const { userId, backupIds, deleteAll, month, deleteFromDrive } = await req.json();
    
    console.log('🗑️ Delete backups request:', { userId, backupIds, deleteAll, month, deleteFromDrive });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Drive tokens if we need to delete from Drive
    let accessToken: string | null = null;
    if (deleteFromDrive) {
      const { data: tokenData } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (tokenData) {
        // Check if token needs refresh
        const now = new Date();
        const expiresAt = new Date(tokenData.expires_at);

        if (now >= expiresAt) {
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
          if (!tokens.error) {
            accessToken = tokens.access_token;
            await supabase
              .from('google_drive_tokens')
              .update({
                access_token: tokens.access_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq('user_id', userId);
          }
        } else {
          accessToken = tokenData.access_token;
        }
      }
    }

    // Get backups to delete
    let query = supabase.from('conversation_backups').select('*');
    
    if (deleteAll) {
      // Delete all backups for user
      query = query.eq('user_id', userId);
    } else if (month) {
      // Delete by month
      query = query.eq('user_id', userId).eq('backup_month', month);
    } else if (backupIds && backupIds.length > 0) {
      // Delete specific backups
      query = query.in('id', backupIds);
    } else {
      throw new Error('Especifique backupIds, month, ou deleteAll');
    }

    const { data: backups, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    
    console.log(`📝 Found ${backups?.length || 0} backups to delete`);

    let deletedFromDrive = 0;
    let failedDriveDeletes = 0;

    // Delete from Drive if requested
    if (deleteFromDrive && accessToken && backups) {
      for (const backup of backups) {
        if (backup.drive_file_id) {
          try {
            const deleteResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${backup.drive_file_id}`,
              {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` },
              }
            );
            
            if (deleteResponse.ok || deleteResponse.status === 404) {
              deletedFromDrive++;
              console.log('✅ Deleted from Drive:', backup.drive_file_id);
            } else {
              failedDriveDeletes++;
              console.log('❌ Failed to delete from Drive:', backup.drive_file_id);
            }
          } catch (err) {
            failedDriveDeletes++;
            console.error('❌ Error deleting from Drive:', err);
          }
        }
      }
    }

    // Delete from database
    let deleteQuery = supabase.from('conversation_backups').delete();
    
    if (deleteAll) {
      deleteQuery = deleteQuery.eq('user_id', userId);
    } else if (month) {
      deleteQuery = deleteQuery.eq('user_id', userId).eq('backup_month', month);
    } else if (backupIds && backupIds.length > 0) {
      deleteQuery = deleteQuery.in('id', backupIds);
    }

    const { error: deleteError } = await deleteQuery;
    
    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({
        success: true,
        deleted: backups?.length || 0,
        deletedFromDrive,
        failedDriveDeletes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Delete error:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});