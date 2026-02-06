# Clofri — Close Friends Live Chat

## MVP Spec & Technical Foundation

---

## Overview

A **presence-first, ephemeral chat service for close friends** (web-first, mobile later). Small private groups where you hang out in real time — if you're not connected, you miss the conversation. No infinite scroll, no notification hell, no algorithmic feeds. Just you and your people, live.

Think: a group house where you walk into a room and your friends are there. Not a town square.

---

## Core Philosophy

- **Presence is the product.** Seeing who's online *is* the reason to open the app.
- **Ephemeral by default.** Messages fade. This reduces pressure, encourages casual conversation, and avoids the "permanent record" anxiety of modern chat apps.
- **Small groups, real people.** No public rooms. No strangers. You only see people you've explicitly added as friends.
- **Low friction, high warmth.** Opening the app should feel like glancing at the couch to see who's around.

---

## Goals & MVP Scope

### Primary goals

1. Instant, low-latency chat in private friend groups with accurate presence.
2. Real identity via lightweight auth (OAuth or magic link) — no anonymous guests.
3. Short retention (last 50 messages or 24 hours, whichever is smaller).
4. Friend system: add, accept, remove. Groups are invite-only.
5. "Who's around?" as the primary home screen — not a chat list.

### Explicitly out of scope for MVP

- Mobile apps (web only, responsive)
- Push notifications
- Media/file uploads
- Voice/video
- Message reactions/threads
- End-to-end encryption
- Public rooms or discoverability
- Horizontal scaling / multi-node

---

## Product Requirements (User Stories)

### Identity & Friends

- As a user, I can sign up/log in via Google OAuth or email magic link.
- As a user, I can set a display name and avatar (or use my OAuth profile).
- As a user, I can add a friend by sharing/entering an invite code or link.
- As a user, I can accept or ignore friend requests.
- As a user, I can see my friends list and who is currently online.

### Groups & Presence

