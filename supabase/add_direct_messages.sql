-- Migration: Add direct_messages table for 1-on-1 DMs
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- =============================================================================
-- TABLE
-- =============================================================================

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) <= 2000),
  created_at timestamptz not null default now()
);

-- Indexes for fast retrieval
create index if not exists idx_dm_participants
  on public.direct_messages(sender_id, receiver_id, created_at desc);
create index if not exists idx_dm_receiver
  on public.direct_messages(receiver_id, created_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.direct_messages enable row level security;

-- Both sender and receiver can read their DMs
create policy "Users can read their own DMs"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can send DMs (sender must be themselves)
create policy "Users can send DMs"
  on public.direct_messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- Users can delete their own sent messages
create policy "Users can delete their own DMs"
  on public.direct_messages for delete
  to authenticated
  using (auth.uid() = sender_id);

-- =============================================================================
-- CLEANUP: Also clean up DMs older than 24 hours (same as group messages)
-- If you already have pg_cron enabled, run:
-- select cron.schedule(
--   'cleanup-old-dms',
--   '0 * * * *',
--   $$delete from public.direct_messages where created_at < now() - interval '24 hours'$$
-- );
-- =============================================================================

-- =============================================================================
-- CLEANUP: Remove old DM groups that used the dm: naming convention
-- Run this AFTER verifying the new DM system works:
-- delete from public.groups where name like 'dm:%';
-- =============================================================================
