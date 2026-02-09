# clofri — Design System

> Dark shell, retro soul.
> A modern presence-first chat app that triggers the feeling of signing on to AIM or MSN Messenger — without cosplaying a 2003 UI.

---

## 1. Design Philosophy

**Core principle: Presence over content.**

clofri should feel like a *place you enter*, not a feed you scroll. The UI exists to answer one question: **who's here right now?**

### Nostalgic, not retro

The nostalgia lives in *patterns and cues*, not in pixel-perfect recreation:

- **IM window chrome** (title bar, close button, distinct zones) — not rounded-everything SaaS
- **Buddy list as home base** — not a notification inbox
- **Sounds that trigger memory** — not Slack chaos
- **Presence dots that never hide** — not "last seen 3h ago"
- **Ephemeral by default** — conversations vanish, like closing an IM window

### What we avoid

- Skeuomorphic retro skins (no XP Luna borders, no pixel fonts)
- Light theme cosplay (AIM was light, but the nostalgia is in the patterns, not the background color)
- Feature bloat disguised as nostalgia
- Springy, bouncy motion (keep it snappy)

---

## 2. Color System

### Dark shell palette

clofri uses a dark zinc foundation. The darkness makes presence colors pop — green dots on dark feel more alive than on white.

```
Token                  Value       Usage
──────────────────────────────────────────────────────
--color-shell          zinc-950    App background
--color-surface        zinc-900    Sidebar, cards, panels
--color-surface-raised zinc-800    Inputs, menus, elevated surfaces
--color-border         zinc-800    Default borders
--color-border-focus   zinc-700    Subtle borders, hover states
--color-text           white       Primary text
--color-text-secondary zinc-300    Secondary text
--color-text-muted     zinc-400    Descriptions, labels
--color-text-subtle    zinc-500    Timestamps, hints
--color-text-faint     zinc-600    Disabled, placeholders
```

### Accent colors

```
Token                  Value       Usage
──────────────────────────────────────────────────────
--color-accent         blue-600    Primary actions, own chat messages, links
--color-accent-hover   blue-500    Hover state for primary actions
--color-danger         red-600     Destructive actions
--color-danger-hover   red-500     Hover state for destructive actions
--color-success        green-400   Confirmations, save indicators
```

### Presence colors (non-negotiable)

These are the most important colors in the app. They must be instantly recognizable and *never* hidden behind hover states.

```
Token                  Value       Usage
──────────────────────────────────────────────────────
--color-online         green-500   Active / online
--color-idle           amber-400   Idle / away
--color-offline        zinc-600    Offline
```

Rules:
- Presence dots are **always visible** — never hidden, never on-hover-only
- Same colors everywhere: sidebar, chat headers, friend cards, session list
- Dot size: 12-14px (`w-3 h-3` / `w-3.5 h-3.5`), with a 2px border matching the surface behind them
- No "busy/DND" status for now (see Future Ideas)

### Tailwind v4 theme config

clofri uses Tailwind v4 with CSS-first configuration. Custom tokens go in `index.css`:

```css
@import "tailwindcss";

@theme {
  --color-shell: var(--color-zinc-950);
  --color-surface: var(--color-zinc-900);
  --color-surface-raised: var(--color-zinc-800);
  --color-online: var(--color-green-500);
  --color-idle: var(--color-amber-400);
  --color-offline: var(--color-zinc-600);
}
```

> **Note:** We currently use Tailwind's built-in zinc/blue/green/amber classes directly. Custom theme tokens are optional — adopt them only when the indirection adds clarity, not just for the sake of having tokens.

---

## 3. Typography

### Font stack

The actual IM-era fonts were **Tahoma** (MSN Messenger) and **Arial** (AIM). Tahoma is still web-safe and carries genuine nostalgic weight — slightly condensed, very readable at small sizes, unmistakably early-2000s Microsoft.

**Primary font:**
```css
font-family: Tahoma, 'Segoe UI', system-ui, -apple-system, sans-serif;
```

- **Tahoma** — the literal MSN Messenger font. Triggers instant recognition for anyone who used MSN. Web-safe, ships with every Windows install. On macOS it falls through to the system font, which is fine.
- **Segoe UI** — Microsoft's modern successor to Tahoma. Similar proportions.
- **system-ui** — graceful fallback on all platforms.

