import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceUser {
  user_id: string
  display_name: string
  avatar_url: string | null
  online_at: string
}

interface PresenceState {
  onlineUsers: Map<string, PresenceUser>
  channel: RealtimeChannel | null
  isOnline: (userId: string) => boolean
  join: (profile: { id: string; display_name: string; avatar_url: string | null }) => void
  leave: () => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Map(),
  channel: null,

  isOnline: (userId: string) => {
    return get().onlineUsers.has(userId)
  },

  join: (profile) => {
    // Don't double-join
    if (get().channel) return

    const channel = supabase.channel('lobby', {
      config: { presence: { key: profile.id } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = new Map<string, PresenceUser>()

      for (const key in state) {
        const presences = state[key]
        if (presences && presences.length > 0) {
          users.set(presences[0].user_id, {
            user_id: presences[0].user_id,
            display_name: presences[0].display_name,
            avatar_url: presences[0].avatar_url,
            online_at: presences[0].online_at,
          })
        }
      }

      set({ onlineUsers: users })
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          online_at: new Date().toISOString(),
        })
      }
    })

    set({ channel })
  },

  leave: () => {
    const { channel } = get()
    if (channel) {
      channel.unsubscribe()
      set({ channel: null, onlineUsers: new Map() })
    }
  },
}))
