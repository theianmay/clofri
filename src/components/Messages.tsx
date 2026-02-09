import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDMStore } from '../stores/dmStore'
import { usePresenceStore } from '../stores/presenceStore'
import { ArrowRight, Loader2, MessageCircle, Users } from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'

export function Messages() {
  const { sessions, loading, unreadDMs, fetchSessions } = useDMStore()
  const { getStatus, getStatusMessage } = usePresenceStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchSessions()
    // Poll for new DM sessions every 15 seconds
    const interval = setInterval(() => fetchSessions(), 15_000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-semibold text-white">Messages</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Active conversations with friends
        </p>
      </div>

      {/* DM list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No active conversations</p>
            <p className="text-zinc-600 text-sm mt-1">
              Start a chat from the Friends page
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              <Users className="w-4 h-4" />
              Go to Friends
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const hasUnread = unreadDMs.has(session.id)
              const status = getStatus(session.friendId)
              const statusColor =
                status === 'active' ? 'bg-green-500' :
                status === 'idle' ? 'bg-amber-400' : 'bg-zinc-600'

              return (
                <button
                  key={session.id}
                  onClick={() => navigate(`/dm/${session.id}`)}
                  className={`w-full flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border transition-colors text-left group ${
                    hasUnread ? 'border-blue-500/40' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="relative">
                    <AvatarIcon
                      avatarUrl={session.friend.avatar_url}
                      displayName={session.friend.display_name}
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusColor} rounded-full border-2 border-zinc-900`} />
                    {hasUnread && (
                      <span className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-zinc-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${hasUnread ? 'text-white' : 'text-zinc-300'}`}>
                      {session.friend.display_name}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      {status === 'active' ? 'Active now' : status === 'idle' ? 'Idle' : 'Offline'}
                    </p>
                    {getStatusMessage(session.friendId) && (
                      <p className="text-zinc-500 text-xs italic truncate">
                        "{getStatusMessage(session.friendId)}"
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
