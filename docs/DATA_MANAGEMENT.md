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

Five cron jobs are currently running:

| Job name | Schedule | Action | SQL source |
|----------|----------|--------|------------|
| `cleanup-old-messages` | Every hour (`0 * * * *`) | Deletes rows from `messages` where `created_at < now() - 24 hours` | `supabase/enable_cleanup_cron.sql` |
| `cleanup-stale-dm-sessions` | Every 30 min (`*/30 * * * *`) | Finds active `dm_sessions` idle >1 hour, deletes their `direct_messages`, marks session `is_active = false` | `supabase/cleanup_stale_dm_sessions.sql` |
| `cleanup-old-dms` | Every hour (`0 * * * *`) | Deletes rows from `direct_messages` where `created_at < now() - 24 hours` | `supabase/cleanup_old_dms.sql` |
| `purge-inactive-sessions` | Daily at 3 AM UTC (`0 3 * * *`) | Purges `dm_sessions` (inactive >7 days), `groups` (inactive >7 days), and their orphaned `group_members` | `supabase/purge_inactive_sessions.sql` |
| `cleanup-orphaned-group-members` | Daily at 4 AM UTC (`0 4 * * *`) | Removes `group_members` rows for inactive groups (catches 0–7 day gap before purge job) | `supabase/cleanup_orphaned_group_members.sql` |

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

### ~~3a. Inactive rows accumulate~~ — RESOLVED

Fixed by `purge-inactive-sessions` cron (daily, purges rows older than 7 days).

### ~~3b. No server-side TTL for `direct_messages`~~ — RESOLVED

Fixed by `cleanup-old-dms` cron (hourly, 24h TTL).

### 3c. Orphaned data on client failure

When a session ends, message deletion happens **client-side** (`endSession` / `endGroupSession`). If the client crashes or the user closes the browser before the delete completes:

- **DM messages:** Caught by `cleanup-stale-dm-sessions` cron (if session goes idle >1h) or by the client-side stale check on next app open.
- **Group messages:** Caught by `cleanup-old-messages` cron (24h TTL).
- **`group_members` rows:** NOT caught by any cleanup if the group is abandoned without being formally ended.

### 3d. DM delete RLS limitation

The `direct_messages` DELETE policy only allows `auth.uid() = sender_id`. The `endSession` function deletes all messages for a session, but this runs under the current user's auth context. If user A sent all the messages and user B ends the session, B's delete call may fail silently for A's messages.

In practice this is mitigated by the `ON DELETE CASCADE` FK from `direct_messages.session_id → dm_sessions.id` — but sessions are marked inactive, not deleted, so the cascade never fires.

### ~~3e-partial. Orphaned `group_members`~~ — RESOLVED

Fixed by `cleanup-orphaned-group-members` cron (daily).

### 3e. localStorage grows unbounded

| Key | Issue |
|-----|-------|
| `clofri-dm-last-read` | Accumulates entries for every DM session ever opened; stale entries never pruned. |
| `clofri-last-visited` | Accumulates entries for every group ever visited; stale entries never pruned. |
| `clofri-friend-assignments` | Accumulates entries for removed friends; stale entries never pruned. |

Other localStorage keys (`clofri-sidebar`, `clofri-status-message`, `clofri-auto-reply`, `clofri-friend-categories`, `clofri-sound`) are single values and don't grow.

---

## 4. Recommendations

### Completed

1. ~~**Add `direct_messages` TTL cron**~~ — Done. `cleanup-old-dms` cron running hourly.
2. ~~**Purge old inactive rows**~~ — Done. `purge-inactive-sessions` cron running daily at 3 AM UTC.
3. ~~**Orphaned `group_members` cleanup**~~ — Done. `cleanup-orphaned-group-members` cron running daily at 4 AM UTC.

4. ~~**Fix DM delete RLS**~~ — Done. Applied `supabase/fix_dm_delete_rls.sql`. Either participant can now delete DMs in their sessions.

5. ~~**Prune localStorage on app init**~~ — Done. `pruneLastRead` in `dmStore.ts` and `pruneLastVisited` in `groupStore.ts` run after each successful fetch, removing entries for sessions/groups that no longer exist.

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
