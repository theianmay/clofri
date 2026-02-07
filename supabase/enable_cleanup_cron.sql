-- Enable pg_cron extension (requires Supabase Pro plan or self-hosted)
-- Run this in the SQL Editor after enabling the pg_cron extension in Dashboard → Database → Extensions

create extension if not exists pg_cron;

-- Schedule hourly cleanup: delete messages older than 24 hours
select cron.schedule(
  'cleanup-old-messages',
  '0 * * * *',  -- every hour at minute 0
  $$delete from public.messages where created_at < now() - interval '24 hours'$$
);

-- To verify the job is scheduled:
-- select * from cron.job;

-- To unschedule:
-- select cron.unschedule('cleanup-old-messages');
