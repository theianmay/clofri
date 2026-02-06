# Clofri — Technology Alternatives Evaluation

Systematic comparison of alternatives for each major component, evaluated against the product's core requirements: **presence-first, ephemeral, close-friends chat**.

---

## 1. Real-Time Layer (the most consequential choice)

This is the backbone of the product. Every other choice flows from this one.

### Option A: Socket.IO on Express (current spec)

**How it works:** You run a Node.js process with Socket.IO. It manages WebSocket connections, rooms, presence, and message broadcast in your own code. You own the server.

| Pros | Cons |
|---|---|
| Full control over room logic, presence, ring buffer | You build and maintain the server |
| Built-in rooms, reconnection, multiplexing | You handle deployment, scaling, uptime |
| Huge ecosystem, battle-tested | Socket.IO adds protocol overhead vs raw WS |
| No vendor lock-in | Scaling to multiple nodes requires Redis adapter |
| Free (just server cost) | More code to write for MVP |

**Best for:** Teams that want full control, plan to self-host, and are comfortable running infrastructure.

---

### Option B: Supabase Realtime (Broadcast + Presence)

**How it works:** Supabase provides a managed Realtime service built on Elixir/Phoenix. You subscribe to "channels" from the client. Broadcast sends ephemeral messages between clients. Presence tracks who's online. No custom server needed for the real-time layer.

```javascript
// Client-side only — no server code for real-time
const channel = supabase.channel('group-abc', {
  config: { presence: { key: userId } }
})

channel
  .on('broadcast', { event: 'message' }, ({ payload }) => {
    // Received a chat message
  })
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState() // who's online
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ displayName: 'Ian', status: 'active' })
    }
  })

// Send a message (ephemeral — not persisted unless you explicitly insert to DB)
channel.send({
  type: 'broadcast',
  event: 'message',
  payload: { text: 'hey', userId, displayName: 'Ian' }
})
```

| Pros | Cons |
|---|---|
| **Broadcast is ephemeral by default** — aligns perfectly with product philosophy | Less control over server-side logic (rate limiting, ring buffer, idle detection must be done differently) |
| **Presence is built-in** — tracks who's in a channel, syncs state automatically | Connection limits: Free = 200 concurrent, Pro ($25/mo) = 500, then $10/1000 peak connections |
| No backend to build for real-time | No server-side ring buffer — you'd need a DB table + RPC or client-side buffer |
| Managed infrastructure, zero ops | Vendor lock-in to Supabase |
| Pairs with Supabase Auth + Postgres for a near-zero-backend MVP | Authorization on channels requires RLS policies (workable but different mental model) |
| Global edge infrastructure | Typing indicators and idle detection need client-side timers (no server-side hooks) |

**Key limitation for Clofri:** There is no server-side "room engine" — you can't run custom logic when a message is broadcast. Rate limiting, message validation, idle detection, and ring buffers must be implemented either client-side or via Edge Functions (adding latency and complexity). For a friends-only app this is acceptable since trust is higher, but it does mean a malicious client could spam the channel unless you add server-side Edge Function middleware.

**Best for:** Rapid MVP where you want to ship in days, not weeks. Ideal if your friend groups are small (< 500 concurrent users total).

---

### Option C: PartyKit (Cloudflare)

**How it works:** Each "party" (room) is a stateful server running on Cloudflare's edge via Durable Objects. You write TypeScript server code that runs per-room. Each room has its own in-memory state, WebSocket connections, and lifecycle. Rooms spin up on-demand and shut down when empty.

```typescript
// Server — runs on Cloudflare edge, one instance per room
import type * as Party from "partykit/server";

export default class ChatRoom implements Party.Server {
  messages: Message[] = []; // ring buffer, persisted in Durable Object storage
  
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    // Send last 50 messages to new joiner
    conn.send(JSON.stringify({ type: 'history', messages: this.messages.slice(-50) }));
    // Broadcast presence
    this.room.broadcast(JSON.stringify({ 
      type: 'user_joined', userId: conn.id 
    }));
  }

  onMessage(message: string, sender: Party.Connection) {
    const parsed = JSON.parse(message);
    // Server-side validation, rate limiting, etc.
    const msg = { id: crypto.randomUUID(), text: parsed.text, ts: Date.now(), userId: sender.id };
    this.messages.push(msg);
    if (this.messages.length > 50) this.messages.shift(); // ring buffer
    this.room.broadcast(JSON.stringify({ type: 'message', ...msg }));
  }

  onClose(conn: Party.Connection) {
    this.room.broadcast(JSON.stringify({ type: 'user_left', userId: conn.id }));
  }
}
```

```typescript
// Client — standard WebSocket or PartySocket
import PartySocket from "partysocket";

const ws = new PartySocket({
  host: "my-project.my-user.partykit.dev",
  room: "group-abc",
});
```

