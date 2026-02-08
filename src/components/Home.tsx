import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroupStore } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { Plus, ArrowRight, Users, Loader2, Hash, MessageCircle } from 'lucide-react'

export function Home() {
  const { groups, loading, unreadGroups, fetchGroups, createGroup, joinGroupByCode } = useGroupStore()
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setActionLoading(true)
    setError(null)
    const group = await createGroup(newGroupName.trim())
    setActionLoading(false)
    if (group) {
      setShowCreate(false)
      setNewGroupName('')
      navigate(`/group/${group.id}`)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setActionLoading(true)
    setError(null)
    const result = await joinGroupByCode(joinCode.trim())
    setActionLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (result.groupId) {
      setShowJoin(false)
      setJoinCode('')
      navigate(`/group/${result.groupId}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Your Groups</h1>
            <p className="text-zinc-500 text-sm mt-1">See who's around</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <Hash className="w-4 h-4" />
              Join
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Group
            </button>
          </div>
        </div>

        {/* Create group form */}
        <div className={`expand-section ${showCreate ? 'open' : ''}`}>
          <div>
            <form onSubmit={handleCreate} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
                maxLength={50}
                className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 px-3 py-2 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={actionLoading || !newGroupName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 text-zinc-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>

        {/* Join group form */}
        <div className={`expand-section ${showJoin ? 'open' : ''}`}>
          <div>
            <form onSubmit={handleJoin} className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter invite code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  autoFocus
                  maxLength={10}
                  className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 px-3 py-2 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm font-mono tracking-wider"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !joinCode.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="px-3 py-2 text-zinc-400 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </form>
          </div>
        </div>
      </div>

      {/* Group list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No groups yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Create a group or join one with an invite code
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <Hash className="w-4 h-4" />
                Join
              </button>
              <button
                onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Group
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const memberCount = group.members.length
              const isCreator = group.creator_id === profile?.id
              const hasUnread = unreadGroups.has(group.id)

              return (
                <button
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className={`w-full flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border transition-colors text-left group ${
                    hasUnread ? 'border-blue-500/40' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                      <MessageCircle className="w-[18px] h-[18px]" />
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-zinc-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${hasUnread ? 'text-white' : 'text-zinc-300'}`}>{group.name}</p>
                      {isCreator && (
                        <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
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