**Monospace accent (timestamps, system messages, friend codes):**
```css
font-family: 'Consolas', 'Courier New', monospace;
```

Used sparingly — for friend codes, timestamps, and system messages like nudge notifications. Gives an IRC-adjacent feel to technical/system content.

### Type scale

```
Element                    Size        Weight     Notes
──────────────────────────────────────────────────────────────
App title ("clofri")       text-lg     semibold   Sidebar header
Page titles (Friends, etc) text-xl     semibold   Main content header
Section headers            text-sm     semibold   Category names, section labels
Chat display name          text-sm     medium     Above or inline with messages
Chat message text          text-sm     normal     14px — readable, not oversized
Timestamps                 text-[10px] normal     Tiny, muted — should not compete
Status text                text-xs     normal     "Active now", "Idle", italic status msgs
System messages            text-xs     normal     Nudge, auto-reply — italic, centered
```

---

## 4. Layout

### Global structure

```
┌─── Sidebar (w-64 / w-14 collapsed) ───┐┌────── Main Content ──────────────┐
│ [cf] clofri                    [« ]    ││                                   │
│─────────────────────────────────────── ││ ┌─ Window Chrome ──────────────┐  │
│ 🧑 Friends                             ││ │ ← [🐱] alice  · 🟢 Active   ⊗│  │
│ ✉  Messages              (●)          ││ ├──────────────────────────────┤  │
│ 💬 Groups                 (●)          ││ │                              │  │
│                                        ││ │   Messages area              │  │
│                                        ││ │                              │  │
│─────────────────────────────────────── ││ ├──────────────────────────────┤  │
│ [🐱] CoolUser123         ✏            ││ │ [Type a message...] [👋] [➤] │  │
│ 🟢 Active                              ││ └──────────────────────────────┘  │
│ "brb getting coffee" ✏                 ││                                   │
│ ↩ Auto-reply on                        │└───────────────────────────────────┘
│ #A1B2C3D4  · 🔊 · Share · Sign out    │
└────────────────────────────────────────┘
```

### Layout rules

1. **Sidebar is the presence anchor** — always visible on desktop (`md:flex`), slide-out on mobile
2. **Main content fills remaining space** — `flex-1`, height-constrained (`h-dvh` mobile, `h-screen` desktop)
3. **Chat pages feel like windows** — distinct header/body/footer zones with border separators
4. **No page-level scrolling** — only the messages area scrolls. Header and input are always fixed in view.

### Mobile layout

- Hamburger button → slide-out sidebar (full-height, `w-64`, `z-50`)
- Backdrop overlay on sidebar open (`bg-black/50`)
- `h-dvh` on main content — handles mobile browser chrome (address bar)
- 12px spacer (`h-12`) for hamburger button clearance

---

## 5. Components

### 5.1 Sidebar

**Role:** Presence hub + identity card + navigation

**Zones (top to bottom):**
1. **Header** — logo + app name + collapse toggle
2. **Navigation** — Friends, Messages, Groups (with unread badges)
3. **User section** — avatar, display name, status message, auto-reply toggle, friend code, sound toggle, sign out

**Design cues:**
- `bg-zinc-900` surface, `border-r border-zinc-800` separator
- Collapsible on desktop (`w-64` ↔ `w-14`)
- Nav items: `rounded-lg`, active = `bg-zinc-800 text-white`, inactive = `text-zinc-400`
- Unread badges: small `bg-blue-500` dots on nav icons

### 5.2 Chat window

This is where the IM window illusion lives. Each chat (DM or Group) should feel like opening a separate IM conversation.

**Anatomy:**
```
┌─ Title bar ──────────────────────────────────┐
│ [←] [avatar+dot] Name · Status        [End⊗] │
│      "status message in italics"              │
├───────────────────────────────────────────────┤
│                                               │
│  Message area (scrollable)                    │
│                                               │
│  ian  9:41 PM                                 │
│  hey, you here?                               │
│                                               │
│  alice  9:42 PM                               │
│  yeah, just hopped on                         │
│                                               │
│          ~ alice nudged you ~                  │
│                                               │
├───────────────────────────────────────────────┤
│  Messages are ephemeral — they disappear...   │
├───────────────────────────────────────────────┤
│ [Type a message...              ] [👋] [Send] │
└───────────────────────────────────────────────┘
```

