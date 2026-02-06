# Clofri — Implementation Notes

What was actually built for the MVP, and how it maps to the spec.

---

## Stack Decision

We chose **Stack A ("Zero Backend")** from the alternatives evaluation (`docs/ALTERNATIVES.md`) to validate the product idea as fast as possible.

| Component | Spec (Stack B/C) | Implemented (Stack A) |
|---|---|---|
| **Frontend** | Vite + React + TailwindCSS | Vite + React + TailwindCSS ✅ same |
| **Real-time** | PartyKit or Socket.IO | Supabase Realtime (Broadcast + Presence) |
| **Database** | Neon/Postgres + Drizzle | Supabase Postgres + direct SDK calls |
| **Auth** | Better Auth + OAuth | Supabase Auth (Google OAuth + magic link) |
| **API layer** | Hono or Express | None — Supabase JS SDK with RLS policies |
| **Deployment** | Cloudflare or Railway | Vercel (frontend) + Supabase (backend) |

---

## Architecture

```
Browser (Vite + React SPA)
  └── Supabase JS SDK
      ├── Auth (session management)
      ├── Postgres (CRUD via Row Level Security)
      └── Realtime
          ├── Broadcast (ephemeral chat messages)
          └── Presence (online/idle tracking per group)
              ↕ WSS
          Supabase (managed)
```

No custom backend server. All data access goes through the Supabase client SDK. RLS policies enforce authorization at the database level.

---

## What's Built

### Auth (`src/stores/authStore.ts`, `src/components/Login.tsx`)
- Supabase Auth with Google OAuth and email magic link
- Auto-creates a `profiles` row on first login (display name from OAuth metadata or email prefix)
- Each user gets a unique 6-character `friend_code` for adding friends
- Session persists across refreshes via Supabase's built-in session management

### Friends (`src/stores/friendStore.ts`, `src/components/Friends.tsx`)
- Add friends by entering their friend code
- Accept/reject incoming requests
- Remove existing friends
- States: pending → accepted (or blocked)

### Groups (`src/stores/groupStore.ts`, `src/components/Home.tsx`)
- Create a group → generates a 6-character invite code
- Join a group by entering an invite code
- Leave or delete (creator only) a group
- Kick members (creator only)
- Home screen lists all groups with member counts

### Real-Time Chat (`src/hooks/useChat.ts`, `src/components/GroupChat.tsx`)
- **Broadcast** sends messages to all connected clients in a group channel
- **Presence** tracks who's online in each group in real-time
- **Typing indicators** via broadcast events with 3-second client-side auto-expire
- Messages are optimistically rendered, then broadcast + persisted to DB
- Last 50 messages loaded from DB on group entry
- Bubble-style chat UI with timestamps, avatars, and sender names

### Database (`supabase/schema.sql`)
- 5 tables: `profiles`, `friendships`, `groups`, `group_members`, `messages`
- Full Row Level Security policies on all tables
- Indexes on frequently queried columns
- Messages table supports 24h cleanup via pg_cron (commented out, enable manually)

### UI
- Dark theme (zinc/indigo) with TailwindCSS
- Sidebar navigation (Groups, Friends)
- Friend code display + copy in sidebar
- Responsive member sidebar in group chat
- Loading states, empty states, error handling

---

## Database Schema (Summary)

See `supabase/schema.sql` for full DDL + RLS policies.

| Table | Purpose | Key Fields |
|---|---|---|
| `profiles` | User identity | `id` (FK → auth.users), `display_name`, `friend_code` |
| `friendships` | Social graph | `requester_id`, `addressee_id`, `status` |
| `groups` | Chat groups | `name`, `creator_id`, `invite_code` |
| `group_members` | Membership | `group_id`, `user_id`, `role`, `muted` |
| `messages` | Ephemeral chat | `group_id`, `user_id`, `text`, `created_at` |

---

## Realtime Events

### Broadcast (ephemeral messages via `supabase.channel`)

| Event | Payload |
|---|---|
| `message` | `{ id, user_id, display_name, avatar_url, text, created_at }` |
| `typing` | `{ user_id, display_name }` |

### Presence (automatic via Supabase Presence API)

Each user tracks: `{ user_id, display_name, avatar_url, status: 'active' | 'idle' }`

Presence events (`sync`, `join`, `leave`) are handled automatically by the Supabase client.

---

## Project Structure

```
src/
├── components/
│   ├── Login.tsx         # Auth page (Google OAuth + magic link)
│   ├── Layout.tsx        # App shell with sidebar navigation
│   ├── Home.tsx          # Groups list with create/join
│   ├── GroupChat.tsx      # Real-time chat room with member sidebar
│   └── Friends.tsx       # Friend management (add/accept/remove)
├── hooks/
│   └── useChat.ts        # Realtime chat hook (Broadcast + Presence)
├── stores/
│   ├── authStore.ts      # Auth state (Zustand)
│   ├── groupStore.ts     # Groups CRUD (Zustand)
│   └── friendStore.ts    # Friends CRUD (Zustand)
├── lib/
│   └── supabase.ts       # Supabase client initialization
├── types/
│   └── database.ts       # TypeScript types for DB schema
├── App.tsx               # Root with routing + auth guard
├── main.tsx              # Entry point
└── index.css             # TailwindCSS import
supabase/
└── schema.sql            # Full database schema + RLS policies
```

---

## Known Limitations (Stack A tradeoffs)

- **No server-side validation** — message validation relies on DB constraints (max 2000 chars) and RLS. A malicious client could bypass client-side checks.
- **No server-side rate limiting** — would need Supabase Edge Functions to enforce.
- **Idle detection is client-side** — no server heartbeat timeout. If a client crashes without disconnecting, presence may be stale until Supabase's internal timeout clears it.
- **Typing indicators are client-side only** — no server-side 3s expiry timer. Relies on each client clearing stale indicators.
- **Connection limits** — Supabase free tier allows 200 concurrent realtime connections, Pro ($25/mo) allows 500.

These are acceptable tradeoffs for validating the product. If Clofri gains traction, migrate to Stack B (PartyKit) for server-side control. See `docs/ALTERNATIVES.md` for the migration path.
