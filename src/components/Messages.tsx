import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupStore, isDMGroup, getDMOtherUserId } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { usePresenceStore } from '../stores/presenceStore'
import { ArrowRight, Loader2, MessageCircle } from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'

export function Messages() {
  const { groups, loading, unreadGroups, fetchGroups } = useGroupStore()
  const profile = useAuthStore((s) => s.profile)
  const { getStatus } = usePresenceStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Filter to only DM groups
  const dmGroups = groups.filter((g) => isDMGroup(g.name))

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-semibold text-white">Messages</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Direct conversations with friends
        </p>
      </div>

      {/* DM list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : dmGroups.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No conversations yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Start a chat from the Friends page
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dmGroups.map((group) => {
              const hasUnread = unreadGroups.has(group.id)
              const dmFriendId = profile ? getDMOtherUserId(group.name, profile.id) : null
              const dmFriend = dmFriendId
                ? group.members.find((m) => m.user_id === dmFriendId)?.profile
                : null
              const displayName = dmFriend?.display_name || 'Unknown'
              const status = dmFriendId ? getStatus(dmFriendId) : 'offline'
              const statusColor =
                status === 'active' ? 'bg-green-500' :
                status === 'idle' ? 'bg-amber-400' : 'bg-zinc-600'

              return (
                <button
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className={`w-full flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border transition-colors text-left group ${
                    hasUnread ? 'border-blue-500/40' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="relative">
                    <AvatarIcon
                      avatarUrl={dmFriend?.avatar_url || null}
                      displayName={displayName}
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusColor} rounded-full border-2 border-zinc-900`} />
                    {hasUnread && (
                      <span className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-zinc-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${hasUnread ? 'text-white' : 'text-zinc-300'}`}>
                      {displayName}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      {status === 'active' ? 'Active now' : status === 'idle' ? 'Idle' : 'Offline'}
                    </p>
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
