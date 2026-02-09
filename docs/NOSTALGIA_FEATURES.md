# clofri — Nostalgia Features Proposal

> A modern chat service with an ode to the golden era of instant messaging.
> AIM, MSN Messenger, and IRC defined how a generation communicated online. This document proposes features inspired by those services, adapted for clofri's ephemeral, presence-first philosophy.

---

## 1. Current State vs. Legacy Services

### What clofri already shares with legacy IM

| Legacy Pattern | clofri Equivalent | Origin |
|---|---|---|
| Buddy List with presence dots | Friends page with active/idle/offline indicators | AIM |
| Ephemeral switchboard sessions | `dm_sessions` with lifecycle (start/end/delete) | MSN Messenger |
| Channel-based group chat | Groups with invite codes and real-time broadcast | IRC |
| Typing indicators | `typing` broadcast events in DM and Group chat | MSN Messenger |
| Notification sounds | Web Audio API `playMessageSound` — two-tone sine pop | AIM (door sounds) |
| Buddy categories/groups | Friend categories with color tags (localStorage) | AIM (buddy groups) |
| Screen names + codes | Display names + 8-char friend codes | AIM (screen names) |
| Predefined avatars | Lucide icon avatars (`icon:cat`, `icon:dog`, etc.) | MSN (display pictures) |

### What's missing — the nostalgia gap

| Legacy Feature | Service | clofri Status | Nostalgia Value |
|---|---|---|---|
| Away Messages | AIM | No equivalent | **Very High** — culturally iconic |
| Nudge / Buzz | MSN Messenger | No equivalent | **Very High** — universally remembered |
| Sign-on/off sounds | AIM | No distinct sounds for presence changes | **High** — the "door" sound |
| Custom status messages | MSN Messenger (MSNP11+) | Only 3 fixed statuses, no custom text | **High** |
| Warning/rate limiting | AIM | No anti-spam mechanism | Medium |
| Chat window sounds | AIM/MSN | Single generic sound for all events | Medium |
| /me actions (emotes) | IRC | No special message types | Medium |
| Color/font formatting | MSN Messenger | Plain text only | Low-Medium |

---

## 2. Proposed Features

---

### 2.1 Away Messages (inspired by AIM)

#### Historical Context
AIM away messages were a **cultural phenomenon** of the early 2000s. Users would set a custom text message that was automatically shown to anyone who tried to message them while they were away. They became a form of self-expression — song lyrics, inside jokes, passive-aggressive subtweets before subtweets existed. The away message was as much a social signal as a status.

**How AIM did it:**
- User manually sets "Away" status with a freeform text message (no character limit in practice, ~1000 chars)
- Away message displayed in a pop-up when someone tries to message the away user
- Away message visible in the buddy list tooltip on hover
- Could have multiple saved away messages and rotate between them
- "Auto-response" sent once per conversation to anyone who messaged you while away
- Returning from away was a manual action (click "I'm Back")

#### Proposed Implementation for clofri

**Scope:** Users can set a custom status message that is visible to friends. When a user is idle/away, this message is displayed prominently. Optionally, an auto-reply can be sent once per DM session.

##### Data Model

**Option A — Presence-only (no DB, simplest)**
Extend the lobby presence `track()` payload:
```typescript
// presenceStore.ts — extended PresenceUser
export interface PresenceUser {
  user_id: string
  display_name: string
  avatar_url: string | null
  status: UserStatus
  last_active: string
  status_message: string | null    // NEW — custom status text
  auto_reply_enabled: boolean      // NEW — send auto-reply when away
}
```
- **Pros:** Zero DB changes, instant propagation, truly ephemeral (disappears when offline — fits clofri philosophy)
- **Cons:** Lost on page refresh before presence re-syncs, no saved presets

**Option B — Profile column (persistent)**
Add `status_message` column to `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN status_message TEXT DEFAULT NULL;
ALTER TABLE profiles ADD CONSTRAINT status_message_length CHECK (char_length(status_message) <= 150);
```
- **Pros:** Persists across sessions, can have saved presets
- **Cons:** Requires migration, less ephemeral

