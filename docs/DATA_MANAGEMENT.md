# Data Management Audit

> Last updated: Feb 2025

This document covers the full data lifecycle for every table in clofri's Supabase database, active cleanup mechanisms, known gaps, and recommendations.

---

## 1. Database Tables

### Permanent Tables

| Table | Purpose | Lifecycle |
|-------|---------|-----------|
| `profiles` | User accounts (extends `auth.users`) | Permanent. Cascade-deleted if the auth user is deleted. |
| `friendships` | Friend relationships (`pending`, `accepted`, `blocked`) | Permanent. Deleted explicitly via Remove Friend or Reject Request. |

### Ephemeral Tables

| Table | Purpose | Intended lifespan |
|-------|---------|-------------------|
| `dm_sessions` | 1-on-1 chat sessions | Active while chat is open; marked `is_active = false` on end. |
| `direct_messages` | DM chat messages (FK → `dm_sessions`) | Deleted when session ends; 24h TTL as safety net. |
| `groups` | Group chat sessions | Active while session is live; marked `is_active = false` on end. |
| `group_members` | Group membership | Deleted when group session ends. |
| `messages` | Group chat messages | Deleted when session ends; 24h TTL as safety net. |

---

## 2. Active Cleanup Mechanisms

### Server-side (pg_cron)

Two cron jobs are currently running:

| Job name | Schedule | Action | SQL source |
|----------|----------|--------|------------|
| `cleanup-old-messages` | Every hour (`0 * * * *`) | Deletes rows from `messages` where `created_at < now() - 24 hours` | `supabase/enable_cleanup_cron.sql` |
| `cleanup-stale-dm-sessions` | Every 30 min (`*/30 * * * *`) | Finds active `dm_sessions` idle >1 hour, deletes their `direct_messages`, marks session `is_active = false` | `supabase/cleanup_stale_dm_sessions.sql` |

### Client-side

| Mechanism | Trigger | Action | Location |
|-----------|---------|--------|----------|
| Stale DM session cleanup | App open (first `fetchSessions` call) | For each active session where friend is offline and last activity >30 min ago: deletes messages, marks session inactive | `src/stores/dmStore.ts` lines 99–140 |
| End DM session | User clicks "End Chat" | Deletes messages, marks session inactive, broadcasts `dm_ended` | `src/stores/dmStore.ts` `endSession` |
| End group session | User (creator) clicks end | Deletes messages, marks group inactive, removes members, broadcasts `group_ended` | `src/stores/groupStore.ts` `endGroupSession` |
| Delete group | User (creator) deletes | Hard-deletes group row, members, and messages | `src/stores/groupStore.ts` `deleteGroup` |
| Remove/reject friend | User action | Deletes the `friendships` row | `src/stores/friendStore.ts` |

---

## 3. Known Gaps

### 3a. Inactive rows accumulate

**`dm_sessions`** and **`groups`** rows are marked `is_active = false` when ended but **never purged**. Over time these accumulate as dead rows. The `direct_messages` for ended sessions are deleted (client-side on end + `cleanup-stale-dm-sessions` cron for active-but-idle sessions), but the session metadata rows themselves persist.

**Impact:** Low for now (small row size), but will grow indefinitely.

### 3b. No server-side TTL for `direct_messages`

The `cleanup-stale-dm-sessions` cron handles **active sessions that went idle** — it deletes their messages and ends the session. But there is no standalone TTL cron for `direct_messages` the way `cleanup-old-messages` handles group `messages`.

If a DM session is still marked active (e.g., both users keep the tab open for days), its messages will persist beyond 24 hours. The `cleanup-old-messages` cron only targets the `messages` table (group messages), not `direct_messages`.

**Impact:** Medium. A commented-out cron exists in `supabase/add_direct_messages.sql` but was never activated.

### 3c. Orphaned data on client failure

When a session ends, message deletion happens **client-side** (`endSession` / `endGroupSession`). If the client crashes or the user closes the browser before the delete completes:

- **DM messages:** Caught by `cleanup-stale-dm-sessions` cron (if session goes idle >1h) or by the client-side stale check on next app open.
- **Group messages:** Caught by `cleanup-old-messages` cron (24h TTL).
- **`group_members` rows:** NOT caught by any cleanup if the group is abandoned without being formally ended.

### 3d. DM delete RLS limitation

The `direct_messages` DELETE policy only allows `auth.uid() = sender_id`. The `endSession` function deletes all messages for a session, but this runs under the current user's auth context. If user A sent all the messages and user B ends the session, B's delete call may fail silently for A's messages.

In practice this is mitigated by the `ON DELETE CASCADE` FK from `direct_messages.session_id → dm_sessions.id` — but sessions are marked inactive, not deleted, so the cascade never fires.

### 3e. localStorage grows unbounded

| Key | Issue |
|-----|-------|
| `clofri-dm-last-read` | Accumulates entries for every DM session ever opened; stale entries never pruned. |
| `clofri-last-visited` | Accumulates entries for every group ever visited; stale entries never pruned. |
| `clofri-friend-assignments` | Accumulates entries for removed friends; stale entries never pruned. |

Other localStorage keys (`clofri-sidebar`, `clofri-status-message`, `clofri-auto-reply`, `clofri-friend-categories`, `clofri-sound`) are single values and don't grow.

---

## 4. Recommendations

### High priority

1. **Add `direct_messages` TTL cron** — Activate the commented-out job in `add_direct_messages.sql`:
   ```sql
   select cron.schedule(
     'cleanup-old-dms',
     '0 * * * *',
     $$delete from public.direct_messages where created_at < now() - interval '24 hours'$$
   );
   ```

2. **Fix DM delete RLS** — Allow either participant to delete messages in their sessions:
   ```sql
   create policy "Session participants can delete DMs"
     on public.direct_messages for delete
     to authenticated
     using (
       auth.uid() = sender_id
       or auth.uid() = receiver_id
     );
   ```

### Medium priority

3. **Purge old inactive rows** — Add a cron or extend the existing cleanup function to delete:
   - `dm_sessions` where `is_active = false` and `ended_at < now() - interval '7 days'`
   - `groups` where `is_active = false` and `created_at < now() - interval '7 days'`
   - `group_members` for inactive groups

4. **Prune localStorage on app init** — On `fetchSessions` / `fetchGroups` completion, remove `clofri-dm-last-read` and `clofri-last-visited` entries that don't correspond to current active sessions/groups.

### Low priority

5. **Orphaned `group_members` cleanup** — Add a cron to remove `group_members` rows where the parent group has `is_active = false`.

---

## 5. Current Cron Jobs Reference

To verify active cron jobs in Supabase:

```sql
select * from cron.job;
```

To unschedule a job:

```sql
select cron.unschedule('job-name');
```

To view recent job runs:

```sql
select * from cron.job_run_details order by start_time desc limit 20;
```
