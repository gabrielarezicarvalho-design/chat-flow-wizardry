-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the monthly backup cron job
-- Runs at midnight on days 28-31 of every month
-- The function internally checks if it's the last day of the month
SELECT cron.schedule(
  'monthly-drive-backup',
  '0 0 28-31 * *',
  $$
  SELECT net.http_post(
    url := 'https://lvldqyyzhlygwbgcdqcg.supabase.co/functions/v1/backup-conversations-monthly',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bGRxeXl6aGx5Z3diZ2NkcWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjU0OTUsImV4cCI6MjA3ODMwMTQ5NX0.ykwZak2uz1RX1DiU3zdHCizpmpcWcTavubc9by6eqkk"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);