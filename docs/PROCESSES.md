# clofri — Key Processes & Workflows

Complete inventory of every user-facing workflow, the files involved, data flow, error handling status, and audit findings.

---

## 1. Authentication & Session Bootstrap

### Flow
1. `App.tsx` renders → calls `authStore.initialize()` on mount
2. `initialize()` calls `supabase.auth.getSession()` to restore any existing session
3. If session exists, calls `fetchOrCreateProfile()` to fetch/create the user's profile row
4. Sets `loading: false` — app renders either `<Login />` or `<Layout />` + routes
5. Registers `onAuthStateChange` listener for future login/logout events

### Files
- `src/App.tsx` — top-level loading gate (`loading` → spinner, `!user` → Login, else → routes)
- `src/stores/authStore.ts` — `initialize`, `signInWithMagicLink`, `signInWithGoogle`, `signOut`, `updateProfile`, `fetchOrCreateProfile`
- `src/lib/supabase.ts` — Supabase client singleton, env var validation

### Sub-flows
- **Magic link sign-in**: `Login.tsx` → `signInWithMagicLink(email)` → Supabase OTP → email link → `onAuthStateChange` fires → profile fetched → app loads
- **Google OAuth sign-in**: `signInWithGoogle()` → Supabase OAuth redirect → callback → `onAuthStateChange`
- **Sign out**: `signOut()` → `supabase.auth.signOut()` → state cleared → shows `<Login />`
- **Profile update** (display name, avatar): `updateProfile()` → Supabase `.update()` → local state updated

### Audit Status: PASS
- `initialize()` has try-catch — `loading` always resolves to `false` (fixed in previous session)
- `fetchOrCreateProfile` handles race conditions (duplicate key → retry SELECT)
- `signInWithMagicLink` returns error string to UI
- `signOut` has no try-catch but is fire-and-forget (acceptable — clears local state regardless)
- `updateProfile` silently fails on error (acceptable — non-critical, no loading gate)
- `onAuthStateChange` callback has NO try-catch — see **Issue #1** below

---

## 2. Presence & Online Status

### Flow
1. `Layout.tsx` calls `presenceStore.join(profile)` when profile is available
2. `join()` creates a Supabase Realtime channel named `"lobby"` with presence keyed by user ID
3. Tracks `{ user_id, display_name, avatar_url, status, last_active, status_message, auto_reply }`
4. Activity listeners (`mousemove`, `keydown`, `pointerdown`, `scroll`, `visibilitychange`) manage idle detection
5. Heartbeat interval (60s) keeps `last_active` fresh for active users
6. `resolveStatus()` treats users with stale `last_active` (>6 min) as idle even if tracked as active
7. Lobby channel also receives broadcast events: `new_dm`, `dm_ended`, `friend_request`, `new_group_msg`, `group_ended`
8. `leave()` cleans up listeners, timers, and unsubscribes

### Files
- `src/stores/presenceStore.ts` — all presence logic, lobby channel, broadcast listeners
- `src/components/Layout.tsx` — `join`/`leave` lifecycle tied to `profile.id`

### Sub-flows
- **Status message**: `setStatusMessage()` → updates localStorage + re-tracks presence with new message
- **Auto-reply toggle**: `setAutoReply()` → updates localStorage + re-tracks presence
- **DM notification (lobby)**: `new_dm` event → marks session unread, plays sound, re-fetches sessions
- **DM ended (lobby)**: `dm_ended` event → plays sound, re-fetches sessions
- **Friend request (lobby)**: `friend_request` event → plays sound, re-fetches friends list
- **Group message (lobby)**: `new_group_msg` event → marks group unread, plays sound
- **Group ended (lobby)**: `group_ended` event → plays sound, re-fetches groups

### Audit Status: PASS (minor notes)
- `join()` guards against double-join
- `leave()` properly cleans up all timers and listeners
- Broadcast listeners are non-critical — dynamic imports used for `friendStore`/`groupStore` to avoid circular deps
- No try-catch inside `channel.subscribe` callback, but `trackStatus` is fire-and-forget (acceptable)
- `setStatusMessage`/`setAutoReply` iterate presence state to find own entry — fragile if presence state is momentarily empty, but harmless (just no-ops)

