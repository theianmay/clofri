import { create } from 'zustand'
import type { Profile, Friendship } from '../types/database'
import { supabase } from '../lib/supabase'
import { usePresenceStore } from './presenceStore'

export interface FriendEntry {
  friendship: Friendship
  friend: Profile
}

interface FriendState {
  friends: FriendEntry[]
  pendingReceived: FriendEntry[]
  pendingSent: FriendEntry[]
  loading: boolean
  fetchFriends: () => Promise<void>
  sendRequest: (friendCode: string) => Promise<{ error: string | null }>
  acceptRequest: (friendshipId: string) => Promise<void>
  rejectRequest: (friendshipId: string) => Promise<void>
  removeFriend: (friendshipId: string) => Promise<void>
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  pendingReceived: [],
  pendingSent: [],
  loading: false,

  fetchFriends: async () => {
    set({ loading: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return }

      // Get all friendships involving this user
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (!friendships || friendships.length === 0) {
        set({ friends: [], pendingReceived: [], pendingSent: [], loading: false })
        return
      }

      // Get all related profiles
      const userIds = new Set<string>()
      friendships.forEach((f: any) => {
        userIds.add(f.requester_id)
        userIds.add(f.addressee_id)
      })
      userIds.delete(user.id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [...userIds])

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

      const getFriend = (f: any): Profile => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id
        return profileMap.get(friendId)!
      }

      const accepted = friendships
        .filter((f: any) => f.status === 'accepted')
        .map((f: any) => ({ friendship: f as Friendship, friend: getFriend(f) }))
        .filter((e: FriendEntry) => e.friend)

      const pendingReceived = friendships
        .filter((f: any) => f.status === 'pending' && f.addressee_id === user.id)
        .map((f: any) => ({ friendship: f as Friendship, friend: getFriend(f) }))
        .filter((e: FriendEntry) => e.friend)

      const pendingSent = friendships
        .filter((f: any) => f.status === 'pending' && f.requester_id === user.id)
        .map((f: any) => ({ friendship: f as Friendship, friend: getFriend(f) }))
        .filter((e: FriendEntry) => e.friend)

      set({ friends: accepted, pendingReceived, pendingSent, loading: false })
    } catch (err) {
      console.error('fetchFriends error:', err)
      set({ loading: false })
    }
  },

  sendRequest: async (friendCode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      // Verify current user has a profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!myProfile) return { error: 'Your profile is not set up yet. Try refreshing the page.' }

      // Find user by friend code
      const { data: target, error: findErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('friend_code', friendCode.toUpperCase())
        .single()

      if (findErr || !target) return { error: 'No user found with that friend code' }
      if ((target as any).id === user.id) return { error: "You can't add yourself" }

      // Check if friendship already exists
      const { data: existing, error: checkErr } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${(target as any).id}),and(requester_id.eq.${(target as any).id},addressee_id.eq.${user.id})`
        )

      if (checkErr) return { error: 'Could not check existing friendships. Try again.' }

      if (existing && existing.length > 0) {
        const f = existing[0] as any
        if (f.status === 'accepted') return { error: 'Already friends' }
        if (f.status === 'pending') return { error: 'Request already pending' }
      }

      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: user.id, addressee_id: (target as any).id } as any)

      if (error) return { error: error.message }

      // Notify recipient via lobby broadcast
      try {
        const lobbyChannel = usePresenceStore.getState().channel
        if (lobbyChannel) {
          lobbyChannel.send({
            type: 'broadcast',
            event: 'friend_request',
            payload: { recipient_id: (target as any).id },
          })
        }
      } catch {
        // Non-critical: broadcast failed but request was sent
      }

      await get().fetchFriends()
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Something went wrong. Please try again.' }
    }
  },

  acceptRequest: async (friendshipId: string) => {
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' } as any)
        .eq('id', friendshipId)

      await get().fetchFriends()
    } catch (err) {
      console.error('acceptRequest error:', err)
      await get().fetchFriends()
    }
  },

  rejectRequest: async (friendshipId: string) => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      await get().fetchFriends()
    } catch (err) {
      console.error('rejectRequest error:', err)
      await get().fetchFriends()
    }
  },

  removeFriend: async (friendshipId: string) => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      await get().fetchFriends()
    } catch (err) {
      console.error('removeFriend error:', err)
      await get().fetchFriends()
    }
  },
}))
