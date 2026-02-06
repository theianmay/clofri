-- Fix infinite recursion in group_members / groups RLS policies
-- Safe to re-run (drops before creating)

-- Drop ALL groups SELECT policies
drop policy if exists "Members can view their groups" on public.groups;
drop policy if exists "Anyone authenticated can read groups by invite code" on public.groups;
drop policy if exists "Authenticated users can read groups" on public.groups;

-- Drop ALL group_members SELECT policies
drop policy if exists "Members can view group members" on public.group_members;
drop policy if exists "Authenticated users can read group members" on public.group_members;

-- Recreate: one simple SELECT policy per table
create policy "Authenticated users can read groups"
  on public.groups for select
  to authenticated
  using (true);

create policy "Authenticated users can read group members"
  on public.group_members for select
  to authenticated
  using (true);
