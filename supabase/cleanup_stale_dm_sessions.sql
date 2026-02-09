-- Cleanup stale DM sessions where no messages have been sent in the last hour
-- This acts as a server-side safety net for sessions that weren't cleaned up client-side
-- (e.g. both users closed their browser without ending the session)
--
-- Requires pg_cron extension (Supabase Pro plan or self-hosted)
-- Run this in the SQL Editor after enabling pg_cron in Dashboard → Database → Extensions

-- Step 1: Create a function that ends stale DM sessions
create or replace function cleanup_stale_dm_sessions()
returns void
language plpgsql
security definer
as $$
declare
  stale_session record;
begin
  -- Find active DM sessions where the most recent message (or session start)
  -- is older than 1 hour
  for stale_session in
    select ds.id
    from dm_sessions ds
    where ds.is_active = true
      and (
        -- Check last message time, or fall back to session start time
        coalesce(
          (select max(dm.created_at) from direct_messages dm where dm.session_id = ds.id),
          ds.started_at
        ) < now() - interval '1 hour'
      )
  loop
    -- Delete messages for this session
    delete from direct_messages where session_id = stale_session.id;

    -- Mark session as ended
    update dm_sessions
    set is_active = false, ended_at = now()
    where id = stale_session.id;
  end loop;
end;
$$;

-- Step 2: Schedule the cleanup to run every 30 minutes
select cron.schedule(
  'cleanup-stale-dm-sessions',
  '*/30 * * * *',  -- every 30 minutes
  $$select cleanup_stale_dm_sessions()$$
);

-- To verify the job is scheduled:
-- select * from cron.job;

-- To unschedule:
-- select cron.unschedule('cleanup-stale-dm-sessions');
