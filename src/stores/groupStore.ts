import { create } from 'zustand'
import type { Group, GroupMember, Profile } from '../types/database'
import { supabase } from '../lib/supabase'

export interface GroupWithMembers extends Group {
  members: (GroupMember & { profile: Profile })[]
}

interface GroupState {
  groups: GroupWithMembers[]
  loading: boolean
  unreadGroups: Set<string>
  fetchGroups: () => Promise<void>
  createGroup: (name: string) => Promise<Group | null>
  joinGroupByCode: (code: string) => Promise<{ error: string | null; groupId: string | null }>
  leaveGroup: (groupId: string) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  kickMember: (groupId: string, userId: string) => Promise<void>
  markRead: (groupId: string) => void
  checkUnread: (groupIds: string[]) => Promise<void>
}

function getLastVisited(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('clofri-last-visited') || '{}')
  } catch { return {} }
}

function setLastVisited(groupId: string) {
  const data = getLastVisited()
  data[groupId] = new Date().toISOString()
  localStorage.setItem('clofri-last-visited', JSON.stringify(data))
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  loading: false,
  unreadGroups: new Set(),

  fetchGroups: async () => {
    set({ loading: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return }

      // Get groups the user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (memErr) { console.error('fetchGroups memberships error:', memErr); set({ loading: false }); return }
      if (!memberships || memberships.length === 0) {
        set({ groups: [], loading: false })
        return
      }

      const groupIds = memberships.map((m: any) => m.group_id)

      const { data: groups, error: grpErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)

      if (grpErr) { console.error('fetchGroups groups error:', grpErr); set({ loading: false }); return }
      if (!groups) { set({ groups: [], loading: false }); return }

      // Get all members for these groups with profiles
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('*')
        .in('group_id', groupIds)

      const memberUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

      const groupsWithMembers: GroupWithMembers[] = groups.map((g: any) => ({
        ...g,
        members: (allMembers || [])
          .filter((m: any) => m.group_id === g.id)
          .map((m: any) => ({ ...m, profile: profileMap.get(m.user_id)! })),
      }))

      set({ groups: groupsWithMembers, loading: false })

      // Check for unread messages
      await get().checkUnread(groupIds)
    } catch (err) {
      console.error('fetchGroups unexpected error:', err)
      set({ loading: false })
    }
  },

  checkUnread: async (groupIds: string[]) => {
    if (groupIds.length === 0) return
    const lastVisited = getLastVisited()
    const unread = new Set<string>()

    // Get latest message per group
    for (const gid of groupIds) {
      const { data } = await supabase
        .from('messages')
        .select('created_at')
        .eq('group_id', gid)
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        const lastMsg = (data[0] as any).created_at
        const lastSeen = lastVisited[gid]
        if (!lastSeen || new Date(lastMsg) > new Date(lastSeen)) {
          unread.add(gid)
        }
      }
    }

    set({ unreadGroups: unread })
  },

  markRead: (groupId: string) => {
    setLastVisited(groupId)
    const unread = new Set(get().unreadGroups)
    unread.delete(groupId)
    set({ unreadGroups: unread })
  },

  createGroup: async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { console.error('createGroup: no user'); return null }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name, creator_id: user.id, invite_code: inviteCode } as any)
      .select()
      .single()

    if (error) { console.error('createGroup insert error:', error); return null }
    if (!group) { console.error('createGroup: no group returned'); return null }

    // Add creator as a member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: (group as any).id, user_id: user.id, role: 'creator' } as any)

    if (memberError) console.error('createGroup member insert error:', memberError)

    await get().fetchGroups()
    return group as Group
  },

  joinGroupByCode: async (code: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated', groupId: null }

      const { data: group, error: findErr } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', code.toUpperCase())
        .single()

      if (findErr) console.error('joinGroup find error:', findErr)
      if (!group) return { error: 'Invalid invite code', groupId: null }

      // Try to insert — if already a member, the unique constraint will error
      const { error: insertErr } = await supabase
        .from('group_members')
        .insert({ group_id: (group as any).id, user_id: user.id, role: 'member' } as any)

      if (insertErr) {
        // Unique constraint violation means already a member
        if (insertErr.code === '23505') {
          return { error: null, groupId: (group as any).id }
        }
        console.error('joinGroup insert error:', insertErr)
        return { error: insertErr.message, groupId: null }
      }

      await get().fetchGroups()
      return { error: null, groupId: (group as any).id }
    } catch (err) {
      console.error('joinGroupByCode unexpected error:', err)
      return { error: 'Something went wrong. Check console.', groupId: null }
    }
  },

  leaveGroup: async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    await get().fetchGroups()
  },

  deleteGroup: async (groupId: string) => {
    await supabase.from('group_members').delete().eq('group_id', groupId)
    await supabase.from('messages').delete().eq('group_id', groupId)
    await supabase.from('groups').delete().eq('id', groupId)
    await get().fetchGroups()
  },

  kickMember: async (groupId: string, userId: string) => {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    await get().fetchGroups()
  },
}))
