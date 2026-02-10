-- Cron: cleanup-old-dms
-- Schedule: Every hour (0 * * * *)
-- Priority: High
--
-- Deletes direct_messages older than 24 hours.
-- Mirrors the existing cleanup-old-messages job but for the direct_messages table.
--
-- The cleanup-stale-dm-sessions job handles active sessions that go idle (>1h),
-- but this job catches any DMs that slip through — e.g. long-running sessions
-- where both users keep their tabs open for days.

select cron.schedule(
  'cleanup-old-dms',
  '0 * * * *',
  $$delete from public.direct_messages where created_at < now() - interval '24 hours'$$
);

-- To verify:
-- select * from cron.job where jobname = 'cleanup-old-dms';

-- To unschedule:
-- select cron.unschedule('cleanup-old-dms');
