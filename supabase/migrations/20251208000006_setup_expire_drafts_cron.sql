-- Migration: Set up cron job for expire-drafts Edge Function
-- Description: Schedules the expire-drafts function to run daily at midnight UTC
-- This automatically marks unsubmitted draft reports as expired when submission windows close

-- Enable the pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the expire-drafts function to run daily at midnight UTC
-- The function URL uses the project reference from the linked Supabase project
SELECT cron.schedule(
    'expire-assessment-drafts',  -- Job name
    '0 0 * * *',                 -- Cron expression: Daily at midnight UTC
    $$
    SELECT net.http_post(
        url := 'https://xgzjdebqdsvllrbccsrj.supabase.co/functions/v1/expire-drafts',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Alternative: If the above doesn't work due to service key access, use this simpler approach
-- that calls the function with the anon key (function should handle auth internally)
-- Uncomment if needed:
/*
SELECT cron.schedule(
    'expire-assessment-drafts',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url := 'https://xgzjdebqdsvllrbccsrj.supabase.co/functions/v1/expire-drafts',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
*/

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job if needed:
-- SELECT cron.unschedule('expire-assessment-drafts');
