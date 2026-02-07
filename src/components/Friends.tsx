import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFriendStore } from '../stores/friendStore'
import { usePresenceStore } from '../stores/presenceStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useGroupStore } from '../stores/groupStore'
import {
  UserPlus,
  Check,
  X,
  Loader2,
  UserMinus,
  Users,
  Clock,
  Send,
  Tag,
  Plus,
  MessageCircle,
} from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'

export function Friends() {
  const {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    fetchFriends,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriendStore()
  const { onlineUsers, getStatus } = usePresenceStore()

  const { categories, assignments, addCategory, removeCategory, assignFriend } = useCategoryStore()
  const getOrCreateDM = useGroupStore((s) => s.getOrCreateDM)
  const navigate = useNavigate()

  const [showAdd, setShowAdd] = useState(false)
  const [friendCode, setFriendCode] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [tagMenuOpen, setTagMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  // Filter by category, then split into active/idle/offline
  const filtered = useMemo(() => {
    if (!filterCategory) return friends
    return friends.filter((f) => assignments[f.friendship.id] === filterCategory)
  }, [friends, filterCategory, assignments])

  const { activeFriends, idleFriends, offlineFriends } = useMemo(() => {
    const active: typeof friends = []
    const idle: typeof friends = []
    const offline: typeof friends = []
    for (const f of filtered) {
      const status = getStatus(f.friend.id)
      if (status === 'active') active.push(f)
      else if (status === 'idle') idle.push(f)
      else offline.push(f)
    }
    return { activeFriends: active, idleFriends: idle, offlineFriends: offline }
  }, [filtered, onlineUsers])

  const handleAddCategory = () => {
    const name = newCategoryName.trim()
    if (!name) return
    addCategory(name)
    setNewCategoryName('')
    setShowNewCategory(false)
  }

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!friendCode.trim()) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    const result = await sendRequest(friendCode.trim())
    setActionLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Friend request sent!')
      setFriendCode('')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleAccept = async (id: string) => {
    await acceptRequest(id)
  }

  const handleReject = async (id: string) => {
    await rejectRequest(id)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this friend?')) return
    await removeFriend(id)
  }

  const handleStartDM = async (friendId: string) => {
    const groupId = await getOrCreateDM(friendId)
    if (groupId) navigate(`/group/${groupId}`)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Friends</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {activeFriends.length > 0 && (
                <span className="text-green-400">{activeFriends.length} active</span>
              )}
              {activeFriends.length > 0 && idleFriends.length > 0 && ' · '}
              {idleFriends.length > 0 && (
                <span className="text-amber-400">{idleFriends.length} idle</span>
              )}
              {(activeFriends.length > 0 || idleFriends.length > 0) && ' · '}
              {friends.length} total
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(!showAdd); setError(null); setSuccess(null) }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleSendRequest} className="mt-4">
            <p className="text-zinc-400 text-sm mb-2">
              Enter your friend's code to send them a request.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Friend code (e.g. A1B2C3)"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                autoFocus
                className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 px-3 py-2 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm font-mono tracking-wider"
              />
              <button
                type="submit"
                disabled={actionLoading || !friendCode.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            {success && <p className="text-green-400 text-sm mt-2">{success}</p>}
          </form>
        )}
      </div>

      {/* Category filter bar */}
      {friends.length > 0 && (
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              !filterCategory ? 'bg-zinc-700 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const count = friends.filter((f) => assignments[f.friendship.id] === cat.id).length
            return (
              <div key={cat.id} className="flex items-center gap-0.5">
                <button
                  onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    filterCategory === cat.id ? 'bg-zinc-700 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                  {cat.name}
                  {count > 0 && <span className="text-zinc-500">{count}</span>}
                </button>
                <button
                  onClick={() => { removeCategory(cat.id); if (filterCategory === cat.id) setFilterCategory(null) }}
                  className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Delete category"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
          {showNewCategory ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddCategory() }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Name..."
                autoFocus
                className="w-24 bg-zinc-800 text-white text-xs px-2 py-1 rounded-full border border-zinc-700 focus:border-blue-500 focus:outline-none"
                maxLength={20}
              />
              <button type="submit" className="p-1 text-green-400 hover:text-green-300">
                <Check className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName('') }} className="p-1 text-zinc-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewCategory(true)}
              className="px-2 py-1 rounded-full text-xs text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Pending received */}
            {pendingReceived.length > 0 && (
              <section>
                <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                  Pending Requests
                </h3>
                <div className="space-y-1">
                  {pendingReceived.map(({ friendship, friend }) => (
                    <div
                      key={friendship.id}
                      className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800"
                    >
                      <AvatarIcon avatarUrl={friend.avatar_url} displayName={friend.display_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {friend.display_name}
                        </p>
                        <p className="text-zinc-500 text-xs">wants to be friends</p>
                      </div>
                      <button
                        onClick={() => handleAccept(friendship.id)}
                        className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(friendship.id)}
                        className="p-2 text-zinc-500 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pending sent */}
            {pendingSent.length > 0 && (
              <section>
                <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                  Sent Requests
                </h3>
                <div className="space-y-1">
                  {pendingSent.map(({ friendship, friend }) => (
                    <div
                      key={friendship.id}
                      className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800"
                    >
                      <AvatarIcon avatarUrl={friend.avatar_url} displayName={friend.display_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {friend.display_name}
                        </p>
                        <p className="text-zinc-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Active friends */}
            {activeFriends.length > 0 && (
              <section>
                <h3 className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  Active — {activeFriends.length}
                </h3>
                <div className="space-y-1">
                  {activeFriends.map(({ friendship, friend }) => {
                    const cat = categories.find((c) => c.id === assignments[friendship.id])
                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800 group"
                      >
                        <div className="relative">
                          <AvatarIcon avatarUrl={friend.avatar_url} displayName={friend.display_name} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-white text-sm font-medium truncate">{friend.display_name}</p>
                            {cat && <span className={`w-1.5 h-1.5 rounded-full ${cat.color} shrink-0`} title={cat.name} />}
                          </div>
                          <p className="text-green-400/70 text-xs">Active</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setTagMenuOpen(tagMenuOpen === friendship.id ? null : friendship.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-all"
                            title="Set category"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          {tagMenuOpen === friendship.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg py-1 min-w-[120px] shadow-xl">
                              <button onClick={() => { assignFriend(friendship.id, null); setTagMenuOpen(null) }} className="w-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 text-left">None</button>
                              {categories.map((c) => (
                                <button key={c.id} onClick={() => { assignFriend(friendship.id, c.id); setTagMenuOpen(null) }} className="w-full px-3 py-1.5 text-xs text-white hover:bg-zinc-700 text-left flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${c.color}`} /> {c.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartDM(friend.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-blue-400 rounded-lg transition-all"
                          title="Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(friendship.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 rounded-lg transition-all"
                          title="Remove friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Idle friends */}
            {idleFriends.length > 0 && (
              <section>
                <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Idle — {idleFriends.length}
                </h3>
                <div className="space-y-1">
                  {idleFriends.map(({ friendship, friend }) => {
                    const cat = categories.find((c) => c.id === assignments[friendship.id])
                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 group"
                      >
                        <div className="relative">
                          <AvatarIcon avatarUrl={friend.avatar_url} displayName={friend.display_name} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-zinc-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-zinc-300 text-sm font-medium truncate">{friend.display_name}</p>
                            {cat && <span className={`w-1.5 h-1.5 rounded-full ${cat.color} shrink-0`} title={cat.name} />}
                          </div>
                          <p className="text-amber-400/70 text-xs">Idle</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setTagMenuOpen(tagMenuOpen === friendship.id ? null : friendship.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-all"
                            title="Set category"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          {tagMenuOpen === friendship.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg py-1 min-w-[120px] shadow-xl">
                              <button onClick={() => { assignFriend(friendship.id, null); setTagMenuOpen(null) }} className="w-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 text-left">None</button>
                              {categories.map((c) => (
                                <button key={c.id} onClick={() => { assignFriend(friendship.id, c.id); setTagMenuOpen(null) }} className="w-full px-3 py-1.5 text-xs text-white hover:bg-zinc-700 text-left flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${c.color}`} /> {c.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartDM(friend.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-blue-400 rounded-lg transition-all"
                          title="Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(friendship.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 rounded-lg transition-all"
                          title="Remove friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Offline friends */}
            <section>
              <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                {(activeFriends.length > 0 || idleFriends.length > 0) ? `Offline — ${offlineFriends.length}` : `Friends — ${friends.length}`}
              </h3>
              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No friends yet</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    Share your friend code or add someone by theirs
                  </p>
                </div>
              ) : offlineFriends.length === 0 ? (
                <p className="text-zinc-600 text-xs px-1">Everyone's here!</p>
              ) : (
                <div className="space-y-1">
                  {offlineFriends.map(({ friendship, friend }) => {
                    const cat = categories.find((c) => c.id === assignments[friendship.id])
                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 group"
                      >
                        <div className="relative">
                          <AvatarIcon avatarUrl={friend.avatar_url} displayName={friend.display_name} className="opacity-50" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-600 rounded-full border-2 border-zinc-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-zinc-400 text-sm font-medium truncate">{friend.display_name}</p>
                            {cat && <span className={`w-1.5 h-1.5 rounded-full ${cat.color} shrink-0`} title={cat.name} />}
                          </div>
                          <p className="text-zinc-600 text-xs">Offline</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setTagMenuOpen(tagMenuOpen === friendship.id ? null : friendship.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-all"
                            title="Set category"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          {tagMenuOpen === friendship.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg py-1 min-w-[120px] shadow-xl">
                              <button onClick={() => { assignFriend(friendship.id, null); setTagMenuOpen(null) }} className="w-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 text-left">None</button>
                              {categories.map((c) => (
                                <button key={c.id} onClick={() => { assignFriend(friendship.id, c.id); setTagMenuOpen(null) }} className="w-full px-3 py-1.5 text-xs text-white hover:bg-zinc-700 text-left flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${c.color}`} /> {c.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartDM(friend.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-blue-400 rounded-lg transition-all"
                          title="Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(friendship.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 rounded-lg transition-all"
                          title="Remove friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
