import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export interface DMConversation {
  friendId: string
  friend: Profile
  lastMessageAt: string | null
}

const LAST_READ_KEY = 'clofri-dm-last-read'

function getLastRead(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}')
  } catch { return {} }
}

function setLastRead(friendId: string) {
  const data = getLastRead()
  data[friendId] = new Date().toISOString()
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(data))
}

interface DMState {
  conversations: DMConversation[]
  unreadDMs: Set<string>
  loading: boolean
  fetchConversations: () => Promise<void>
  markRead: (friendId: string) => void
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  unreadDMs: new Set(),
  loading: false,

  fetchConversations: async () => {
    set({ loading: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return }

      // Get all DMs involving this user, ordered by most recent
      const { data: dms, error } = await supabase
        .from('direct_messages')
        .select('sender_id, receiver_id, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchConversations error:', error)
        set({ loading: false })
        return
      }

      if (!dms || dms.length === 0) {
        set({ conversations: [], unreadDMs: new Set(), loading: false })
        return
      }

      // Build unique conversation list with latest message time
      const convMap = new Map<string, string>() // friendId -> latest created_at
      for (const dm of dms as any[]) {
        const friendId = dm.sender_id === user.id ? dm.receiver_id : dm.sender_id
        if (!convMap.has(friendId)) {
          convMap.set(friendId, dm.created_at)
        }
      }

      // Fetch friend profiles
      const friendIds = [...convMap.keys()]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

      // Build conversations sorted by most recent
      const conversations: DMConversation[] = friendIds
        .map((fid) => ({
          friendId: fid,
          friend: profileMap.get(fid)!,
          lastMessageAt: convMap.get(fid) || null,
        }))
        .filter((c) => c.friend) // skip if profile not found
        .sort((a, b) => {
          if (!a.lastMessageAt) return 1
          if (!b.lastMessageAt) return -1
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        })

      // Check unread
      const lastRead = getLastRead()
      const unread = new Set<string>()
      for (const conv of conversations) {
        if (conv.lastMessageAt) {
          const lastSeen = lastRead[conv.friendId]
          if (!lastSeen || new Date(conv.lastMessageAt) > new Date(lastSeen)) {
            unread.add(conv.friendId)
          }
        }
      }

      set({ conversations, unreadDMs: unread, loading: false })
    } catch (err) {
      console.error('fetchConversations unexpected error:', err)
      set({ loading: false })
    }
  },

  markRead: (friendId: string) => {
    setLastRead(friendId)
    const unread = new Set(get().unreadDMs)
    unread.delete(friendId)
    set({ unreadDMs: unread })
  },
}))
