# Clofri — Roadmap

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

- [ ] **Deploy** — Ship frontend to Vercel, test with 2-3 friend groups.
- [x] **Friend categorization** — Users can create custom categories, assign friends to them, and filter the friends list by category. Stored in localStorage for MVP. *(Future: migrate to Supabase tables for cross-device sync.)*
- [x] **Presence on home screen** — Friends page (home) shows active/idle/offline status for each friend via global lobby presence.
- [x] **Unread indicator** — Blue dot on group/DM cards when there are new messages since last visit (client-side, localStorage timestamps).
- [x] **Sound/vibration** — Subtle two-tone notification sound when a message arrives from others. Toggle in sidebar (Volume icon). Works globally via lobby channel for DMs.
- [ ] **Group session notifications** — Broadcast `group_ended` on lobby channel when creator ends a group session, so members are notified and auto-redirected (similar to DM ended flow).
- [ ] **Group ephemeral UX polish** — Non-creators should also be able to leave/end their participation; clarify "End Session" vs "Delete Group" vs "Leave Group" actions.
- [ ] **DM session ended toast/banner** — Show a brief "This conversation was ended" message before redirecting, instead of a silent redirect.

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
- [ ] **Friend categories sync** — Migrate category/assignment data from localStorage to Supabase tables for cross-device sync.
- [ ] **Typing indicator improvements** — Debounce typing events, show "X is typing..." on the Messages list page (not just inside the chat).

---

## Long-term (if product grows)

- [ ] **Mobile app** — React Native or native, reusing the same Supabase/PartyKit backend.
- [ ] **Voice rooms** — "Hang out" audio channels via WebRTC (LiveKit or similar).
- [ ] **E2E encryption** — Optional per-group encryption for privacy-conscious users.
- [ ] **Longer retention options** — Per-group setting for message lifespan (1h, 24h, 7d, forever).
- [ ] **Threads** — Lightweight reply threads within a group chat.
- [ ] **Admin dashboard** — Usage metrics, active groups, connection counts.
- [ ] **Self-hosting guide** — Docker Compose setup for users who want to run their own instance.