**Title bar:**
- `border-b border-zinc-800` separator — this is the "window chrome"
- Back arrow, avatar with presence dot, name, status text
- End/close button on the right (danger hover color)
- Friend's status message below status text (italic, `text-[10px]`, truncated)

**Message area:**
- `flex-1 overflow-y-auto` — only this area scrolls
- Messages grouped by sender (collapse avatar if same sender within 2 min)
- Nudge system messages centered, italic, `text-zinc-500 text-xs`
- Auto-reply messages styled the same as nudge messages

**Message style — the nostalgia decision:**

Currently: modern chat bubbles (`rounded-2xl`, own = blue, other = zinc-800).

The nostalgic AIM/MSN style was **no bubbles** — just sender name + timestamp, then text on the next line, with color-coding per user. The choice:

| Style | Feel | Recommendation |
|---|---|---|
| **Current bubbles** | Modern, Discord/iMessage | Keep for now — familiar UX |
| **Flat messages** (name + text, no bubble) | AIM/IRC retro | More nostalgic, but unfamiliar to younger users |
| **Subtle bubbles** (very low contrast, thin border instead of fill) | Hybrid | Best of both — still clearly grouped, but less "modern chat app" |

**Recommendation:** Move to **subtle bubbles** — replace the solid blue/zinc fills with bordered or very-low-contrast fills. Own messages get a faint blue-tinted background (`bg-blue-600/10 border border-blue-500/20`), others get `bg-zinc-800/50 border border-zinc-700/50`. This reads as messages without screaming "iMessage clone."

**Input area:**
- `border-t border-zinc-800` — anchored at bottom, never scrolls away
- Input field: `bg-zinc-800 rounded-xl border border-zinc-700 focus:border-blue-500`
- Nudge button: outline style, `border border-zinc-700`, `hover:border-amber-400/50`
- Send button: `bg-blue-600`, `rounded-xl`
- When friend is offline: replace input with offline banner (`WifiOff` icon + message)

### 5.3 Buddy list (Friends page)

The Friends page IS the buddy list — this is the AIM homescreen.

**Friend card anatomy:**
```
┌──────────────────────────────────────────────┐
│ [🐱] alice_wonder                  💬  🏷  🗑 │
│      🟢 Active                                │
│      "studying for finals, msg me"            │
└──────────────────────────────────────────────┘
```

**Design cues:**
- Cards: `bg-zinc-900 border border-zinc-800 rounded-xl`
- Offline friends: reduced opacity (`opacity-50` on avatar, `text-zinc-400` on name)
- Status message: italic, `text-zinc-500 text-xs`, truncated to 1 line
- Action buttons (message, tag, remove): hidden on desktop (`md:opacity-0 md:group-hover:opacity-100`), always visible on mobile
- Organized by categories with collapsible sections
- Search bar at top for filtering

**Presence sorting:** Online > Idle > Offline within each category. This matches AIM's behavior of bubbling online buddies to the top.

### 5.4 Login screen

The first impression. Should feel like signing on.

**Current:** Centered card with email input + magic link button. `bg-zinc-950` shell, `bg-zinc-900` card, blue accent.

**Nostalgic enhancements (future):**
- Consider a brief "signing on..." animation after clicking the magic link (loading dots, progress feel)
- The tagline "chat with your close friends" is good — keep it
- The ephemeral notice "Messages are ephemeral. If you're not here, you miss it." is excellent copy

### 5.5 Avatars

Lucide icon avatars in colored circles — this is clofri's version of MSN display pictures.

- 25 options (animals, objects, symbols)
- Each has a distinct background color
- 3 sizes: sm (32px), md (36px), lg (48px)
- Fallback: first letter of display name in zinc circle
- Presence dot overlaid at bottom-right corner

### 5.6 Dialogs & modals

- Backdrop: `bg-black/60`
- Card: `bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl`
- Entry animation: scale from 0.95 + fade in, 150ms ease-out
- Danger variant: red icon + red confirm button
- Always escape-dismissable, backdrop-clickable

