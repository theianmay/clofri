import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export interface DMSession {
  id: string
  friendId: string
  friend: Profile
  startedAt: string
}

const LAST_READ_KEY = 'clofri-dm-last-read'

function getLastRead(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}')
  } catch { return {} }
}

function setLastRead(sessionId: string) {
  const data = getLastRead()
  data[sessionId] = new Date().toISOString()
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(data))
}

interface DMState {
  sessions: DMSession[]
  unreadDMs: Set<string>
  loading: boolean
  fetchSessions: () => Promise<void>
  startSession: (friendId: string) => Promise<string | null>
  endSession: (sessionId: string) => Promise<void>
  markRead: (sessionId: string) => void
}

export const useDMStore = create<DMState>((set, get) => ({
  sessions: [],
  unreadDMs: new Set(),
  loading: false,

  fetchSessions: async () => {
    // Only show loading spinner on initial fetch, not on polls
    if (get().sessions.length === 0) set({ loading: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return }

      // Get active DM sessions for this user
      const { data: rawSessions, error } = await supabase
        .from('dm_sessions')
        .select('*')
        .eq('is_active', true)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('started_at', { ascending: false })

      if (error) {
        console.error('fetchSessions error:', error)
        set({ loading: false })
        return
      }

      if (!rawSessions || rawSessions.length === 0) {
        set({ sessions: [], unreadDMs: new Set(), loading: false })
        return
      }

      // Get friend profiles
      const friendIds = rawSessions.map((s: any) =>
        s.user1_id === user.id ? s.user2_id : s.user1_id
      )
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

      const sessions: DMSession[] = rawSessions
        .map((s: any) => {
          const friendId = s.user1_id === user.id ? s.user2_id : s.user1_id
          return {
            id: s.id,
            friendId,
            friend: profileMap.get(friendId)!,
            startedAt: s.started_at,
          }
        })
        .filter((s: DMSession) => s.friend)

      // Check unread — look for messages newer than last read
      const lastRead = getLastRead()
      const unread = new Set<string>()
      for (const session of sessions) {
        const { data: latestMsg } = await supabase
          .from('direct_messages')
          .select('created_at')
          .eq('session_id', session.id)
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (latestMsg && latestMsg.length > 0) {
          const lastSeen = lastRead[session.id]
          if (!lastSeen || new Date((latestMsg[0] as any).created_at) > new Date(lastSeen)) {
            unread.add(session.id)
          }
        }
      }

      set({ sessions, unreadDMs: unread, loading: false })
    } catch (err) {
      console.error('fetchSessions unexpected error:', err)
      set({ loading: false })
    }
  },

  startSession: async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Ensure consistent ordering (user1_id < user2_id)
      const [user1, user2] = [user.id, friendId].sort()

      // Check for existing active session
      const { data: existing } = await supabase
        .from('dm_sessions')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .eq('is_active', true)
        .single()

      if (existing) return (existing as any).id as string

      // Create new session
      const { data: session, error } = await supabase
        .from('dm_sessions')
        .insert({ user1_id: user1, user2_id: user2 } as any)
        .select()
        .single()

      if (error) {
        console.error('startSession error:', error)
        return null
      }

      await get().fetchSessions()
      return (session as any).id as string
    } catch (err) {
      console.error('startSession unexpected error:', err)
      return null
    }
  },

  endSession: async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find the other user in this session
      const session = get().sessions.find((s) => s.id === sessionId)
      const otherUserId = session?.friendId

      // Delete all messages for this session
      await supabase.from('direct_messages').delete().eq('session_id', sessionId)
      // Mark session as inactive
      await supabase
        .from('dm_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() } as never)
        .eq('id', sessionId)

      // Notify the other user via lobby channel
      if (otherUserId) {
        const lobbyChannel = supabase.channel('lobby')
        lobbyChannel.send({
          type: 'broadcast',
          event: 'dm_ended',
          payload: { session_id: sessionId, ended_by: user.id, other_user_id: otherUserId },
        })
      }

      await get().fetchSessions()
    } catch (err) {
      console.error('endSession error:', err)
    }
  },

  markRead: (sessionId: string) => {
    setLastRead(sessionId)
    const unread = new Set(get().unreadDMs)
    unread.delete(sessionId)
    set({ unreadDMs: unread })
  },
}))
