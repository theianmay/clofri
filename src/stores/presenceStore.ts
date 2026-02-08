import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { playMessageSound, isSoundEnabled } from '../lib/sounds'
import { useDMStore } from './dmStore'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000 // 60 seconds
const STALE_THRESHOLD_MS = 6 * 60 * 1000 // 6 minutes (idle timeout + buffer)

const STATUS_MSG_KEY = 'clofri-status-message'
const AUTO_REPLY_KEY = 'clofri-auto-reply'

export type UserStatus = 'active' | 'idle' | 'offline'

export interface PresenceUser {
  user_id: string
  display_name: string
  avatar_url: string | null
  status: UserStatus
  last_active: string
  status_message: string | null
  auto_reply: boolean
}

interface PresenceState {
  onlineUsers: Map<string, PresenceUser>
  channel: RealtimeChannel | null
  statusMessage: string | null
  autoReply: boolean
  getStatus: (userId: string) => UserStatus
  getStatusMessage: (userId: string) => string | null
  setStatusMessage: (message: string | null) => void
  setAutoReply: (enabled: boolean) => void
  join: (profile: { id: string; display_name: string; avatar_url: string | null }) => void
  leave: () => void
}

// Resolve effective status: if tracked as "active" but last_active is stale, treat as idle
function resolveStatus(user: PresenceUser): UserStatus {
  if (user.status === 'idle') return 'idle'
  const elapsed = Date.now() - new Date(user.last_active).getTime()
  if (elapsed > STALE_THRESHOLD_MS) return 'idle'
  return 'active'
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Map(),
  channel: null,
  statusMessage: localStorage.getItem(STATUS_MSG_KEY) || null,
  autoReply: localStorage.getItem(AUTO_REPLY_KEY) === 'true',

  getStatus: (userId: string) => {
    const user = get().onlineUsers.get(userId)
    if (!user) return 'offline'
    return resolveStatus(user)
  },

  getStatusMessage: (userId: string) => {
    const user = get().onlineUsers.get(userId)
    return user?.status_message || null
  },

  setStatusMessage: (message: string | null) => {
    const trimmed = message?.trim() || null
    set({ statusMessage: trimmed })
    if (trimmed) localStorage.setItem(STATUS_MSG_KEY, trimmed)
    else localStorage.removeItem(STATUS_MSG_KEY)
    // Re-track with updated status message
    const { channel } = get()
    if (channel) {
      const state = channel.presenceState<PresenceUser>()
      // Find our own presence key to get current tracked data
      for (const key in state) {
        const presences = state[key]
        if (presences && presences.length > 0) {
          const p = presences[0]
          // Only re-track our own presence
          if (key === p.user_id) {
            channel.track({
              user_id: p.user_id,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              status: p.status,
              last_active: new Date().toISOString(),
              status_message: trimmed,
              auto_reply: get().autoReply,
            })
            break
          }
        }
      }
    }
  },

  setAutoReply: (enabled: boolean) => {
    set({ autoReply: enabled })
    localStorage.setItem(AUTO_REPLY_KEY, enabled ? 'true' : 'false')
    // Re-track with updated auto_reply flag
    const { channel, statusMessage } = get()
    if (channel) {
      const state = channel.presenceState<PresenceUser>()
      for (const key in state) {
        const presences = state[key]
        if (presences && presences.length > 0) {
          const p = presences[0]
          if (key === p.user_id) {
            channel.track({
              user_id: p.user_id,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              status: p.status,
              last_active: new Date().toISOString(),
              status_message: statusMessage,
              auto_reply: enabled,
            })
            break
          }
        }
      }
    }
  },

  join: (profile) => {
    // Don't double-join
    if (get().channel) return

    let currentStatus: UserStatus = 'active'
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null

    const channel = supabase.channel('lobby', {
      config: { presence: { key: profile.id } },
    })

    // --- Activity detection ---
    const trackStatus = (status: UserStatus) => {
      if (!channel) return
      currentStatus = status
      channel.track({
        user_id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        status,
        last_active: new Date().toISOString(),
        status_message: get().statusMessage,
        auto_reply: get().autoReply,
      })
    }

    const resetIdleTimer = () => {
      if (currentStatus === 'idle') {
        trackStatus('active')
      }
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        trackStatus('idle')
      }, IDLE_TIMEOUT_MS)
    }

    const handleActivity = () => resetIdleTimer()

    const handleVisibility = () => {
      if (document.hidden) {
        // Tab hidden → go idle immediately
        if (idleTimer) clearTimeout(idleTimer)
        trackStatus('idle')
      } else {
        // Tab visible → go active
        trackStatus('active')
        resetIdleTimer()
      }
    }

    // --- DM notification listener ---
    channel.on('broadcast', { event: 'new_dm' }, ({ payload }) => {
      if (payload.receiver_id === profile.id) {
        // Check if user is currently viewing this DM session
        const isViewingSession = window.location.pathname === `/dm/${payload.session_id}`
        if (!isViewingSession) {
          // Mark as unread
          const dmState = useDMStore.getState()
          const unread = new Set(dmState.unreadDMs)
          unread.add(payload.session_id)
          useDMStore.setState({ unreadDMs: unread })

          // Play sound
          if (isSoundEnabled()) {
            playMessageSound()
          }
        }

        // Always re-fetch sessions so new conversations appear immediately
        useDMStore.getState().fetchSessions()
      }
    })

    // --- DM ended listener ---
    channel.on('broadcast', { event: 'dm_ended' }, ({ payload }) => {
      if (payload.other_user_id === profile.id) {
        // Play a notification sound
        if (isSoundEnabled()) {
          playMessageSound()
        }

        // Re-fetch sessions to remove the ended one
        useDMStore.getState().fetchSessions()
      }
    })

    // --- Friend request listener ---
    channel.on('broadcast', { event: 'friend_request' }, ({ payload }) => {
      if (payload.recipient_id === profile.id) {
        if (isSoundEnabled()) {
          playMessageSound()
        }
        // Re-fetch friends to show the new pending request
        import('./friendStore').then(({ useFriendStore }) => {
          useFriendStore.getState().fetchFriends()
        })
      }
    })

    // --- Group message notification listener ---
    channel.on('broadcast', { event: 'new_group_msg' }, ({ payload }) => {
      if (payload.member_ids?.includes(profile.id)) {
        const isViewingGroup = window.location.pathname === `/group/${payload.group_id}`
        if (!isViewingGroup) {
          // Mark as unread
          import('./groupStore').then(({ useGroupStore }) => {
            const unread = new Set(useGroupStore.getState().unreadGroups)
            unread.add(payload.group_id)
            useGroupStore.setState({ unreadGroups: unread })
          })

          // Play sound
          if (isSoundEnabled()) {
            playMessageSound()
          }
        }
      }
    })

    // --- Group ended listener ---
    channel.on('broadcast', { event: 'group_ended' }, ({ payload }) => {
      if (payload.member_ids?.includes(profile.id)) {
        if (isSoundEnabled()) {
          playMessageSound()
        }

        // Re-fetch groups to remove the ended one
        // Dynamic import to avoid circular dependency at module level
        import('./groupStore').then(({ useGroupStore }) => {
          useGroupStore.getState().fetchGroups()
        })
      }
    })

    // --- Presence sync ---
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = new Map<string, PresenceUser>()

      for (const key in state) {
        const presences = state[key]
        if (presences && presences.length > 0) {
          const p = presences[0]
          users.set(p.user_id, {
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            status: p.status,
            last_active: p.last_active,
            status_message: p.status_message || null,
            auto_reply: !!p.auto_reply,
          })
        }
      }

      set({ onlineUsers: users })
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Initial track as active
        await trackStatus('active')

        // Start idle timer
        resetIdleTimer()

        // Start heartbeat: re-track periodically to keep last_active fresh
        heartbeatTimer = setInterval(() => {
          if (currentStatus === 'active') {
            channel.track({
              user_id: profile.id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              status: 'active',
              last_active: new Date().toISOString(),
              status_message: get().statusMessage,
              auto_reply: get().autoReply,
            })
          }
        }, HEARTBEAT_INTERVAL_MS)

        // Listen for user activity
        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('keydown', handleActivity)
        window.addEventListener('pointerdown', handleActivity)
        window.addEventListener('scroll', handleActivity)
        document.addEventListener('visibilitychange', handleVisibility)
      }
    })

    // Store cleanup refs on the channel object for leave()
    ;(channel as any)._cleanup = () => {
      if (idleTimer) clearTimeout(idleTimer)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('pointerdown', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      document.removeEventListener('visibilitychange', handleVisibility)
    }

    set({ channel })
  },

  leave: () => {
    const { channel } = get()
    if (channel) {
      ;(channel as any)._cleanup?.()
      channel.unsubscribe()
      set({ channel: null, onlineUsers: new Map() })
    }
  },
}))
