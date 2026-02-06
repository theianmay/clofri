import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGroupStore } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { useChat } from '../hooks/useChat'
import {
  ArrowLeft,
  Send,
  Copy,
  Check,
  Users,
  Crown,
  UserMinus,
  LogOut,
  Trash2,
  Circle,
} from 'lucide-react'

export function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { groups, fetchGroups, leaveGroup, deleteGroup, kickMember } = useGroupStore()
  const group = groups.find((g) => g.id === groupId)

  const { messages, members, typingUsers, sendMessage, sendTyping } = useChat({
    groupId: groupId || '',
  })

  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!group) fetchGroups()
  }, [group, fetchGroups])

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

  const handleCopyCode = () => {
    if (!group) return
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    if (!groupId) return
    await leaveGroup(groupId)
    navigate('/')
  }

  const handleDelete = async () => {
    if (!groupId || !confirm('Delete this group? This cannot be undone.')) return
    await deleteGroup(groupId)
    navigate('/')
  }

  const isCreator = group?.creator_id === profile?.id
  const onlineUserIds = new Set(members.map((m) => m.user_id))

  if (!groupId) return null

  return (
    <div className="flex-1 flex">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">{group?.name || 'Loading...'}</h2>
            <p className="text-zinc-500 text-xs">
              {members.length} online
              {typingUsers.length > 0 && (
                <span className="text-blue-400 ml-2">
                  {typingUsers.join(', ')} typing...
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2 rounded-lg transition-colors ${
              showMembers
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Users className="w-5 h-5" />
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
            const isOwn = msg.user_id === profile?.id
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-medium shrink-0">
                    {msg.avatar_url ? (
                      <img src={msg.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      msg.display_name[0]?.toUpperCase()
                    )}
                  </div>
                )}
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  {!isOwn && (
                    <p className="text-zinc-500 text-xs mb-1">{msg.display_name}</p>
                  )}
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

      {/* Members sidebar */}
      {showMembers && (
        <div className="w-64 border-l border-zinc-800 flex flex-col bg-zinc-900">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-white font-semibold text-sm">Members</h3>
            <p className="text-zinc-500 text-xs mt-0.5">
              {group?.members.length || 0} total · {members.length} online
            </p>
          </div>

          {/* Invite code */}
          <div className="p-3 border-b border-zinc-800">
            <p className="text-zinc-500 text-xs mb-1.5">Invite code</p>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg w-full hover:bg-zinc-700 transition-colors"
            >
              <span className="font-mono text-sm text-white tracking-wider flex-1 text-left">
                {group?.invite_code}
              </span>
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-500" />
              )}
            </button>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {group?.members.map((member) => {
              const isOnline = onlineUserIds.has(member.user_id)
              const isMemberCreator = member.role === 'creator'
              const canKick = isCreator && member.user_id !== profile?.id

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 group"
                >
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-medium">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full"
                        />
                      ) : (
                        member.profile?.display_name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <Circle
                      className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${
                        isOnline ? 'text-green-500 fill-green-500' : 'text-zinc-600 fill-zinc-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-sm truncate ${
                          isOnline ? 'text-white' : 'text-zinc-500'
                        }`}
                      >
                        {member.profile?.display_name}
                      </span>
                      {isMemberCreator && (
                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                    </div>
                  </div>
                  {canKick && (
                    <button
                      onClick={() => kickMember(groupId!, member.user_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                      title="Remove member"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-zinc-800 space-y-1">
            {isCreator ? (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-2 py-1.5 w-full rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            ) : (
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 text-sm px-2 py-1.5 w-full rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
