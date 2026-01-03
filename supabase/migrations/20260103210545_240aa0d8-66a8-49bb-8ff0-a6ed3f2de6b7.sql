-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create the cron job for daily bank transaction sync at 6 AM UTC (3 AM Brasilia time)
SELECT cron.schedule(
  'sync-bank-transactions-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xzzbnnivmbqtiprepxeo.supabase.co/functions/v1/sync-bank-transactions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'timestamp', now())
  );
  $$
);