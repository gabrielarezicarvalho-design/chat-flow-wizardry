import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Check if today is the last day of the month
function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getDate() === 1;
}

// This function runs via cron job on days 28-31 at midnight
// It checks internally if it's actually the last day of the month
serve(async (req) => {
  console.log('🕐 Monthly backup cron job triggered');

  // Check if today is the last day of the month
  if (!isLastDayOfMonth()) {
    console.log('📅 Not the last day of the month, skipping backup');
    return new Response(
      JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: 'Not the last day of the month'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('✅ Confirmed last day of month, starting backups');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with Google Drive connected
    const { data: users, error: usersError } = await supabase
      .from('google_drive_tokens')
      .select('user_id');

    if (usersError) throw usersError;

    console.log(`📋 Found ${users?.length || 0} users with Drive connected`);

    const currentMonth = new Date().toISOString().slice(0, 7); // 2024-01
    const results = [];

    for (const user of users || []) {
      try {
        console.log('📁 Processing backup for user:', user.user_id);

        // Call the backup function for this user
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-drive-backup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              userId: user.user_id,
              month: currentMonth,
            }),
          }
        );

        const result = await response.json();
        results.push({ userId: user.user_id, ...result });

        console.log(`✅ User ${user.user_id}: ${result.backedUp || 0} conversations backed up`);

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing user ${user.user_id}:`, error);
        results.push({ userId: user.user_id, error: errMsg });
      }
    }

    console.log('🏁 Monthly backup cron job completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedUsers: results.length,
        results 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cron job error:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
