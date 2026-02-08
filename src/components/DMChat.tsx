import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDMStore } from '../stores/dmStore'
import { useDMChat } from '../hooks/useDMChat'
import { usePresenceStore } from '../stores/presenceStore'
import { ArrowLeft, Send, XCircle, ArrowDown } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import { AvatarIcon } from './AvatarIcon'
import { linkifyText } from '../lib/linkify'

export function DMChat() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { sessions, hasFetched, markRead, endSession } = useDMStore()

  const session = sessions.find((s) => s.id === sessionId)
  const friend = session?.friend
  const friendId = session?.friendId || ''

  const { getStatus } = usePresenceStore()

  const { messages, typingUsers, sendMessage, sendTyping } = useDMChat({
    sessionId: sessionId || '',
    friendId,
  })

  const [input, setInput] = useState('')
  const [sessionEnded, setSessionEnded] = useState(false)
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    if (sessionId) markRead(sessionId)
  }, [sessionId, markRead])

  // Show "conversation ended" briefly then redirect
  useEffect(() => {
    if (sessionId && hasFetched && !sessions.find((s) => s.id === sessionId) && !sessionEnded) {
      setSessionEnded(true)
      const timer = setTimeout(() => navigate('/messages'), 2000)
      return () => clearTimeout(timer)
    }
  }, [sessionId, sessions, hasFetched, navigate, sessionEnded])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [sessionId])

  // Smart auto-scroll: only when near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.sender_id !== profile?.id) {
        setShowNewMsg(true)
      }
    }
  }, [messages])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const threshold = 100
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    if (isNearBottomRef.current) setShowNewMsg(false)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowNewMsg(false)
  }, [])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    sendTyping()
  }

  const handleEndChat = async () => {
    if (!sessionId) return
    await endSession(sessionId)
    navigate('/messages')
  }

  if (!sessionId) return null

  if (sessionEnded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium">Conversation ended</p>
          <p className="text-zinc-500 text-sm mt-1">Redirecting to messages...</p>
        </div>
      </div>
    )
  }

  const status = friendId ? getStatus(friendId) : 'offline'
  const statusText = status === 'active' ? 'Active now' : status === 'idle' ? 'Idle' : 'Offline'

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
        <button
          onClick={() => navigate('/messages')}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative">
          <AvatarIcon
            avatarUrl={friend?.avatar_url || null}
            displayName={friend?.display_name || 'Unknown'}
            size="sm"
          />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
            status === 'active' ? 'bg-green-500' : status === 'idle' ? 'bg-amber-400' : 'bg-zinc-600'
          } rounded-full border-2 border-zinc-900`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-semibold truncate">
            {friend?.display_name || 'Loading...'}
          </h2>
          <p className="text-zinc-500 text-xs">
            {statusText}
            {typingUsers.length > 0 && (
              <span className="text-blue-400 ml-2">typing...</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          title="End conversation"
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto p-4 space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-600 text-sm">No messages yet. Say something!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === profile?.id
            const prev = i > 0 ? messages[i - 1] : null
            const isGrouped = prev?.sender_id === msg.sender_id &&
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 120000
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
              >
                {!isOwn && (
                  isGrouped
                    ? <div className="w-8 shrink-0" />
                    : <AvatarIcon avatarUrl={msg.avatar_url} displayName={msg.display_name} size="sm" className="shrink-0" />
                )}
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block px-3 py-2 rounded-2xl text-sm break-words ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                    }`}
                  >
                    {linkifyText(msg.text)}
                  </div>
                  {!isGrouped && (
                    <p className="text-zinc-700 text-[10px] mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* New messages indicator */}
        {showNewMsg && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-blue-500 transition-colors"
          >
            <ArrowDown className="w-3 h-3" />
            New messages
          </button>
        )}
      </div>

      {/* Ephemeral notice */}
      <div className="px-4 py-1">
        <p className="text-zinc-600 text-xs text-center">
          Messages are ephemeral — they disappear when the conversation ends
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInput}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showEndConfirm}
        title="End conversation?"
        description="All messages will be permanently deleted for both of you."
        confirmLabel="End Chat"
        variant="danger"
        onConfirm={() => { setShowEndConfirm(false); handleEndChat() }}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  )
}
