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
  getOrCreateDM: (friendId: string) => Promise<string | null>
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

export function isDMGroup(name: string): boolean {
  return name.startsWith('dm:')
}

export function getDMOtherUserId(name: string, myId: string): string | null {
  if (!isDMGroup(name)) return null
  const parts = name.split(':')
  if (parts.length !== 3) return null
  return parts[1] === myId ? parts[2] : parts[1]
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

  getOrCreateDM: async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const sorted = [user.id, friendId].sort()
      const dmName = `dm:${sorted[0]}:${sorted[1]}`

      // Check if DM group already exists
      const existing = get().groups.find((g) => g.name === dmName)
      if (existing) return existing.id

      // Create the DM group
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name: dmName, creator_id: user.id, invite_code: inviteCode } as any)
        .select()
        .single()

      if (error || !group) {
        console.error('getOrCreateDM create error:', error)
        return null
      }

      // Add both users as members
      const { error: memErr } = await supabase
        .from('group_members')
        .insert([
          { group_id: (group as any).id, user_id: user.id, role: 'creator' },
          { group_id: (group as any).id, user_id: friendId, role: 'member' },
        ] as any)

      if (memErr) console.error('getOrCreateDM member insert error:', memErr)

      await get().fetchGroups()
      return (group as any).id as string
    } catch (err) {
      console.error('getOrCreateDM unexpected error:', err)
      return null
    }
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', groupId: null }

    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .single()

    if (!group) return { error: 'Invalid invite code', groupId: null }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', (group as any).id)
      .eq('user_id', user.id)
      .single()

    if (existing) return { error: null, groupId: (group as any).id }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: (group as any).id, user_id: user.id, role: 'member' } as any)

    if (error) return { error: error.message, groupId: null }

    await get().fetchGroups()
    return { error: null, groupId: (group as any).id }
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