**Recommendation:** **Option A** for MVP — keep it ephemeral, matching clofri's philosophy. The status message lives only in the presence payload and vanishes when you go offline. This is actually *more* nostalgic than AIM, where away messages were static — here, they're alive only while you are.

##### UI Changes

**1. Sidebar — Set Status Message**
Location: Below the display name in the sidebar profile section (`Layout.tsx`)
```
┌──────────────────────────┐
│ [Avatar] CoolUser123  ✏  │
│ 🟢 Active                │
│ "brb getting coffee" ✏   │  ← NEW: clickable to edit
└──────────────────────────┘
```
- Click to open an inline input (like display name editing)
- Max 150 characters
- Optional toggle: "Auto-reply when away" checkbox
- Clear button to remove status message

**2. Friends Page — Status Message Display**
Location: Below the status text in each `FriendCard` (`Friends.tsx`)
```
┌──────────────────────────────────────┐
│ [🐱] alice_wonder         💬  🗑    │
│     🟡 Idle                          │
│     "studying for finals, msg me"    │  ← NEW: italic, truncated
└──────────────────────────────────────┘
```
- Show only when friend has a status message set
- Italic, muted color (`text-zinc-500 italic text-xs`)
- Truncate to 1 line with ellipsis, full text on hover/title

**3. DM Chat Header — Status Message Display**
Location: Below the status text in `DMChat.tsx` header
```
┌──────────────────────────────────────┐
│ ← [🐱] alice_wonder              ⊗  │
│      🟡 Idle · "studying for finals" │  ← NEW
└──────────────────────────────────────┘
```

**4. Auto-Reply (DM only)**
When a user messages someone who is idle/away with `auto_reply_enabled`:
- The system sends a single auto-reply message in the DM: *"[Auto-reply] studying for finals, msg me"*
- Rendered as a special system message (different styling — centered, muted, no avatar)
- Sent only **once per session** to avoid spam (track via a Set of session IDs that already received the auto-reply)
- Auto-reply is a broadcast-only message, **not persisted** to DB

##### Technical Implementation

**Files to modify:**
| File | Changes |
|---|---|
| `src/stores/presenceStore.ts` | Add `status_message` and `auto_reply_enabled` to `PresenceUser` interface and `track()` payload |
| `src/components/Layout.tsx` | Add status message editor in sidebar profile section |
| `src/components/Friends.tsx` / `FriendCard` | Display status message below status text |
| `src/components/DMChat.tsx` | Display status message in header; handle auto-reply |
| `src/components/Messages.tsx` | Show status message preview in session list |
| `src/hooks/useDMChat.ts` | Add auto-reply broadcast logic on first message to away user |

**Effort estimate:** ~2-3 hours

---

### 2.2 Nudge (inspired by MSN Messenger)

#### Historical Context
MSN Messenger's "Nudge" (also called "Buzz" in Yahoo Messenger) was introduced in MSNP13. It **physically shook the recipient's chat window** with a brief vibration animation and played a loud, distinctive buzzing sound. It was designed to get someone's attention — essentially a polite "hey, pay attention to me" that became one of the most memorable features of early IM.

**How MSN did it:**
- Button in the chat toolbar sends a nudge to the other person
- Recipient's entire chat window shakes for ~1 second with a buzzing sound
- Rate-limited: you could only send a nudge once every ~10 seconds (later extended to 30s on some versions)
- A system message appeared in both chat windows: "You have sent a nudge" / "Alice sent you a nudge"
- Nudges were sent via the SB (Switchboard) channel as a special message type
- Could not be disabled by the recipient in early versions (later made optional)

#### Proposed Implementation for clofri

**Scope:** A "Nudge" button in both DM and Group chat that triggers a screen shake animation and a distinctive buzzing sound for the recipient(s). Rate-limited to prevent spam.