---

## 3. Friends System

### Flow
1. `Friends.tsx` calls `friendStore.fetchFriends()` on mount + on tab visibility change
2. `fetchFriends()` queries `friendships` table → fetches related `profiles` → sorts into `friends`, `pendingReceived`, `pendingSent`
3. UI renders buddy list with categories, search, online status indicators

### Files
- `src/components/Friends.tsx` — full friends UI, search, categories, add friend form
- `src/stores/friendStore.ts` — `fetchFriends`, `sendRequest`, `acceptRequest`, `rejectRequest`, `removeFriend`
- `src/stores/categoryStore.ts` — local-only (localStorage) category management

### Sub-flows
- **Send friend request**: `sendRequest(code)` → validates profile exists → finds target by friend_code → checks for existing friendship → inserts → broadcasts via lobby → re-fetches
- **Accept request**: `acceptRequest(id)` → updates friendship status to `accepted` → re-fetches
- **Reject request**: `rejectRequest(id)` → deletes friendship row → re-fetches
- **Remove friend**: `removeFriend(id)` → deletes friendship row → re-fetches
- **Start DM from friend**: `handleStartDM` → `dmStore.startSession(friendId)` → navigates to `/dm/:sessionId`
- **Categories** (local): `addCategory`, `removeCategory`, `assignFriend` — all localStorage, no Supabase

### Audit Status: PASS
- `fetchFriends()` has try-catch (fixed in previous session)
- `sendRequest` has comprehensive try-catch with user-facing error messages
- `acceptRequest`, `rejectRequest`, `removeFriend` have NO try-catch — see **Issue #2** below

---

## 4. Direct Messages (DM Sessions)

### Flow
1. `Messages.tsx` calls `dmStore.fetchSessions()` on mount + polls every 15s
2. `fetchSessions()` queries active `dm_sessions` → fetches friend profiles → checks unread status → auto-cleans stale sessions on initial fetch
3. User clicks a session → navigates to `/dm/:sessionId` → `DMChat.tsx` mounts
4. `DMChat.tsx` uses `useDMChat` hook which:
   - Fetches message history from `direct_messages` table (last 50)
   - Creates a Supabase Realtime channel `dm-session:{sessionId}`
   - Listens for broadcast `message`, `typing`, `nudge` events
5. Sending a message: optimistic local add → broadcast to DM channel → broadcast `new_dm` on lobby → persist to DB
6. Ending a session: delete messages → mark session inactive → broadcast `dm_ended` on lobby → re-fetch sessions

### Files
- `src/components/Messages.tsx` — DM session list with unread indicators
- `src/components/DMChat.tsx` — chat UI, input, nudge, end chat
- `src/hooks/useDMChat.ts` — realtime channel, message history, send/typing/nudge
- `src/stores/dmStore.ts` — `fetchSessions`, `startSession`, `endSession`, `markRead`

### Sub-flows
- **Stale session cleanup**: On initial fetch, sessions where friend is offline + no activity for 30min are auto-ended
- **Unread detection**: Compares latest message `created_at` vs localStorage `last_read` timestamp
- **Auto-reply**: If friend is idle + has auto-reply enabled + has status message → injects a local-only auto-reply bubble after first sent message
- **Session ended redirect**: If session disappears from store while viewing, shows "Conversation ended" for 2s then redirects
- **Offline friend**: Input is disabled with a "Friend is offline" notice

### Audit Status: PASS
- `fetchSessions()` has try-catch
- `startSession()` has try-catch
- `endSession()` has try-catch
- `useDMChat` `fetchHistory` has NO try-catch — see **Issue #3** below

---

## 5. Group Chat