---

## 6. Motion & Interaction

### Animation principles

Keep it **snappy and functional**. No delight-for-delight's-sake.

```
Animation              Duration    Easing      Usage
──────────────────────────────────────────────────────
Dialog appear          150ms       ease-out    Modal/confirm open
Fade in                150ms       ease-out    Content loading
Sidebar slide          200ms       ease-in-out Mobile sidebar open/close
Expand/collapse        200ms       ease-out    Category sections
Nudge shake            600ms       ease-in-out MSN-style screen vibration
Color transitions      150ms       default     Hover/focus state changes
```

### Rules

- **No spring/bounce physics** — snappy transitions only
- **Reduced motion:** respect `prefers-reduced-motion` (disable nudge shake, use instant transitions)
- **No entrance animations on messages** — they should appear instantly like AIM/MSN (not slide/fade in like iMessage)

---

## 7. Sound Design

Sound is where nostalgia hits hardest. clofri uses Web Audio API (no audio files).

### Current sounds

| Sound | Implementation | Trigger |
|---|---|---|
| **Message pop** | Two-tone sine wave (523Hz→659Hz) | Incoming message |
| **Nudge buzz** | Dual oscillator sawtooth+square (150Hz→80Hz) | Nudge received |

### Sound rules

- All sounds respect the global toggle (`isSoundEnabled()`)
- Sounds are **off by default** — opt-in (respects modern UX norms)
- Volume is subtle (gain 0.08–0.15) — never jarring
- Each sound type is distinct — you should know what happened without looking

### Future sounds (see NOSTALGIA_FEATURES.md §2.3)

- **Sign-on chime** — rising 3-note arpeggio (C5→E5→G5)
- **Sign-off tone** — falling 2-note (E5→C5)

---

## 8. Presence System

Presence is the heart of clofri. Every design decision should reinforce "who's here."

### Status states

| State | Color | Dot | Detection |
|---|---|---|---|
| **Active** | `green-500` | Solid | User interacting (mouse/key/scroll) |
| **Idle** | `amber-400` | Solid | No interaction for 5 minutes |
| **Offline** | `zinc-600` | Solid | Not connected to presence channel |

### Display rules

- Presence dot: always on the avatar (bottom-right), never hidden
- Status text: always below the name ("Active now", "Idle", "Offline")
- Status message: below status text, italic, quoted, truncated
- Idle detection: 5 min timeout, resets on mouse/key/scroll/pointer activity
- Heartbeat: re-track every 60s to keep `last_active` fresh
- Stale threshold: 6 min (idle timeout + 1 min buffer)

### Where presence appears

1. **Sidebar** — own status (dot on avatar)
2. **Friends page** — dot + text + status message on every friend card
3. **Messages page** — dot + text + status message on every session card
4. **Chat header** — dot + text + status message + typing indicator
5. **Group chat member list** — dot next to each member name

---

## 9. Responsive Behavior

### Breakpoints

| Breakpoint | Layout |
|---|---|
| `< md` (mobile) | Slide-out sidebar, hamburger button, `h-dvh` |
| `≥ md` (desktop) | Persistent sidebar (`w-64` / `w-14` collapsed), `h-screen` |

### Mobile-specific

- Sidebar: slide-out from left, full height, `z-50`, with backdrop
- Hamburger: `fixed top-3 left-3 z-40`
- Chat input: touch-friendly targets (min 44px)
- Nudge: triggers `navigator.vibrate()` on supported devices
- Auto-close sidebar on navigation

### Desktop-specific

- Sidebar collapsible to icon-only rail (`w-14`)
- Collapse state persisted to localStorage
- Hover-reveal action buttons on friend cards
- Avatar hover overlay for "change avatar" affordance

---

## 10. Accessibility

Non-negotiable. Retro ≠ inaccessible.

### Requirements

- **Keyboard navigation** everywhere — all interactive elements focusable and operable
- **Escape key** dismisses all modals, menus, and editing states
- **ARIA labels** for presence indicators ("Online", "Idle", "Offline")
- **Focus visible** styles — never suppress focus rings
- **Reduced motion** — respect `prefers-reduced-motion` media query
- **Color not sole indicator** — presence uses dot position + text label, not just color
- **Touch targets** — minimum 44×44px on mobile

