import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore, type UserStatus } from '../stores/presenceStore'
import { useGroupStore } from '../stores/groupStore'
import { playMessageSound, playNudgeSound, isSoundEnabled } from '../lib/sounds'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  text: string
  created_at: string
}

export interface PresenceMember {
  user_id: string
  display_name: string
  avatar_url: string | null
  status: UserStatus
}

interface UseChatOptions {
  groupId: string
  onNudgeReceived?: (senderName: string) => void
}

export function useChat({ groupId, onNudgeReceived }: UseChatOptions) {
  const profile = useAuthStore((s) => s.profile)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<PresenceMember[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    if (!profile || !groupId) return

    // Fetch recent messages from DB
    const fetchHistory = async () => {
      try {
        const { data, error: histErr } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })
          .limit(50)

        if (histErr) console.error('fetchHistory error:', histErr)
        if (data) {
          // We need profiles for display names
          const userIds = [...new Set(data.map((m: any) => m.user_id))]
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)

          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

          const dbMessages: ChatMessage[] = data.map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            display_name: profileMap.get(m.user_id)?.display_name || 'Unknown',
            avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
            text: m.text,
            created_at: m.created_at,
          }))

          // Merge: keep any optimistic/broadcast messages not yet persisted
          setMessages((prev) => {
            const dbIds = new Set(dbMessages.map(m => m.id))
            const pending = prev.filter(m => !dbIds.has(m.id))
            return [...dbMessages, ...pending]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .slice(-50)
          })
        }
      } catch (err) {
        console.error('fetchHistory unexpected error:', err)
      }
    }

    fetchHistory()

    // Set up realtime channel
    const channel = supabase.channel(`group:${groupId}`, {
      config: { presence: { key: profile.id } },
    })

    // Listen for broadcast messages
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      const msg = payload as ChatMessage
      setMessages((prev) => {
        // Deduplicate by id
        if (prev.some((m) => m.id === msg.id)) return prev
        const updated = [...prev, msg]
        // Ring buffer: keep last 50
        return updated.slice(-50)
      })

      // Play sound for messages from others
      if (msg.user_id !== profile.id && isSoundEnabled()) {
        playMessageSound()
      }
    })

    // Listen for typing indicators
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { user_id, display_name } = payload as { user_id: string; display_name: string }
      if (user_id === profile.id) return

      setTypingUsers((prev) => {
        if (!prev.includes(display_name)) return [...prev, display_name]
        return prev
      })

      // Auto-clear after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== display_name))
      }, 3000)
    })

    // Listen for nudge
    channel.on('broadcast', { event: 'nudge' }, ({ payload }) => {
      const { user_id, display_name } = payload as { user_id: string; display_name: string }
      if (user_id === profile.id) return

      if (isSoundEnabled()) playNudgeSound()
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 100])
      onNudgeReceived?.(display_name)
    })

    // Helper to read presence state and update members
    const syncMembers = () => {
      const state = channel.presenceState<{
        user_id: string
        display_name: string
        avatar_url: string | null
      }>()

      const memberList: PresenceMember[] = []
      for (const key in state) {
        const presences = state[key]
        if (presences && presences.length > 0) {
          const p = presences[0]
          memberList.push({
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            status: usePresenceStore.getState().getStatus(p.user_id),
          })
        }
      }
      setMembers(memberList)
    }

    // Presence sync — use global lobby status for each member
    channel.on('presence', { event: 'sync' }, syncMembers)
    channel.on('presence', { event: 'join' }, syncMembers)
    channel.on('presence', { event: 'leave' }, syncMembers)

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        })
        // Ensure members state is up-to-date after own track
        syncMembers()
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [groupId, profile])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!profile || !channelRef.current || !text.trim()) return

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        text: text.trim(),
        created_at: new Date().toISOString(),
      }

      // Add to local state immediately (optimistic)
      setMessages((prev) => [...prev, msg].slice(-50))

      // Broadcast to others
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: msg,
      })

      // Notify other group members via lobby channel
      const lobbyChannel = usePresenceStore.getState().channel
      if (lobbyChannel) {
        const group = useGroupStore.getState().groups.find((g) => g.id === groupId)
        const memberIds = group?.members
          .map((m) => m.user_id)
          .filter((id) => id !== profile.id) || []
        if (memberIds.length > 0) {
          lobbyChannel.send({
            type: 'broadcast',
            event: 'new_group_msg',
            payload: { group_id: groupId, sender_id: profile.id, member_ids: memberIds },
          })
        }
      }

      // Persist to DB
      const { error: insertErr } = await supabase.from('messages').insert({
        id: msg.id,
        group_id: groupId,
        user_id: profile.id,
        text: msg.text,
      } as any)
      if (insertErr) console.error('Message persist failed:', insertErr)

      // Reset typing state
      isTypingRef.current = false
    },
    [profile, groupId]
  )

  const sendTyping = useCallback(() => {
    if (!profile || !channelRef.current) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: profile.id, display_name: profile.display_name },
      })
    }

    // Reset the "stop typing" timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
    }, 2000)
  }, [profile])

  const sendNudge = useCallback(() => {
    if (!profile || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'nudge',
      payload: { user_id: profile.id, display_name: profile.display_name },
    })
  }, [profile])

  return { messages, members, typingUsers, sendMessage, sendTyping, sendNudge }
}
