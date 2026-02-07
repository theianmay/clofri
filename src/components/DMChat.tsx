import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDMStore } from '../stores/dmStore'
import { useDMChat } from '../hooks/useDMChat'
import { usePresenceStore } from '../stores/presenceStore'
import { useFriendStore } from '../stores/friendStore'
import { ArrowLeft, Send } from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'

export function DMChat() {
  const { friendId } = useParams<{ friendId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { markRead } = useDMStore()
  const { friends } = useFriendStore()
  const { getStatus } = usePresenceStore()

  const friend = friends.find((f) => f.friend.id === friendId)?.friend

  const { messages, typingUsers, sendMessage, sendTyping } = useDMChat({
    friendId: friendId || '',
  })

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (friendId) markRead(friendId)
  }, [friendId, markRead])

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

  if (!friendId) return null

  const status = getStatus(friendId)
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
        <AvatarIcon
          avatarUrl={friend?.avatar_url || null}
          displayName={friend?.display_name || 'Unknown'}
          size="sm"
        />
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
      {messages.length > 0 && (
        <div className="px-4 py-1">
          <p className="text-zinc-700 text-[10px] text-center">
            Messages are ephemeral — only the last 50 are shown
          </p>
        </div>
      )}

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
