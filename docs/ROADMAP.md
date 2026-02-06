# Clofri — Roadmap

---

## Immediate (polish current MVP)

- [ ] **Google OAuth setup** — Configure Google Cloud Console OAuth client, add credentials to Supabase Auth providers. Currently only magic link email works.
- [ ] **Message cleanup cron** — Enable `pg_cron` extension in Supabase and schedule hourly deletion of messages older than 24 hours (SQL is in `supabase/schema.sql`, commented out).
- [ ] **Responsive mobile layout** — Sidebar should collapse to a bottom nav or hamburger menu on small screens.
- [ ] **Error boundaries** — Add React error boundaries so a component crash doesn't white-screen the whole app.
- [ ] **Reconnection UX** — Show a banner when the Supabase Realtime connection drops and is reconnecting.

---

## Short-term (validate with real users)

- [ ] **Deploy** — Ship frontend to Vercel, test with 2-3 friend groups.
- [ ] **Presence on home screen** — Show which friends are currently online in each group on the home screen (aggregate from Realtime Presence).
- [ ] **Profile editing** — Let users change their display name and avatar after signup.
- [ ] **Link previews** — Detect URLs in messages and render basic Open Graph previews.
- [ ] **Unread indicator** — Lightweight dot on group cards when a group has new messages since you last visited (client-side only, no push).
- [ ] **Sound/vibration** — Optional subtle notification sound when a message arrives in the active group.

---

## Medium-term (if product validates)

- [ ] **Migrate to Stack B (PartyKit)** — Move real-time layer to PartyKit for server-side room logic, rate limiting, and idle detection. Keep Supabase for auth + persistent data. See `docs/ALTERNATIVES.md` for full evaluation.
- [ ] **Push notifications** — Opt-in "your group is active" nudges via web push or service worker.
- [ ] **Media messages** — Image uploads via Supabase Storage, inline image rendering in chat.
- [ ] **Message reactions** — Lightweight emoji reactions on messages.
- [ ] **Group avatars / customization** — Custom colors or icons per group.
- [ ] **Discord / GitHub OAuth** — Additional login providers beyond Google + email.
- [ ] **Rate limiting** — Server-side message rate limiting (via Supabase Edge Functions or PartyKit).

---

## Long-term (if product grows)

- [ ] **Mobile app** — React Native or native, reusing the same Supabase/PartyKit backend.
- [ ] **Voice rooms** — "Hang out" audio channels via WebRTC (LiveKit or similar).
- [ ] **E2E encryption** — Optional per-group encryption for privacy-conscious users.
- [ ] **Longer retention options** — Per-group setting for message lifespan (1h, 24h, 7d, forever).
- [ ] **Threads** — Lightweight reply threads within a group chat.
- [ ] **Admin dashboard** — Usage metrics, active groups, connection counts.
- [ ] **Self-hosting guide** — Docker Compose setup for users who want to run their own instance.
