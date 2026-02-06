import { create } from 'zustand'
import type { Group, GroupMember, Profile } from '../types/database'
import { supabase } from '../lib/supabase'

export interface GroupWithMembers extends Group {
  members: (GroupMember & { profile: Profile })[]
}

interface GroupState {
  groups: GroupWithMembers[]
  loading: boolean
  fetchGroups: () => Promise<void>
  createGroup: (name: string) => Promise<Group | null>
  joinGroupByCode: (code: string) => Promise<{ error: string | null; groupId: string | null }>
  leaveGroup: (groupId: string) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  kickMember: (groupId: string, userId: string) => Promise<void>
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  loading: false,

  fetchGroups: async () => {
    set({ loading: true })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    // Get groups the user is a member of
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      set({ groups: [], loading: false })
      return
    }

    const groupIds = memberships.map((m: any) => m.group_id)

    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)

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
  },

  createGroup: async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name, creator_id: user.id, invite_code: inviteCode } as any)
      .select()
      .single()

    if (error || !group) return null

    // Add creator as a member
    await supabase
      .from('group_members')
      .insert({ group_id: (group as any).id, user_id: user.id, role: 'creator' } as any)

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
