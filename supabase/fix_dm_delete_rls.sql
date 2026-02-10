-- Fix: Allow either DM participant to delete messages in their sessions
-- Priority: High
--
-- The current DELETE policy on direct_messages only allows sender_id = auth.uid().
-- This means when user B ends a session, they can't delete messages sent by user A.
-- Since sessions are marked inactive (not deleted), the ON DELETE CASCADE FK never fires.
--
-- This policy allows either the sender or receiver to delete DMs they're part of.

-- Drop the existing restrictive policy
drop policy if exists "Users can delete their own DMs" on public.direct_messages;

-- Replace with a policy that allows either participant to delete
create policy "Session participants can delete DMs"
  on public.direct_messages for delete
  to authenticated
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
  );