- As a user, I can create a group and invite specific friends to it.
- As a user, I can see all my groups on the home screen, with live presence (who's in each group right now).
- As a user, I can tap into a group and immediately see who's there and the last N messages.
- As a user, I see live join/leave/idle/typing indicators.

### Chat

- As a user, I can send text messages; others in the group receive them instantly.
- As a user, I see the last 50 messages (or 24h worth) when I enter a group.
- As a user, I understand that messages disappear — there is a visible indicator that history is limited.

### Group Management

- As a group creator, I can invite friends, remove members, or delete the group.
- As a group member, I can leave a group.
- As a group creator, I can mute a member (lightweight moderation for edge cases).

### Developer / Operator

- As a developer, I can run the full stack locally with a single command.
- As an operator, I can see basic health metrics (connections, uptime, errors).

---

## Why Not Next.js

The original spec defaulted to Next.js. Here's why it's not the best fit for this product:

| Concern | Detail |
|---|---|
| **No SEO benefit** | The entire app is behind authentication. There is no public content to server-render for crawlers. |
| **SSR adds complexity for real-time apps** | The primary UI is a WebSocket-driven live view. SSR renders a stale snapshot that gets immediately replaced by live state — wasted work. |
| **WebSocket deployment friction** | Next.js on Vercel doesn't support WebSockets. Self-hosting removes Vercel's main advantage. You end up needing a custom server anyway, at which point Next.js's abstractions become overhead, not help. |
| **API routes are request/response** | Chat needs persistent connections. Next.js API routes are designed for short-lived HTTP handlers, not long-lived WS sessions. |

**Next.js is great for content-heavy sites, dashboards, and apps where SSR/SEO matters.** For a real-time chat SPA behind auth, a simpler stack is faster to build, easier to deploy, and has fewer moving parts.

---

## Tech Stack

### Frontend: Vite + React + TypeScript

- **Vite** — fast builds, simple config, no SSR overhead.
- **React** — component model, large ecosystem, good WebSocket integration patterns.
- **TypeScript** — type safety across the wire protocol.
- **TailwindCSS** — rapid UI development, consistent design.
- **Socket.IO Client** — handles reconnection, multiplexing, and fallbacks automatically.
- **Zustand** — lightweight state management for presence/chat state (or plain `useReducer` if state is simple enough).

*The frontend builds to static files and can be served from any CDN or the same server as the backend.*

### Backend: Node.js + Express + Socket.IO

- **Express** — REST endpoints for auth, friends, groups CRUD.
- **Socket.IO** — rooms, namespaces, reconnection, and presence primitives are built in. Avoids reimplementing half a framework with raw `ws`.
- **Single process** — one server handles both HTTP and WebSocket traffic. Simple to develop, deploy, and reason about.

*Why Socket.IO over raw WebSocket:* For MVP, Socket.IO gives you automatic reconnection with state recovery, built-in room management, binary support, and a clean event API. With raw `ws`, you'd spend weeks rebuilding these features. The protocol overhead is negligible at this scale.

### Database: Postgres + Prisma

- **Postgres** — users, friendships, groups, members, invites.
- **Prisma** — type-safe ORM, easy migrations, good DX with TypeScript.

### Auth: Lucia + Arctic (or Auth.js)

- **Lucia** — lightweight, session-based auth library for Node.js. No magic, full control.
- **Arctic** — OAuth helper (Google, Discord, GitHub providers).
- **Alternative:** Auth.js (formerly NextAuth) works outside Next.js too, but Lucia is simpler for a custom Express server.

### In-Memory State

- **Room state** (presence, ring buffer) lives in the Node.js process memory.
- No Redis needed for MVP. Single server, single process.
- Redis becomes relevant only when scaling to multiple server nodes (post-MVP).

### Deployment

- **Single VPS** (Railway, Fly.io, Render, or a $5 DigitalOcean droplet).
- **Docker** — single container runs the Express + Socket.IO server and serves the built React frontend.
- **Postgres** — managed instance (Railway, Neon, Supabase DB, or RDS).

---

## Honorable Mention: Elixir/Phoenix

Phoenix with Phoenix.Presence is arguably the **technically optimal** choice for this exact product. Presence tracking is a first-class framework feature, Channels handle real-time pub/sub natively, and a single BEAM node can sustain millions of concurrent WebSocket connections.

If you or your team know Elixir, strongly consider it. The reason this spec recommends Node.js is pragmatism: larger hiring pool, more familiar ecosystem, and faster ramp-up for most teams. But Phoenix would require significantly less custom code for the core presence + chat features.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser (React SPA)            │
│  Socket.IO Client ←→ REST calls (fetch/axios)   │
└──────────┬──────────────────┬────────────────────┘
           │ WSS              │ HTTPS
           ▼                  ▼
┌─────────────────────────────────────────────────┐
│              Node.js Server (single process)     │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐  │
│  │  Express API │    │  Socket.IO Server       │  │
│  │              │    │                         │  │
│  │  • Auth      │    │  • Connection mgmt      │  │
│  │  • Friends   │    │  • Room join/leave       │  │
│  │  • Groups    │    │  • Message broadcast     │  │
│  │  • Invites   │    │  • Presence tracking     │  │
│  │              │    │  • Heartbeat / idle       │  │
│  └──────┬───────┘    └──────────┬──────────────┘  │
│         │                       │                 │
│         │    ┌──────────────┐   │                 │
│         └───►│  Room Engine  │◄──┘                 │
│              │  (in-memory)  │                     │
│              │  • members    │                     │
│              │  • ring buffer│                     │
│              │  • idle state │                     │
│              └──────────────┘                     │
└──────────────────┬────────────────────────────────┘
                   │
                   ▼
          ┌────────────────┐
          │   PostgreSQL    │
          │                │
          │  • users       │
          │  • friendships │
          │  • groups      │
          │  • members     │
          │  • invites     │
          │  • audit_logs  │
          └────────────────┘
```

**Key simplification from original spec:** No Redis, no load balancer, no separate gateway, no pub/sub layer. One process, one database. Add complexity only when load demands it.

---

## Data Model (Postgres via Prisma)

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  displayName String
  avatarUrl   String?
  createdAt   DateTime @default(now())

  sessions        Session[]
  sentRequests    Friendship[] @relation("requester")
  receivedRequests Friendship[] @relation("addressee")
  groupMembers    GroupMember[]
  invites         Invite[]
  auditLogs       AuditLog[]   @relation("actor")
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
}

model Friendship {
  id          String           @id @default(uuid())
  requesterId String
  addresseeId String
  status      FriendshipStatus @default(PENDING)
  createdAt   DateTime         @default(now())

  requester User @relation("requester", fields: [requesterId], references: [id])
  addressee User @relation("addressee", fields: [addresseeId], references: [id])

  @@unique([requesterId, addresseeId])
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  BLOCKED
}

model Group {
  id        String   @id @default(uuid())
  name      String
  creatorId String
  createdAt DateTime @default(now())

  members  GroupMember[]
  invites  Invite[]
}

model GroupMember {
  id       String          @id @default(uuid())
  groupId  String
  userId   String
  role     GroupRole        @default(MEMBER)
  joinedAt DateTime         @default(now())
  muted    Boolean          @default(false)

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

enum GroupRole {
  CREATOR
  MEMBER
}

model Invite {
  id        String   @id @default(uuid())
  groupId   String
  inviterId String
  code      String   @unique @default(uuid())
  expiresAt DateTime
  maxUses   Int      @default(1)
  uses      Int      @default(0)
  createdAt DateTime @default(now())

  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  inviter User  @relation(fields: [inviterId], references: [id])
}

model AuditLog {
  id       String   @id @default(uuid())
  action   String   // "kick", "mute", "invite_created", etc.
  actorId  String
  groupId  String?
  meta     Json?
  ts       DateTime @default(now())

  actor User @relation("actor", fields: [actorId], references: [id])
}
```

---

## In-Memory State (Room Engine)

Each group that has at least one connected user gets an in-memory room:

```typescript
interface Room {
  groupId: string;
  members: Map<string, MemberState>;  // odisplayName
  messages: Message[];                 // ring buffer, max 50
}

interface MemberState {
  userId: string;
  displayName: string;
  socketId: string;
  status: "active" | "idle";
  lastActivity: number;               // timestamp
  typing: boolean;
}

interface Message {
  id: string;                          // server-assigned
  userId: string;
  displayName: string;
  text: string;
  ts: number;                          // server timestamp
}
```

- Room is created in memory when first user connects; garbage collected when last user leaves.
- Ring buffer keeps last 50 messages. When a new message arrives and buffer is full, oldest is dropped.
- No persistence of messages. When the server restarts, chat history is gone. This is a feature, not a bug.

---

## Socket.IO Events (Wire Protocol)

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `authenticate` | `{ sessionToken: string }` | Authenticate the socket connection |
| `join_group` | `{ groupId: string }` | Join a group's live room |
| `leave_group` | `{ groupId: string }` | Leave a group's live room |
| `send_message` | `{ groupId: string, text: string, idempotencyKey: string }` | Send a message |
| `typing_start` | `{ groupId: string }` | User started typing |
| `typing_stop` | `{ groupId: string }` | User stopped typing |
| `heartbeat` | `{}` | Keep-alive ping (every 15s) |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `authenticated` | `{ user: User }` | Auth success, returns user profile |
| `auth_error` | `{ message: string }` | Auth failure |
| `group_state` | `{ groupId, members: MemberState[], messages: Message[] }` | Full state on join |
| `message` | `{ groupId, id, userId, displayName, text, ts }` | New message |
| `user_joined` | `{ groupId, userId, displayName }` | Member came online in group |
| `user_left` | `{ groupId, userId }` | Member went offline from group |
| `user_idle` | `{ groupId, userId }` | Member went idle |
| `user_active` | `{ groupId, userId }` | Member returned from idle |
| `user_typing` | `{ groupId, userId, displayName }` | Member is typing |
| `user_stopped_typing` | `{ groupId, userId }` | Member stopped typing |
| `member_kicked` | `{ groupId, userId }` | A member was removed |
| `error` | `{ code: number, message: string }` | Error response |

### Design notes

- Socket.IO handles reconnection automatically. On reconnect, client re-emits `authenticate` then `join_group` for each active group.
- Server assigns canonical `id` and `ts` to all messages.
- `idempotencyKey` on `send_message` prevents duplicate messages on reconnect/retry.
- Typing indicators auto-expire after 3 seconds of no `typing_start` events (server-side timer).

---

## Presence & Heartbeats

| Behavior | Timing |
|---|---|
| Client sends `heartbeat` | Every 15 seconds |
| Server marks user **idle** | 60 seconds with no message or heartbeat |
| Server **disconnects** session | 120 seconds with no heartbeat |
| Typing indicator auto-expires | 3 seconds after last `typing_start` |

- On status change, server broadcasts only the diff (`user_idle`, `user_active`, `user_joined`, `user_left`).
- Home screen shows aggregate presence: "Alex, Jordan online" per group — this is computed client-side from Socket.IO events.

---

## REST API Endpoints (Express)

All endpoints require session cookie authentication.

### Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/google` | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback |
| `POST` | `/auth/magic-link` | Send magic link email |
| `GET` | `/auth/verify/:token` | Verify magic link |
| `POST` | `/auth/logout` | Destroy session |
| `GET` | `/auth/me` | Get current user |

### Friends

| Method | Path | Description |
|---|---|---|
| `GET` | `/friends` | List accepted friends (with online status) |
| `POST` | `/friends/request` | Send friend request `{ userId }` |
| `GET` | `/friends/requests` | List pending requests |
| `POST` | `/friends/accept/:friendshipId` | Accept request |
| `POST` | `/friends/reject/:friendshipId` | Reject request |
| `DELETE` | `/friends/:friendshipId` | Remove friend |

### Groups

| Method | Path | Description |
|---|---|---|
| `GET` | `/groups` | List my groups |
| `POST` | `/groups` | Create group `{ name }` |
| `DELETE` | `/groups/:id` | Delete group (creator only) |
| `POST` | `/groups/:id/invite` | Generate invite link |
| `POST` | `/groups/join/:code` | Join via invite code |
| `DELETE` | `/groups/:id/members/:userId` | Kick member (creator only) |
| `PATCH` | `/groups/:id/members/:userId` | Mute/unmute member |
| `POST` | `/groups/:id/leave` | Leave group |

---

## Security

| Measure | Detail |
|---|---|
| **TLS** | All traffic over HTTPS / WSS |
| **Session auth** | HTTP-only secure cookies, not JWT in localStorage |
| **Input validation** | Validate and sanitize all message payloads server-side (max length, no HTML) |
| **CORS** | Restricted to your domain |
| **Rate limiting** | Per-session: max 30 messages/minute. Per-IP: max 100 requests/minute for REST. Express middleware (`express-rate-limit`) + Socket.IO middleware. |
| **XSS prevention** | React escapes by default; never use `dangerouslySetInnerHTML` on messages |
| **Group access** | Socket.IO middleware verifies group membership before allowing `join_group` |
| **Invite codes** | Short-lived (24h default), limited uses, revocable |

---

## Failure Model

This is an ephemeral chat app. Failure modes are simple:

| Failure | Impact | Recovery |
|---|---|---|
| **Server crash** | All chat history and presence lost | Users reconnect automatically (Socket.IO). Rooms rebuild as users rejoin. Acceptable — this is ephemeral by design. |
| **Postgres down** | Can't log in, can't modify friends/groups | Already-connected users can keep chatting. New connections fail gracefully with error page. |
| **Network blip** | Temporary disconnection | Socket.IO auto-reconnects and re-authenticates. Missed messages during blip are gone (ephemeral). |

---

## Observability (Lightweight for MVP)

- **Health endpoint:** `GET /health` returns `{ status: "ok", connections: N, uptime: seconds }`.
- **Structured logs:** JSON to stdout — `{ level, event, userId, groupId, ts }`. Use `pino` (fast, structured).
- **Metrics (optional):** Track in-process counters, expose at `GET /metrics` if needed later.
  - `active_connections`
  - `messages_per_minute`
  - `rooms_active`

No Prometheus/Grafana for MVP. Logs + health endpoint + your hosting provider's dashboard is sufficient.

---

## Project Structure

```
clofri/
├── client/                    # Vite + React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Home.tsx       # Presence dashboard (who's online)
│   │   │   ├── Group.tsx      # Chat room view
│   │   │   ├── FriendList.tsx
│   │   │   ├── InviteFlow.tsx
│   │   │   └── Layout.tsx
│   │   ├── hooks/             # useSocket, usePresence, useAuth
│   │   ├── stores/            # Zustand stores (presence, chat, auth)
│   │   ├── lib/               # Socket.IO client, API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── index.ts           # Entry point: Express + Socket.IO setup
│   │   ├── routes/            # Express route handlers
│   │   │   ├── auth.ts
│   │   │   ├── friends.ts
│   │   │   └── groups.ts
│   │   ├── socket/            # Socket.IO event handlers
│   │   │   ├── handler.ts     # Main connection handler
│   │   │   ├── middleware.ts  # Auth middleware for sockets
│   │   │   └── events.ts     # Event type definitions
│   │   ├── engine/            # Room engine (in-memory state)
│   │   │   ├── room.ts
│   │   │   ├── presence.ts
│   │   │   └── ringbuffer.ts
│   │   ├── auth/              # Lucia + OAuth setup
│   │   ├── db/                # Prisma client
│   │   └── lib/               # Shared utilities
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tsconfig.json
│   └── package.json
│
├── Dockerfile
├── docker-compose.yml         # Local dev: app + postgres
├── .env.example
└── README.md
```

---

## MVP Implementation Plan

### Phase 1 — Foundation
- [ ] Project scaffold (Vite + React client, Express + Socket.IO server, Prisma)
- [ ] Docker Compose for local dev (app + Postgres)
- [ ] Prisma schema + initial migration
- [ ] Auth flow (Google OAuth via Lucia/Arctic, session cookies)

### Phase 2 — Social Graph
- [ ] Friend request / accept / reject / remove (REST API + UI)
- [ ] Invite code generation and join flow
- [ ] Group CRUD (create, list, delete, leave)

### Phase 3 — Real-Time Core
- [ ] Socket.IO connection + session auth middleware
- [ ] Room engine: join/leave, in-memory member tracking
- [ ] Ring buffer (50 messages) + message broadcast
- [ ] Presence: heartbeat, idle detection, status broadcasts
- [ ] Typing indicators

### Phase 4 — Frontend
- [ ] Home screen: list groups with live presence ("Alex, Jordan online")
- [ ] Group chat view: messages, member list, typing indicator
- [ ] Friend list with online status
- [ ] Invite flow UI (generate link, join via link)
- [ ] Responsive layout (usable on mobile browsers)

### Phase 5 — Polish & Ship
- [ ] Rate limiting (Express + Socket.IO middleware)
- [ ] Input validation and sanitization
- [ ] Health endpoint + structured logging (pino)
- [ ] Dockerfile + production build
- [ ] README with setup instructions
- [ ] Deploy to Railway / Fly.io

---

## Post-MVP Considerations

Things to think about after MVP ships and gets real usage:

- **Redis adapter** — add `@socket.io/redis-adapter` when you need multiple server nodes
- **Push notifications** — "Your group is active" nudges (opt-in, respectful)
- **Mobile app** — React Native or native, reusing the same Socket.IO protocol
- **Media messages** — image/link previews, file sharing
- **Message reactions** — lightweight emoji reactions
- **Voice rooms** — "hang out" audio channels (WebRTC via LiveKit or similar)
- **E2E encryption** — for the privacy-conscious
- **Longer retention options** — per-group setting for message lifespan