| Pros | Cons |
|---|---|
| **Perfect mental model** — each group = a party with its own state, connections, logic | Tied to Cloudflare ecosystem |
| **Server-side room logic** — ring buffer, rate limiting, validation all run on the server | Durable Object storage has size limits (128 MB per object) — fine for chat |
| **Edge-deployed** — ~50ms from 95% of internet users | Newer platform, smaller community than Socket.IO |
| **On-demand** — rooms spin up/down automatically, zero idle cost | Pricing: free tier is generous, then pay-as-you-go Cloudflare Workers pricing |
| **Stateful** — Durable Object storage persists room state across restarts | Need a separate solution for persistent data (users, friends) — Supabase, PlanetScale, or Turso |
| Built-in WebSocket support, no extra library needed | No built-in auth — need to validate tokens in `onConnect` |
| Auto-reconnect via PartySocket client | Less mature tooling than Express ecosystem |

**Why this is interesting for Clofri:** PartyKit's architecture is *exactly* the "room engine" described in the spec — stateful, per-room, in-memory, with server-side control. But instead of building and hosting it yourself, Cloudflare runs it globally. The ring buffer, presence tracking, idle detection, and rate limiting all run in your TypeScript server code, per-room.

**Best for:** The product as designed. If you want server-side room logic without managing servers.

---

### Option D: Ably / Pusher (managed pub/sub)

| Pros | Cons |
|---|---|
| Managed infrastructure, presence built-in | **Expensive** — Ably: $30/mo for 10M messages, Pusher: $49/mo for 100 concurrent |
| SDKs for every platform | No server-side room logic (same limitation as Supabase) |
| Reliable, battle-tested | Vendor lock-in, pricing scales poorly |
| Good for mobile later | Overkill for close-friends scale |

**Verdict:** Not recommended. You pay a premium for global scale you don't need, and lose the server-side control that makes Clofri's room engine work well.

---

### Option E: Liveblocks

Designed for collaborative apps (Figma-style), not chat. Has presence and room concepts, but the API is oriented around shared document state, not message streams. **Not a good fit.**

---

### Option F: Convex (reactive backend)

**How it works:** Convex is a reactive backend-as-a-service. You define functions that read/write data, and clients subscribe to queries that automatically update in real-time.

| Pros | Cons |
|---|---|
| Real-time queries by default — data changes push to clients automatically | Messages would be persisted in Convex DB (fights ephemeral philosophy) |
| Built-in auth integration | Less control over WebSocket behavior |
| Serverless, managed | Vendor lock-in |
| Good TypeScript DX | Presence requires workaround (scheduled functions + heartbeats) |

**Verdict:** Interesting for apps where data persistence + real-time sync is the core need. Less natural for ephemeral chat where presence is primary and messages intentionally disappear.

---

### Real-Time Layer Recommendation

| Priority | Recommendation | Why |
|---|---|---|
| **Best fit for product** | **PartyKit** | Perfect room model, server-side logic, edge-deployed, zero server management. The architecture matches the spec 1:1. |
| **Fastest to MVP** | **Supabase Realtime** | Near-zero backend code. Trade server-side control for speed. Good enough for trusted friend groups. |
| **Most control** | **Socket.IO** | Full ownership. More code, more ops, but no vendor lock-in. |

---

## 2. Database

### Prisma (current spec) vs Drizzle

| Aspect | Prisma | Drizzle |
|---|---|---|
| **Approach** | Schema-first DSL, code generation | Schema-as-TypeScript-code, SQL-like API |
| **Performance** | Slower — Rust query engine adds overhead, extra process | Faster — thin SQL wrapper, no engine layer |
| **Bundle size** | Large (~10MB engine binary) | Tiny (~50KB) |
| **Migrations** | Excellent built-in tooling (`prisma migrate`) | Good but migration kit was historically less mature (improved significantly in 2025) |
| **DX** | Great autocomplete, `prisma studio` GUI | SQL-like API is closer to what actually executes |
| **Serverless** | Cold start penalty from engine binary | No cold start issue |
| **Community trend** | Established, large | Growing fast, preferred for new projects in 2025+ |

**Recommendation: Drizzle** if using PartyKit (edge/serverless environment where bundle size matters) or if you prefer SQL-like syntax. **Prisma** if you value migration tooling and GUI tools. Both are fine — this is a lower-stakes decision than the real-time layer.

### Postgres providers

