-- Migration: Add ephemeral session support
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- =============================================================================
-- GROUPS: Add is_active flag for session lifecycle
-- =============================================================================

alter table public.groups add column if not exists is_active boolean not null default true;

-- =============================================================================
-- DM SESSIONS: Track active DM conversations
-- =============================================================================

create table if not exists public.dm_sessions (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references public.profiles(id) on delete cascade,
  user2_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Ensure user1_id < user2_id for consistent ordering
  check (user1_id < user2_id)
);

create index if not exists idx_dm_sessions_users
  on public.dm_sessions(user1_id, user2_id, is_active);
create index if not exists idx_dm_sessions_active
  on public.dm_sessions(is_active) where is_active = true;

-- =============================================================================
-- Add session_id to direct_messages for session-scoped cleanup
-- =============================================================================

alter table public.direct_messages add column if not exists session_id uuid references public.dm_sessions(id) on delete cascade;

-- =============================================================================
-- RLS for dm_sessions
-- =============================================================================

alter table public.dm_sessions enable row level security;

create policy "Users can view their own DM sessions"
  on public.dm_sessions for select
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Users can create DM sessions they are part of"
  on public.dm_sessions for insert
  to authenticated
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Participants can update their DM sessions"
  on public.dm_sessions for update
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- =============================================================================
-- Update groups RLS: add policy for updating is_active
-- (Creators can already update via existing policy)
-- =============================================================================

-- Allow any member to end a group session (set is_active = false)
-- This extends the existing "Creators can update" policy to let members leave/end too
-- Actually, we'll handle this in the app — only creators can end sessions.
-- The existing "Creators can update their groups" policy already covers this.

-- =============================================================================
-- NOTES:
-- - Groups: is_active = true means session is live, false means ended
-- - DM sessions: is_active = true means chat is open, false means ended
-- - When a session ends, messages are deleted (app-side) and is_active set to false
-- - Future: add is_persistent boolean for paid persistent groups
-- =============================================================================