##### Broadcast Event

```typescript
// New broadcast event on the chat channel
channel.send({
  type: 'broadcast',
  event: 'nudge',
  payload: {
    sender_id: profile.id,
    display_name: profile.display_name,
  },
})
```

No DB persistence needed — nudges are ephemeral by nature.

##### UI Changes

**1. Nudge Button**
Location: Next to the send button in the chat input area (`DMChat.tsx`, `GroupChat.tsx`)
```
┌─────────────────────────────────────────────┐
│ [Type a message...              ] [👋] [➤]  │
└─────────────────────────────────────────────┘
                                    ↑ Nudge button
```
- Icon: Lucide `Hand` or `Bell` or custom vibration icon
- Disabled + muted for 10 seconds after sending (cooldown)
- Tooltip: "Send a nudge"
- Visually distinct from send button (outline style, not filled)

**2. Shake Animation**
When a nudge is received, the **entire chat message area** shakes:
```css
@keyframes nudge-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, -2px); }
  20% { transform: translate(4px, 2px); }
  30% { transform: translate(-3px, 1px); }
  40% { transform: translate(3px, -1px); }
  50% { transform: translate(-2px, 2px); }
  60% { transform: translate(2px, -2px); }
  70% { transform: translate(-1px, 1px); }
  80% { transform: translate(1px, -1px); }
  90% { transform: translate(-1px, 0); }
}

.nudge-shake {
  animation: nudge-shake 0.6s ease-in-out;
}
```
- Applied to the chat container div for 600ms
- Decreasing amplitude (starts strong, fades out) — feels physical
- CSS-only, no JS animation library needed

**3. Nudge Sound**
A distinct, different sound from the message notification — lower frequency, buzzy:
```typescript
// sounds.ts — new function
export function playNudgeSound() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') ctx.resume()

  // Buzzy vibration sound — two overlapping oscillators
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()

  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)

  osc1.type = 'sawtooth'
  osc1.frequency.setValueAtTime(150, ctx.currentTime)
  osc1.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4)

  osc2.type = 'square'
  osc2.frequency.setValueAtTime(160, ctx.currentTime)
  osc2.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.4)

  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

  osc1.start(ctx.currentTime)
  osc2.start(ctx.currentTime)
  osc1.stop(ctx.currentTime + 0.5)
  osc2.stop(ctx.currentTime + 0.5)
}
```

**4. System Message in Chat**
A special inline message appears in the chat stream:
```
    ┌──────────────────────────────────┐
    │         ~ alice nudged you ~     │  ← centered, italic, muted
    └──────────────────────────────────┘
```
- Not a real message — injected into local state only, not DB-persisted
- Uses a special `type: 'nudge'` field to distinguish from regular messages
- Rendered as centered italic text in `text-zinc-500`

**5. Rate Limiting**
- Client-side: 10-second cooldown after sending a nudge
- Visual feedback: button shows countdown or remains disabled/grayed
- Server-side (future): could add Supabase Edge Function rate limiter

**6. Vibration API (Mobile)**
On mobile devices, also trigger the device vibration:
```typescript
if ('vibrate' in navigator) {
  navigator.vibrate([100, 50, 100, 50, 100]) // buzz-pause-buzz-pause-buzz
}
```

##### Technical Implementation

**Files to modify:**
| File | Changes |
|---|---|
| `src/lib/sounds.ts` | Add `playNudgeSound()` function |
| `src/index.css` | Add `nudge-shake` keyframes animation |
| `src/hooks/useDMChat.ts` | Add `nudge` broadcast listener and `sendNudge` function |
| `src/hooks/useChat.ts` | Add `nudge` broadcast listener and `sendNudge` function |
| `src/components/DMChat.tsx` | Add nudge button, shake state, system message rendering |
| `src/components/GroupChat.tsx` | Add nudge button, shake state, system message rendering |

**Effort estimate:** ~2-3 hours