### Future considerations

- High contrast mode
- Screen reader announcements for incoming messages
- Skip-to-content links

---

## 11. Inventory of Current UI Patterns

Reference for what exists today (pre-redesign). Use this as a migration checklist.

### Colors in use

```
Shell:           bg-zinc-950
Sidebar:         bg-zinc-900, border-zinc-800
Cards:           bg-zinc-900, border-zinc-800, rounded-xl
Inputs:          bg-zinc-800, border-zinc-700, focus:border-blue-500, rounded-xl
Own messages:    bg-blue-600 text-white rounded-2xl rounded-br-md
Other messages:  bg-zinc-800 text-zinc-200 rounded-2xl rounded-bl-md
Primary button:  bg-blue-600, hover:bg-blue-500, rounded-xl
Danger button:   bg-red-600, hover:bg-red-500
Presence dots:   green-500 (active), amber-400 (idle), zinc-600 (offline)
```

### Components

| Component | File | Notes |
|---|---|---|
| Layout + Sidebar | `Layout.tsx` | Mobile + desktop sidebars, nav, user section |
| Login | `Login.tsx` | Magic link form, centered card |
| Friends / FriendCard | `Friends.tsx` | Buddy list with categories, search, presence |
| Messages | `Messages.tsx` | DM session list with presence + status |
| DMChat | `DMChat.tsx` | DM conversation with nudge, auto-reply, offline protection |
| GroupChat | `GroupChat.tsx` | Group conversation with nudge, member list |
| AvatarIcon | `AvatarIcon.tsx` | Lucide icon avatars, 25 options, 3 sizes |
| ConfirmDialog | `ConfirmDialog.tsx` | Modal confirmation with danger variant |
| ConnectionBanner | `ConnectionBanner.tsx` | Network status indicator |
| AvatarPicker | `AvatarPicker.tsx` | Avatar selection modal |

### Fonts in use

Currently using system defaults (no custom font-family set). The redesign will add Tahoma as the primary font.

---

## 12. Redesign Scope — What Changes

### Phase 1: Typography + Subtle Bubbles (smallest visual impact, biggest nostalgic hit)

1. **Add Tahoma font stack** to `index.css` body
2. **Add monospace font** for friend codes, timestamps, system messages
3. **Soften chat bubbles** — bordered/translucent instead of solid fills
4. **Refine message layout** — consider showing display name above messages (not just avatar-based grouping)

### Phase 2: Window Chrome (chat pages feel like IM windows)

1. **Chat title bar refinement** — stronger visual separation, slightly different surface color
2. **Input area refinement** — more distinct "compose" zone feel
3. **Ephemeral notice** — style as a thin banner, not floating text

### Phase 3: Buddy List Polish (Friends page = AIM homescreen)

1. **Presence-first sorting** — online at top, offline at bottom (within categories)
2. **Category headers** — styled like AIM buddy groups (collapsible, count badge)
3. **Empty states** — warm, inviting copy when no friends/messages yet

### Phase 4: Login & Sign-On Experience

1. **"Signing on..." moment** — brief animation/progress feel after magic link click
2. **Landing copy refinement** — lean into the nostalgia ("sign on", not "log in")

### Not in scope (future)

- Busy/DND status (see NOSTALGIA_FEATURES.md §5)
- Sign-on/off sounds (see NOSTALGIA_FEATURES.md §2.3)
- /me actions (see NOSTALGIA_FEATURES.md §2.5)
- Theme toggle (light/dark)
- Chat window color themes
- Sound packs
- **Pop-out DM windows** (desktop only) — `window.open()` standalone IM windows with `?popout=true` minimal layout, `BroadcastChannel` for cross-window state sync. Deferred because most users discover clofri on mobile first; desktop pop-outs are a power-user enhancement for later.

---

## 13. Vibe Check

When someone signs on to clofri, they should feel:

> "Oh... I forgot how *being online* used to feel."

Not busy. Not overwhelmed. Not doomscrolling.
Just... connected. And if you're not here, you miss it.
