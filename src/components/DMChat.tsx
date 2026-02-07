import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDMStore } from '../stores/dmStore'
import { useDMChat } from '../hooks/useDMChat'
import { usePresenceStore } from '../stores/presenceStore'
import { ArrowLeft, Send, XCircle } from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId) markRead(sessionId)
  }, [sessionId, markRead])

  // Redirect if session was ended by the other user
  useEffect(() => {
    if (sessionId && hasFetched && !sessions.find((s) => s.id === sessionId)) {
      navigate('/messages')
    }
  }, [sessionId, sessions, hasFetched, navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    if (!sessionId || !confirm('End this conversation? All messages will be deleted.')) return
    await endSession(sessionId)
    navigate('/messages')
  }

  if (!sessionId) return null

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
          } rounded-full border-2 border-zinc-950`} />
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
          onClick={handleEndChat}
          title="End conversation"
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">No messages yet. Say something!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === profile?.id
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
            >
              {!isOwn && (
                <AvatarIcon
                  avatarUrl={msg.avatar_url}
                  displayName={msg.display_name}
                  size="sm"
                  className="shrink-0"
                />
              )}
              <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                <div
                  className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
                <p className="text-zinc-700 text-[10px] mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Ephemeral notice */}
      <div className="px-4 py-1">
        <p className="text-zinc-700 text-[10px] text-center">
          This conversation is ephemeral — it ends when you close it
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInput}
            placeholder="Type a message..."
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
    </div>
  )
}