### Flow
1. `Home.tsx` calls `groupStore.fetchGroups()` on mount
2. `fetchGroups()` queries `group_members` → `groups` (active only) → member profiles → checks unread
3. User clicks a group → navigates to `/group/:groupId` → `GroupChat.tsx` mounts
4. `GroupChat.tsx` uses `useChat` hook which:
   - Fetches message history from `messages` table (last 50)
   - Creates a Supabase Realtime channel `group:{groupId}` with presence
   - Listens for broadcast `message`, `typing`, `nudge` events
   - Tracks presence per-member for online indicators
5. Sending: optimistic local → broadcast on group channel → broadcast `new_group_msg` on lobby → persist to DB

### Files
- `src/components/Home.tsx` — group list, create/join forms
- `src/components/GroupChat.tsx` — chat UI, member sidebar, invite code, actions
- `src/hooks/useChat.ts` — realtime channel, presence, message history, send/typing/nudge
- `src/stores/groupStore.ts` — `fetchGroups`, `createGroup`, `joinGroupByCode`, `leaveGroup`, `endGroupSession`, `deleteGroup`, `kickMember`, `checkUnread`

### Sub-flows
- **Create group**: generates random invite code → inserts group → adds creator as member → navigates to group
- **Join by code**: finds group by invite_code → inserts member (handles duplicate key) → navigates
- **End session (creator)**: deletes messages → marks inactive → removes all members → broadcasts `group_ended`
- **Leave group**: deletes own membership → re-fetches
- **Kick member**: creator deletes another member's row → re-fetches
- **Redirect on ended**: if group disappears from store while viewing, redirects to `/groups`

### Audit Status: PASS (with issues below)
- `fetchGroups()` has try-catch
- `joinGroupByCode()` has try-catch
- `createGroup()` has NO try-catch — see **Issue #4** below
- `leaveGroup()` has NO try-catch — see **Issue #5** below
- `endGroupSession()` has NO try-catch — see **Issue #5** below
- `deleteGroup()` has NO try-catch — see **Issue #5** below
- `kickMember()` has NO try-catch — see **Issue #5** below
- `useChat` `fetchHistory` has NO try-catch — see **Issue #3** below

---

## 6. Realtime Messaging (Shared Patterns)

### Pattern: Chat Hooks (`useChat`, `useDMChat`)
1. On mount: fetch history from DB → subscribe to Supabase Realtime channel
2. Messages: broadcast-based (not DB-listen) for instant delivery, persisted to DB after
3. Typing: broadcast throttled (2s cooldown), auto-clears after 3s on receiver
4. Nudge: broadcast + sound + vibration + visual shake
5. On unmount: `supabase.removeChannel(channel)`

### Audit Status: Issues found
- Both hooks' `fetchHistory` functions lack try-catch — see **Issue #3**
- Message deduplication by ID is correct
- Ring buffer (50 messages) is correct
- Channel cleanup on unmount is correct

---

## 7. Sound System

### Flow
- `sounds.ts` uses Web Audio API to generate sounds programmatically (no audio files)
- `playMessageSound()`: two-tone sine wave "pop"
- `playNudgeSound()`: sawtooth + square wave buzz
- Sound preference persisted in localStorage (`clofri-sound-enabled`)
- Toggle in sidebar (`Layout.tsx`)

### Audit Status: PASS
- Both functions have try-catch (audio context may not be available)
- Handles suspended AudioContext state

---

## 8. UI Infrastructure

### Connection Banner (`ConnectionBanner.tsx`)
- Listens for browser `online`/`offline` events
- Shows red "You're offline" banner when disconnected
- Shows green "Back online" banner for 3s after reconnection
- **Audit: PASS**

### Error Boundary (`ErrorBoundary.tsx`)
- Class component wrapping each route in `App.tsx`
- Catches render errors, shows "Something went wrong" with retry button
- **Audit: PASS**

### Confirm Dialog (`ConfirmDialog.tsx`)
- Modal with Escape key support, auto-focus on confirm button
- Used for: remove friend, delete category, end DM, end/leave group, kick member
- **Audit: PASS**

