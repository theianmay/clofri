-- Cron: cleanup-orphaned-group-members
-- Schedule: Daily at 4:00 AM UTC (0 4 * * *)
-- Priority: Low
--
-- Removes group_members rows where the parent group has is_active = false.
-- This catches cases where a group was ended but the member cleanup failed
-- client-side (e.g. browser closed mid-operation).
--
-- Note: If you also run purge-inactive-sessions, that job handles groups older
-- than 7 days. This job catches the gap for recently-ended groups (0–7 days old).

select cron.schedule(
  'cleanup-orphaned-group-members',
  '0 4 * * *',
  $$delete from public.group_members where group_id in (select id from public.groups where is_active = false)$$
);

-- To verify:
-- select * from cron.job where jobname = 'cleanup-orphaned-group-members';

-- To unschedule:
-- select cron.unschedule('cleanup-orphaned-group-members');