---

### 2.3 Sign-On / Sign-Off Sounds (inspired by AIM)

#### Historical Context
AIM's **door open/close sounds** are among the most iconic sounds in internet history. A creaking door opening played when a buddy came online; a door closing when they went offline. Users would listen for these sounds to know when a specific person signed on — it created a Pavlovian excitement response.

#### Proposed Implementation

**Scope:** Distinct sounds for friends coming online and going offline, audible from the Friends page.

##### Sound Design

```typescript
// sounds.ts — new functions

export function playSignOnSound() {
  // Rising two-tone chime — "someone's here!"
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(523, ctx.currentTime)      // C5
  osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1) // E5
  osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2) // G5
  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.35)
}

export function playSignOffSound() {
  // Falling two-tone — "someone left"
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(659, ctx.currentTime)      // E5
  osc.frequency.setValueAtTime(523, ctx.currentTime + 0.15) // C5
  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
}
```

##### Detection Logic

In `presenceStore.ts`, on `presence.sync` events, compare previous online user set with new set:
- New user appeared → friend signed on → play `playSignOnSound()`
- User disappeared → friend signed off → play `playSignOffSound()`
- Only trigger for users in the current user's friend list (requires cross-referencing `friendStore`)

**Effort estimate:** ~1-2 hours

---

### 2.4 Custom Status Messages (inspired by MSN Messenger)

#### Historical Context
MSN Messenger MSNP11+ added **Personal Status Messages (PSMs)** — a line of custom text shown next to your display name in everyone's contact list. Distinct from the away message, this was always visible. People used it for music they were listening to, mood, quotes, etc. The "What's on your mind?" concept that later became Facebook's status update was directly descended from this.

#### Proposed Implementation

This is essentially a subset of the Away Message feature (2.1). If Away Messages are implemented, custom status messages come for free — the `status_message` field in the presence payload serves both purposes:
- When **active**: it's a personal status message (MSN style)
- When **idle/away**: it becomes an away message (AIM style)

No additional implementation needed beyond 2.1.

---

### 2.5 /me Actions (inspired by IRC)

#### Historical Context
IRC's `/me` command produced a third-person action message. Typing `/me dances` would display as `* alice dances` — a way to express actions and emotions that became a staple of internet culture.

#### Proposed Implementation

**Scope:** If a message starts with `/me `, render it as an action message with distinct styling.

##### UI Rendering
```
    ┌──────────────────────────────────────┐
    │        * alice dances around *        │  ← italic, centered
    └──────────────────────────────────────┘
```

##### Detection
Client-side only — check `msg.text.startsWith('/me ')` in the message rendering component. Strip the `/me ` prefix and render as `* {display_name} {rest of message} *`.

**Files to modify:**
- `src/components/DMChat.tsx` — message rendering
- `src/components/GroupChat.tsx` — message rendering

**Effort estimate:** ~30 minutes

---

## 3. Implementation Status

| # | Feature | Nostalgia Impact | Effort | Status |
|---|---------|-----------------|--------|--------|
| 1 | **Nudge** | Very High | ~2-3h | ✅ Shipped |
| 2 | **Away Messages + Custom Status** | Very High | ~2-3h | ✅ Shipped |
| 3 | **Sign-on/off Sounds** | High | ~1-2h | 🔮 Future |
| 4 | **/me Actions** | Medium | ~30m | 🔮 Future |

### What shipped
- **Nudge** — Shake animation, buzzy sound, 10s cooldown, system messages, mobile vibration (DM + Group)
- **Away Messages** — Ephemeral status messages via presence payload, localStorage persistence, auto-reply (opt-in, once per session), display in Friends/DM/Messages
- **Custom Status** — Free with Away Messages (status message visible when active or idle)
- **Offline send protection** — Input disabled when friend is offline, stale session auto-cleanup (client + server cron)

---

## 4. Design Principles

These features should feel like nostalgic callbacks, not exact replicas. Key principles:

1. **Ephemeral first** — Status messages live in presence, not the DB. They vanish when you go offline. This is more clofri than AIM.
2. **Modern UX** — No pop-up windows or modal interruptions. Nudge uses CSS animation, not a literal window shake. Status messages are inline, not tooltip pop-ups.
3. **Respect the user** — Rate limiting on nudge. Auto-reply is opt-in. Sounds respect the global sound toggle.
4. **Subtle, not kitschy** — The nostalgia should be in the *concept*, not in pixel-perfect retro UI. Keep the dark modern aesthetic. The feeling of hearing a sign-on sound triggers the memory without needing a 2002 UI skin.
5. **No feature bloat** — Each feature should be implementable in <3 hours. If it needs a DB migration, it should be optional. If it needs a new service, defer it.

---

## 5. Future Nostalgia Ideas

These ideas are documented for future revisiting. Implementation details for Sign-on/off Sounds and /me Actions are already spec'd in sections 2.3 and 2.5 above.

| Idea | Origin | Effort | Notes |
|---|---|---|---|
| **Sign-on/off Sounds** | AIM | ~1-2h | Rising chime on friend online, falling tone on offline. Needs presence sync diffing + friend list cross-ref. See §2.3 |
| **/me Actions** | IRC | ~30m | `/me dances` → `* alice dances *`. Pure client-side render change in DMChat + GroupChat. See §2.5 |
| **Chat window color themes** | MSN Messenger | Medium | Per-user color preferences for chat bubbles |
| **Saved away message presets** | AIM | Low | Library of reusable status messages (localStorage) |
| **Profile "About Me" page** | AIM Profiles | Medium | HTML-formatted (or markdown) profile page |
| **Idle animation** | MSN Messenger | Low | Subtle avatar animation when idle (e.g., ZZZ overlay) |
| **"Warning" system** | AIM | High | Community moderation tool — warn spammers, throttle their sends |
| **Buddy pounce / alerts** | Trillian/Pidgin | Medium | Get notified when a specific friend comes online |
| **Channel ops / moderation** | IRC | High | Mute, slow mode, channel bans for groups |
| **Day/night greeting** | MSN Plus! | Low | "Good morning, [name]!" based on time of day |
| **Sound packs** | MSN Plus! / Trillian | Medium | Swap notification sounds between themed packs |
| **Chat log export** | IRC/mIRC | Medium | Download conversation before session ends |

---

## 6. Appendix: Legacy Protocol Details

### AIM Away Messages — OSCAR Protocol

In OSCAR, away messages were set via the **SNAC family 0x02 (Location)**:
- `SNAC(0x02, 0x04)` — Set User Info: contained a TLV with the away message text
- `SNAC(0x02, 0x05)` — Request User Info: any user could request another's away message
- `SNAC(0x02, 0x06)` — Response with away message text
- Status flags in `SNAC(0x01, 0x1E)` included `FLAG_AWAY = 0x0020`

The away message was stored server-side as part of the user's Location info, separate from the buddy list presence. It was a pull model — clients requested the away message when attempting to IM someone who was away.

**clofri equivalent:** We use a push model (Supabase Presence broadcasts status_message to all subscribers), which is simpler and more real-time.

### MSN Messenger Nudge — MSNP Protocol

Nudges were transmitted as a special MIME-typed message on the Switchboard:
```
MSG alice@hotmail.com Alice 50\r\n
MIME-Version: 1.0\r\n
Content-Type: text/x-msnmsgr-datacast\r\n
\r\n
ID: 1\r\n
```
- `ID: 1` = Nudge (ID 2 was Wink, ID 3 was Voiceclip)
- Sent over the existing SB (Switchboard) session — no special channel needed
- Rate-limited server-side: one nudge per 10 seconds per conversation

**clofri equivalent:** We use Supabase Broadcast with event type `nudge` on the existing chat channel — same pattern as MSN's Switchboard approach.