| Provider | Pros | Cons | Cost |
|---|---|---|---|
| **Supabase** | Free tier, managed, built-in auth/realtime | Coupled to Supabase ecosystem | Free → $25/mo |
| **Neon** | Serverless Postgres, branching, generous free tier | Newer | Free → $19/mo |
| **Railway** | Simple, good DX, co-locate with app | Less features than dedicated DB providers | ~$5/mo |
| **PlanetScale** | (MySQL only — not recommended for this stack) | — | — |
| **Turso** (libSQL) | Edge-native, extremely fast reads, embedded replicas | SQLite-based (less feature-rich than Postgres) | Free → $29/mo |

**Recommendation:** If using Supabase for auth/realtime, use **Supabase Postgres** (free tier, everything in one place). If using PartyKit, **Neon** or **Turso** are natural fits (both are edge-friendly). If self-hosting with Socket.IO, **Railway** or **Neon**.

---

## 3. Authentication

### Lucia (current spec) — DEPRECATED

**Lucia v3 was deprecated in March 2025.** The author recommends implementing session management yourself using the patterns Lucia documented, or using an alternative library. **Do not use Lucia for a new project.**

### Alternatives

| Solution | Type | Pros | Cons | Cost |
|---|---|---|---|---|
| **Better Auth** | Library (self-hosted) | Spiritual successor to Lucia. Express integration. OAuth, email/password, sessions, MFA. Active development. | Newer, smaller community. ESM-only. | Free |
| **Supabase Auth** | Managed service | Built-in if using Supabase. OAuth, magic link, phone auth. Row-level security integration. | Tied to Supabase. Some reported edge cases with user deduplication. | Free with Supabase |
| **Auth.js (NextAuth v5)** | Library | Large community, many providers. Now works outside Next.js (Express, SvelteKit). | Historically Next.js-focused. Can be complex for custom flows. | Free |
| **Clerk** | Managed service | Beautiful pre-built UI. User management dashboard. MFA, organizations. | $25/mo after 10K MAU. Less control. External dependency. | Free → $25/mo |
| **Auth0** | Managed service | Enterprise-grade. Extensive docs. | Expensive. Complex setup. Overkill for this. | Free → $240/yr |
| **Custom sessions** | DIY | Full control. No dependencies. | You own all security responsibilities. | Free |

### Auth Recommendation

| If your real-time layer is... | Use this for auth |
|---|---|
| **Supabase Realtime** | **Supabase Auth** — everything in one ecosystem, zero integration friction |
| **PartyKit** | **Better Auth** — lightweight, self-hosted, works with Express/Hono for the REST API layer. Validate tokens in PartyKit's `onConnect`. |
| **Socket.IO** | **Better Auth** — native Express integration, session-based auth, OAuth providers built-in |

---

## 4. Frontend Framework (revisited)

The original spec recommends Vite + React. Is there something better?

| Framework | Pros | Cons | Fit for Clofri |
|---|---|---|---|
| **Vite + React** | Large ecosystem, familiar, good tooling | Larger bundle, more boilerplate than alternatives | ✅ Good default |
| **Vite + Svelte** | Smaller bundles, reactive by nature (great for real-time UI), less boilerplate | Smaller ecosystem, fewer component libraries | ✅ Excellent fit — Svelte's reactivity model is natural for presence/chat state |
| **Vite + Solid** | Fastest runtime performance, fine-grained reactivity | Smallest ecosystem of the three | ⚠️ Good technically, but ecosystem is thin |
| **Next.js** | SSR, API routes | SSR unnecessary, WS deployment friction | ❌ Not recommended (see spec) |

**Recommendation:** **React** if you/your team know React. **Svelte** if you're open to it — its reactive model (`$:` derived state, stores) maps beautifully to real-time presence state with less code. Both work well with all three real-time options.

---

## 5. REST API Layer (for non-realtime endpoints)

If using PartyKit or Supabase for real-time, you still need REST endpoints for friends, groups, invites, and auth.

| Option | Pros | Cons |
|---|---|---|
| **Express** | Most familiar, largest middleware ecosystem | Older API design, callback-heavy |
| **Hono** | Ultrafast, works on edge (Cloudflare Workers, Node, Deno, Bun). Small. Modern API. | Smaller ecosystem than Express |
| **Fastify** | Fast, schema validation built-in, good plugin system | Slightly less ecosystem than Express |
| **Supabase Edge Functions** | Serverless, co-located with Supabase | Deno-based, limited runtime |
| **tRPC** | End-to-end type safety between client and server | Adds complexity, less useful if your API is simple |

**Recommendation:**
- With **PartyKit** → **Hono** (both run on Cloudflare Workers; Hono can handle REST routes in the same deployment or separately)
- With **Supabase** → **Supabase Edge Functions** or a lightweight **Express/Hono** server
- With **Socket.IO** → **Express** (Socket.IO attaches to the same HTTP server)

---

## 6. Deployment

