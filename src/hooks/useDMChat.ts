import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { playMessageSound, isSoundEnabled } from '../lib/sounds'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface DMMessage {
  id: string
  sender_id: string
  receiver_id: string
  display_name: string
  avatar_url: string | null
  text: string
  created_at: string
}

interface UseDMChatOptions {
  sessionId: string
  friendId: string
}

export function useDMChat({ sessionId, friendId }: UseDMChatOptions) {
  const profile = useAuthStore((s) => s.profile)
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    if (!profile || !sessionId || !friendId) return

    // Fetch recent DMs for this session from DB
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) console.error('DM fetchHistory error:', error)

      if (data) {
        const userIds = [...new Set(data.map((m: any) => m.sender_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

        setMessages(
          data.map((m: any) => ({
            id: m.id,
            sender_id: m.sender_id,
            receiver_id: m.receiver_id,
            display_name: profileMap.get(m.sender_id)?.display_name || 'Unknown',
            avatar_url: profileMap.get(m.sender_id)?.avatar_url || null,
            text: m.text,
            created_at: m.created_at,
          }))
        )
      }
    }

    fetchHistory()

    // Realtime channel scoped to session
    const channelName = `dm-session:${sessionId}`

    const channel = supabase.channel(channelName)

    // Listen for broadcast messages
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      const msg = payload as DMMessage
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg].slice(-50)
      })

      if (msg.sender_id !== profile.id && isSoundEnabled()) {
        playMessageSound()
      }
    })

    // Listen for typing indicators
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { sender_id, display_name } = payload as { sender_id: string; display_name: string }
      if (sender_id === profile.id) return

      setTypingUsers((prev) => {
        if (!prev.includes(display_name)) return [...prev, display_name]
        return prev
      })

      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== display_name))
      }, 3000)
    })

    channel.subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId, friendId, profile])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!profile || !channelRef.current || !text.trim()) return

      const msg: DMMessage = {
        id: crypto.randomUUID(),
        sender_id: profile.id,
        receiver_id: friendId,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        text: text.trim(),
        created_at: new Date().toISOString(),
      }

      // Optimistic local update
      setMessages((prev) => [...prev, msg].slice(-50))

      // Broadcast to the other user via DM channel
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: msg,
      })

      // Also notify via lobby channel so receiver gets sound/unread even if not in this chat
      const lobbyChannel = usePresenceStore.getState().channel
      if (lobbyChannel) {
        lobbyChannel.send({
          type: 'broadcast',
          event: 'new_dm',
          payload: { receiver_id: friendId, session_id: sessionId, sender_name: profile.display_name },
        })
      }

      // Persist to DB
      const { error } = await supabase.from('direct_messages').insert({
        id: msg.id,
        sender_id: profile.id,
        receiver_id: friendId,
        text: msg.text,
        session_id: sessionId,
      } as any)
      if (error) console.error('DM persist failed:', error)

      isTypingRef.current = false
    },
    [profile, friendId, sessionId]
  )

  const sendTyping = useCallback(() => {
    if (!profile || !channelRef.current) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: profile.id, display_name: profile.display_name },
      }).then((status) => {
        if (status !== 'ok') console.warn('[DM] Typing send failed:', status)
      })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
    }, 2000)
  }, [profile])

  return { messages, typingUsers, sendMessage, sendTyping }
}
