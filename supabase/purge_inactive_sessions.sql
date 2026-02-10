-- Cron: purge-inactive-sessions
-- Schedule: Daily at 3:00 AM UTC (0 3 * * *)
-- Priority: Medium
--
-- Purges old inactive session metadata that accumulates over time:
--   - dm_sessions where is_active = false and ended more than 7 days ago
--   - groups where is_active = false and created more than 7 days ago
--   - group_members orphaned by inactive groups
--
-- Messages for these sessions should already be gone (deleted on end or by TTL crons),
-- but the ON DELETE CASCADE FKs will clean up any stragglers.

create or replace function purge_inactive_sessions()
returns void
language plpgsql
security definer
as $$
begin
  -- Purge old inactive DM sessions (cascade deletes any orphaned direct_messages)
  delete from dm_sessions
  where is_active = false
    and ended_at < now() - interval '7 days';

  -- Remove group_members for inactive groups (before deleting the groups)
  delete from group_members
  where group_id in (
    select id from groups
    where is_active = false
      and created_at < now() - interval '7 days'
  );

  -- Purge old inactive groups (cascade deletes any orphaned messages)
  delete from groups
  where is_active = false
    and created_at < now() - interval '7 days';
end;
$$;

select cron.schedule(
  'purge-inactive-sessions',
  '0 3 * * *',
  $$select purge_inactive_sessions()$$
);

-- To verify:
-- select * from cron.job where jobname = 'purge-inactive-sessions';

-- To unschedule:
-- select cron.unschedule('purge-inactive-sessions');