### Avatar System (`AvatarIcon.tsx`, `AvatarPicker.tsx`)
- 25 predefined Lucide icon avatars stored as `icon:{id}` in `avatar_url`
- Falls back to URL-based avatar, then initial letter
- **Audit: PASS**

### Layout & Navigation (`Layout.tsx`)
- Collapsible desktop sidebar (w-64/w-14) with localStorage persistence
- Mobile hamburger slide-out
- User profile section: editable display name, avatar picker, status message, auto-reply, friend code copy, share link, sound toggle, sign out
- Unread badges on Messages and Groups nav items
- Dynamic page title based on route
- **Audit: PASS** — `updateProfile` and `saveName` don't block UI

---

## Issues Found During Audit

### Issue #1 — `onAuthStateChange` callback lacks try-catch
**File**: `src/stores/authStore.ts`, line 39-46
**Risk**: If `fetchOrCreateProfile` throws during a mid-session auth event (e.g., token refresh triggers state change), the error is unhandled. The app won't freeze (no loading gate here), but state may be inconsistent.
**Severity**: Medium
**Fix**: Wrap callback body in try-catch.

### Issue #2 — `acceptRequest`, `rejectRequest`, `removeFriend` lack try-catch
**File**: `src/stores/friendStore.ts`, lines 156-181
**Risk**: If the Supabase call throws (network error), the error propagates to the UI component. `Friends.tsx` calls these with `await` but doesn't catch errors from `handleAccept`/`handleReject`. The user gets no feedback and the error goes to the console as unhandled promise rejection.
**Severity**: Medium
**Fix**: Wrap each in try-catch + re-fetch friends to keep state consistent.

### Issue #3 — `fetchHistory` in both chat hooks lacks try-catch
**File**: `src/hooks/useChat.ts` (line 43-73), `src/hooks/useDMChat.ts` (line 37-68)
**Risk**: If the DB query throws, the error propagates as unhandled. Messages array stays empty (acceptable), but the error is noisy in the console and could bubble up if React strict mode or a future change wraps this.
**Severity**: Low-Medium
**Fix**: Wrap in try-catch with console.error.

### Issue #4 — `createGroup` lacks try-catch
**File**: `src/stores/groupStore.ts`, lines 136-160
**Risk**: `supabase.auth.getUser()` or the insert call could throw on network error. `Home.tsx` `handleCreate` sets `actionLoading(true)` before calling and `actionLoading(false)` after, so the spinner would get stuck if `createGroup` throws before reaching its early returns.
**Severity**: Medium
**Fix**: Wrap in try-catch, return null on error.

### Issue #5 — `leaveGroup`, `endGroupSession`, `deleteGroup`, `kickMember` lack try-catch
**File**: `src/stores/groupStore.ts`, lines 199-256
**Risk**: Network errors throw unhandled. `GroupChat.tsx` calls `handleLeave`/`handleEndSession` with `await` then navigates — if the await throws, navigation doesn't happen but no error is shown to the user.
**Severity**: Medium
**Fix**: Wrap each in try-catch.

---

## Data Flow Summary

```
Browser ←→ Supabase Auth (session/tokens)
Browser ←→ Supabase DB (profiles, friendships, dm_sessions, direct_messages, groups, group_members, messages)
Browser ←→ Supabase Realtime
              ├── "lobby" channel (presence + broadcasts: new_dm, dm_ended, friend_request, new_group_msg, group_ended)
              ├── "group:{id}" channels (presence + broadcasts: message, typing, nudge)
              └── "dm-session:{id}" channels (broadcasts: message, typing, nudge)
```

## localStorage Keys
| Key | Purpose |
|-----|---------|
| `clofri-sidebar` | Sidebar collapsed/expanded state |
| `clofri-sound-enabled` | Sound preference |
| `clofri-status-message` | User's status message |
| `clofri-auto-reply` | Auto-reply toggle |
| `clofri-friend-categories` | Friend category definitions |
| `clofri-friend-assignments` | Friend → category mappings |
| `clofri-dm-last-read` | Per-session last-read timestamps |
| `clofri-last-visited` | Per-group last-visited timestamps |
