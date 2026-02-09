import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGroupStore } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
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
  Circle,
  XCircle,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  Hand,
} from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'
import { linkifyText } from '../lib/linkify'
import { ConfirmDialog } from './ConfirmDialog'

export function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { groups, fetchGroups, leaveGroup, endGroupSession, kickMember, markRead } = useGroupStore()
  const group = groups.find((g) => g.id === groupId)

  const [nudgeShake, setNudgeShake] = useState(false)
  const [nudgeCooldown, setNudgeCooldown] = useState(false)
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null)

  const handleNudgeReceived = useCallback((senderName: string) => {
    setNudgeShake(true)
    setNudgeMsg(`~ ${senderName} nudged you ~`)
    setTimeout(() => setNudgeShake(false), 600)
    setTimeout(() => setNudgeMsg(null), 4000)
  }, [])

  const { messages, typingUsers, sendMessage, sendTyping, sendNudge } = useChat({
    groupId: groupId || '',
    onNudgeReceived: handleNudgeReceived,
  })
  const { getStatus } = usePresenceStore()

  const [input, setInput] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'end' | 'leave' | 'kick'; memberId?: string; memberName?: string } | null>(null)

  const handleSendNudge = () => {
    if (nudgeCooldown) return
    sendNudge()
    setNudgeMsg(`~ You sent a nudge ~`)
    setTimeout(() => setNudgeMsg(null), 4000)
    setNudgeCooldown(true)
    setTimeout(() => setNudgeCooldown(false), 10000)
  }
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    if (!group) fetchGroups()
  }, [group, fetchGroups])

  // Redirect if group session was ended by the creator
  useEffect(() => {
    if (groupId && groups.length > 0 && !groups.find((g) => g.id === groupId)) {
      navigate('/groups')
    }
  }, [groupId, groups, navigate])

  useEffect(() => {
    if (groupId) markRead(groupId)
  }, [groupId, markRead])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [groupId])

  // Smart auto-scroll: only when near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.user_id !== profile?.id) {
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

  const handleCopyCode = () => {
    if (!group) return
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    if (!groupId) return
    await leaveGroup(groupId)
    navigate('/groups')
  }

  const handleEndSession = async () => {
    if (!groupId) return
    await endGroupSession(groupId)
    navigate('/groups')
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'end') handleEndSession()
    else if (confirmAction.type === 'leave') handleLeave()
    else if (confirmAction.type === 'kick' && confirmAction.memberId) kickMember(groupId!, confirmAction.memberId)
    setConfirmAction(null)
  }

  const isCreator = group?.creator_id === profile?.id
  const onlineMembers = group?.members.filter((m) => getStatus(m.user_id) !== 'offline') || []
  const onlineCount = onlineMembers.length

  if (!groupId) return null

  return (
    <div className="flex-1 flex">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Title bar — IM window chrome */}
        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-700/50 flex items-center gap-3">
          <button
            onClick={() => navigate('/groups')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate text-sm">{group?.name || 'Loading...'}</h2>
            <p className="text-zinc-500 text-xs">
              {onlineCount} online
              {typingUsers.length > 0 && (
                <span className="text-blue-400 ml-2">
                  {typingUsers.join(', ')} typing...
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2 rounded-lg transition-colors md:hidden ${
              showMembers
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className={`relative flex-1 overflow-hidden ${nudgeShake ? 'nudge-shake' : ''}`}>
          <div ref={scrollContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto p-4 space-y-1">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <p className="text-zinc-600 text-sm">No messages yet. Say something!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.user_id === profile?.id
              const prev = i > 0 ? messages[i - 1] : null
              const isGrouped = prev?.user_id === msg.user_id &&
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
                    {!isGrouped && (
                      <p className={`text-xs mb-1 font-mono-nostalgic ${isOwn ? 'text-blue-400/60' : 'text-zinc-500'}`}>
                        {msg.display_name}
                        <span className="text-zinc-700 ml-2">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    )}
                    <div
                      className={`inline-block px-3 py-2 rounded-2xl text-sm break-words border ${
                        isOwn
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-100 rounded-br-md'
                          : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-200 rounded-bl-md'
                      }`}
                    >
                      {linkifyText(msg.text)}
                    </div>
                  </div>
                </div>
              )
            })}
            {nudgeMsg && (
              <div className="text-center py-2">
                <span className="text-zinc-500 text-xs italic font-mono-nostalgic">{nudgeMsg}</span>
              </div>
            )}
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
        <div className="px-4 py-1.5 bg-zinc-900/50 border-t border-zinc-800/50">
          <p className="text-zinc-600 text-[10px] text-center font-mono-nostalgic">
            Messages are ephemeral — only the last 50 are shown
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-zinc-900 border-t border-zinc-700/50">
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
              type="button"
              onClick={handleSendNudge}
              disabled={nudgeCooldown}
              title={nudgeCooldown ? 'Nudge on cooldown' : 'Send a nudge'}
              className="p-2.5 text-zinc-400 hover:text-amber-400 rounded-xl border border-zinc-700 hover:border-amber-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Hand className="w-4 h-4" />
            </button>
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

      {/* Members sidebar — collapsed rail on desktop when hidden */}
      <div className={`hidden md:flex border-l border-zinc-800 flex-col bg-zinc-900 transition-all duration-200 ${showMembers ? 'w-64' : 'w-12'}`}>
        {!showMembers ? (
          <div className="flex flex-col items-center gap-2 pt-4">
            <Users className="w-4 h-4 text-zinc-400" />
            <button onClick={() => setShowMembers(true)} className="p-1 text-zinc-500 hover:text-white transition-colors" title="Show members">
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm">Members</h3>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {group?.members.length || 0} total · {onlineCount} online
                </p>
              </div>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
                title="Collapse"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
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
              const memberStatus = getStatus(member.user_id)
              const isOnline = memberStatus !== 'offline'
              const isMemberCreator = member.role === 'creator'
              const canKick = isCreator && member.user_id !== profile?.id

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 group"
                >
                  <div className="relative">
                    <AvatarIcon avatarUrl={member.profile?.avatar_url || null} displayName={member.profile?.display_name || ''} size="sm" />
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
                      onClick={() => setConfirmAction({ type: 'kick', memberId: member.user_id, memberName: member.profile?.display_name || 'this member' })}
                      className="md:opacity-0 md:group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
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
                onClick={() => setConfirmAction({ type: 'end' })}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-2 py-1.5 w-full rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                End Session
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction({ type: 'leave' })}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 text-sm px-2 py-1.5 w-full rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            )}
          </div>
          </>
        )}
      </div>

      {/* Mobile members overlay */}
      {showMembers && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMembers(false)} />
      )}
      {showMembers && (
        <div className="md:hidden fixed inset-y-0 right-0 z-50 w-72 border-l border-zinc-800 flex flex-col bg-zinc-900">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-white font-semibold text-sm">Members</h3>
            <p className="text-zinc-500 text-xs mt-0.5">
              {group?.members.length || 0} total · {onlineCount} online
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {group?.members.map((member) => {
              const isOnline = getStatus(member.user_id) !== 'offline'
              const isMemberCreator = member.role === 'creator'
              const canKick = isCreator && member.user_id !== profile?.id
              return (
                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 group">
                  <div className="relative">
                    <AvatarIcon avatarUrl={member.profile?.avatar_url || null} displayName={member.profile?.display_name || ''} size="sm" />
                    <Circle className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${isOnline ? 'text-green-500 fill-green-500' : 'text-zinc-600 fill-zinc-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm truncate ${isOnline ? 'text-white' : 'text-zinc-500'}`}>{member.profile?.display_name}</span>
                      {isMemberCreator && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                  </div>
                  {canKick && (
                    <button onClick={() => setConfirmAction({ type: 'kick', memberId: member.user_id, memberName: member.profile?.display_name || 'this member' })} className="md:opacity-0 md:group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all" title="Remove member">
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile invite code */}
          <div className="p-3 border-t border-zinc-800">
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

          {/* Mobile actions */}
          <div className="p-3 border-t border-zinc-800 space-y-1">
            {isCreator ? (
              <button
                onClick={() => setConfirmAction({ type: 'end' })}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-2 py-1.5 w-full rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                End Session
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction({ type: 'leave' })}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 text-sm px-2 py-1.5 w-full rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === 'end' ? 'End session?' :
          confirmAction?.type === 'leave' ? 'Leave group?' :
          `Remove ${confirmAction?.memberName}?`
        }
        description={
          confirmAction?.type === 'end' ? 'All messages will be deleted and the group will close for everyone.' :
          confirmAction?.type === 'leave' ? 'You can rejoin later with the invite code.' :
          'They can rejoin with the invite code.'
        }
        confirmLabel={
          confirmAction?.type === 'end' ? 'End Session' :
          confirmAction?.type === 'leave' ? 'Leave' :
          'Remove'
        }
        variant="danger"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
