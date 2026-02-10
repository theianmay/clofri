# clofri — Roadmap

---

## Immediate (polish current MVP)

- [x] **Message cleanup cron** — SQL ready in `supabase/enable_cleanup_cron.sql`. Run in Supabase SQL Editor after enabling pg_cron extension.
- [x] **Responsive mobile layout** — Sidebar collapses to hamburger menu on mobile, with overlay and auto-close on navigation.
- [x] **Error boundaries** — `ErrorBoundary` component wraps the app and each route individually.
- [x] **Reconnection UX** — `ConnectionBanner` shows red/amber/green banners for disconnected/reconnecting/reconnected states.
- [x] **Separate DMs from groups** — DMs use a dedicated `direct_messages` table + `dm_sessions` table, completely separate from group infrastructure. Own store (`dmStore`), hook (`useDMChat`), and component (`DMChat`). Route: `/dm/:sessionId`.
- [x] **Ephemeral sessions** — Conversations have a clear start and end. Groups have `is_active` flag; DMs use `dm_sessions` with lifecycle. Ending a session deletes messages and closes the conversation for all participants. Migration: `supabase/add_ephemeral_sessions.sql`.
- [x] **Global DM notifications** — Lobby channel broadcasts `new_dm` and `dm_ended` events so users get sound + unread indicators on any page, and auto-redirect when a session is ended by the other user.

---

## Short-term (validate with real users)

- [x] **Deploy** — Shipped frontend to Vercel, live and testing with real users.
- [x] **Friend categorization** — Collapsible category sections on Friends page. Friends grouped by category with inline online/offline status, sorted by presence. Stored in localStorage for MVP. *(Future: migrate to Supabase tables for cross-device sync.)*
- [x] **Presence on home screen** — Friends page (home) shows active/idle/offline status for each friend via global lobby presence.
- [x] **Unread indicator** — Blue dot on group/DM cards when there are new messages since last visit (client-side, localStorage timestamps).
- [x] **Sound/vibration** — Subtle two-tone notification sound when a message arrives from others. Toggle in sidebar (Volume icon). Works globally via lobby channel for DMs.
- [x] **Group session notifications** — Broadcast `group_ended` on lobby channel when creator ends a group session, so members are notified and auto-redirected (similar to DM ended flow).
- [x] **Group ephemeral UX polish** — Consolidated End Session + Delete Group into single "End Session" for creators. Members see "Leave Group".
- [x] **DM session ended toast/banner** — Shows "Conversation ended" screen for 2s before redirecting to /messages.
- [x] **Real-time friend request notifications** — `friend_request` lobby broadcast so recipients see new requests without refresh.
- [x] **Search friends by name** — Search input on Friends page (shown when >3 friends), filters across all categories.
- [x] **Dynamic page titles** — Browser tab shows "clofri · Friends", "clofri · Messages", etc.
- [x] **Global group message notifications** — `new_group_msg` lobby broadcast so members get sound + unread indicator when not in the group chat.
- [x] **UI Audit Round 1** — Mobile touch accessibility (hover-only → always visible on mobile), 404 catch-all route, mobile GroupChat sidebar with invite code + actions, maxLength on chat inputs, Groups nav unread badge, ephemeral notice text fix, tag menu close on outside click, sound toggle in mobile sidebar, meta description.
- [x] **UI Audit Round 2** — Mobile members overlay (fixed panel instead of flex push), leave group confirmation, console.log cleanup, maxLength on all form inputs (group name, friend code, join code), consolidated duplicate imports, removed unused vite.svg, theme-color meta tag.
- [x] **Chat Best Practices** — Smart auto-scroll (only when near bottom + "New messages" pill), message grouping (consecutive messages within 2min collapse), auto-focus chat input on mount, clickable URLs via `linkifyText` utility, consistent XCircle icon for end session.
- [x] **UI / Layout redesign** — Nostalgic AIM/MSN theme: Tahoma font, translucent chat bubbles, IM window chrome, buddy list polish, login screen.
- [x] **Accessibility pass** — ARIA labels on presence dots, `prefers-reduced-motion` support, friend card layout fix.
- [x] **Data management audit** — Full lifecycle audit of all tables. See `docs/DATA_MANAGEMENT.md`.
- [x] **Server-side cleanup (5 cron jobs)** — `cleanup-old-messages` (group msgs 24h), `cleanup-stale-dm-sessions` (idle DMs 1h), `cleanup-old-dms` (DM msgs 24h), `purge-inactive-sessions` (dead rows 7d), `cleanup-orphaned-group-members` (daily). SQL files in `supabase/`.
- [x] **DM delete RLS fix** — Either participant can now delete DMs in their sessions. Applied `supabase/fix_dm_delete_rls.sql`.
- [x] **localStorage pruning** — `pruneLastRead` and `pruneLastVisited` run after each fetch, removing stale entries.
- [x] **Bug fix: Friends empty state** — `fetchFriends` no longer wipes the friends list on transient Supabase query errors.
- [x] **Bug fix: Typing indicator** — Changed from one-shot gate to 2s throttle so the indicator persists during continuous typing.
- [x] **Ephemeral notice copy** — Both DM and Group chat now consistently say "only the last 50 are shown and all messages are deleted after 24 hours".

---

## Medium-term (if product validates)

- [ ] **Persistent groups (paid feature)** — Add `is_persistent boolean default false` to groups/dm_sessions. Persistent groups survive session end (messages kept, group stays active). Premium/paid tier feature.
- [ ] **Migrate to Stack B (PartyKit)** — Move real-time layer to PartyKit for server-side room logic, rate limiting, and idle detection. Keep Supabase for auth + persistent data. See `docs/ALTERNATIVES.md` for full evaluation.
- [ ] **Push notifications** — Opt-in "your group is active" nudges via web push or service worker.
- [ ] **Custom avatar uploads** — Allow users to upload their own avatar images via Supabase Storage (currently using predefined icon avatars).
- [ ] **Media messages** — Image uploads via Supabase Storage, inline image rendering in chat.
- [ ] **Message reactions** — Lightweight emoji reactions on messages.
- [ ] **Group avatars / customization** — Custom colors or icons per group.
- [ ] **Google OAuth setup** — Configure Google Cloud Console OAuth client, add credentials to Supabase Auth providers. Currently only magic link email works.
- [ ] **Discord / GitHub OAuth** — Additional login providers beyond Google + email.
- [ ] **Link previews** — Detect URLs in messages and render basic Open Graph previews.
- [ ] **Rate limiting** — Server-side message rate limiting (via Supabase Edge Functions or PartyKit).
- [ ] **localStorage → Supabase migration** — Migrate status message, auto-reply, friend categories, category assignments, DM last-read, and group last-visited from localStorage to Supabase for cross-device sync. Keep sidebar state and sound toggle in localStorage (per-device). See `docs/DATA_MANAGEMENT.md` §4.
- [ ] **Typing indicator on Messages list** — Show "X is typing..." on the Messages page session cards (not just inside the chat).

---

## Long-term (if product grows)

- [ ] **Mobile app** — React Native or native, reusing the same Supabase/PartyKit backend.
- [ ] **Voice rooms** — "Hang out" audio channels via WebRTC (LiveKit or similar).
- [ ] **E2E encryption** — Optional per-group encryption for privacy-conscious users.
- [ ] **Longer retention options** — Per-group setting for message lifespan (1h, 24h, 7d, forever).
- [ ] **Threads** — Lightweight reply threads within a group chat.
- [ ] **Admin dashboard** — Usage metrics, active groups, connection counts.
- [ ] **Self-hosting guide** — Docker Compose setup for users who want to run their own instance.