| Real-Time Choice | Recommended Deploy | Why |
|---|---|---|
| **PartyKit** | **Cloudflare** (PartyKit CLI) + Cloudflare Pages (frontend) | Everything on one platform, edge-deployed |
| **Supabase Realtime** | **Vercel/Netlify** (frontend) + Supabase (managed backend) | No server to deploy — it's all managed |
| **Socket.IO** | **Railway** or **Fly.io** (server) + any CDN (frontend) | Need a persistent process for WS connections |

---

## Recommended Stack Combinations

### Stack A: "Zero Backend" (fastest MVP, least control)

```
Frontend:  Vite + React + TailwindCSS
Auth:      Supabase Auth
Database:  Supabase Postgres
Realtime:  Supabase Realtime (Broadcast + Presence)
REST API:  Supabase Edge Functions (for invite logic, friend management)
Deploy:    Vercel (frontend) + Supabase (everything else)
```

**Tradeoffs:**
- ✅ Ship in days. Near-zero backend code.
- ✅ Free tier covers early usage easily.
- ❌ No server-side message validation or rate limiting without Edge Functions.
- ❌ No server-side ring buffer (client manages history or use DB + cleanup).
- ❌ Vendor lock-in to Supabase.
- ❌ Idle detection and typing indicators are client-side only.

**Time to MVP: ~1-2 weeks**

---

### Stack B: "Edge-Native Room Engine" (best architecture fit)

```
Frontend:  Vite + React (or Svelte) + TailwindCSS
Auth:      Better Auth (on Hono)
Database:  Neon Postgres (or Turso) + Drizzle ORM
Realtime:  PartyKit (Cloudflare)
REST API:  Hono (Cloudflare Workers or separate Node server)
Deploy:    Cloudflare Pages (frontend) + PartyKit (rooms) + Cloudflare Workers (API)
```

**Tradeoffs:**
- ✅ Architecture matches the product perfectly — each group is a stateful Party.
- ✅ Server-side ring buffer, rate limiting, presence logic.
- ✅ Edge-deployed globally, low latency.
- ✅ On-demand rooms (zero cost when idle).
- ⚠️ More moving pieces than Stack A (but each piece is simple).
- ⚠️ Cloudflare ecosystem dependency.
- ❌ More code to write than Stack A.

**Time to MVP: ~3-4 weeks**

---

### Stack C: "Full Control" (current spec, revised)

```
Frontend:  Vite + React + TailwindCSS
Auth:      Better Auth (on Express)
Database:  Postgres (Railway/Neon) + Drizzle ORM
Realtime:  Socket.IO (on Express)
REST API:  Express (same process)
Deploy:    Railway or Fly.io (single container) + CDN (frontend)
```

**Tradeoffs:**
- ✅ Full control over everything. No vendor lock-in.
- ✅ Single process — simplest deployment topology.
- ✅ Socket.IO is battle-tested and well-documented.
- ⚠️ You manage the server (updates, uptime, scaling).
- ❌ Most code to write.
- ❌ Not edge-deployed (single region unless you add complexity).

**Time to MVP: ~3-4 weeks**

---

## Summary: What Changed from the Spec

| Component | Spec Said | Evaluation Says | Why |
|---|---|---|---|
| **Real-time** | Socket.IO | **PartyKit** (or Supabase for speed) | PartyKit's per-room stateful model is exactly the room engine in the spec, without building infrastructure |
| **Auth** | Lucia | **Better Auth** (or Supabase Auth) | Lucia deprecated March 2025 |
| **ORM** | Prisma | **Drizzle** | Lighter, faster, better for edge/serverless, trending for new projects |
| **REST API** | Express | **Hono** (if using PartyKit/Cloudflare) or Express (if Socket.IO) | Hono is edge-native, pairs naturally with Cloudflare stack |
| **Database** | Postgres (self-managed) | **Neon** or **Supabase Postgres** | Managed serverless Postgres, free tiers, no ops |
| **Frontend** | React (unchanged) | **React** (or Svelte if open to it) | Svelte's reactivity is a natural fit for presence state |
| **Deploy** | Docker + K8s | **Cloudflare** (Stack B) or **Railway** (Stack C) | K8s is massive overkill; managed platforms handle this scale trivially |

---

## My Recommendation

**Stack B (PartyKit + Hono + Better Auth + Neon/Drizzle)** is the best fit for this product if you're willing to invest ~3-4 weeks. The architecture matches the product requirements perfectly and you get server-side control without managing servers.

**Stack A (Supabase everything)** if you want to validate the product idea as fast as possible and can accept the tradeoffs. You can always migrate the real-time layer to PartyKit later if you outgrow Supabase's model.

Avoid Stack C unless you specifically want to self-host and own all infrastructure. It's the most work for the least architectural advantage at this scale.
