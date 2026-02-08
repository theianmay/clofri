import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFriendStore } from '../stores/friendStore'
import { usePresenceStore, type UserStatus } from '../stores/presenceStore'
import { useCategoryStore, type FriendCategory } from '../stores/categoryStore'
import { useDMStore } from '../stores/dmStore'
import type { Profile, Friendship } from '../types/database'
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
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react'
import { AvatarIcon } from './AvatarIcon'

function FriendCard({
  friendship,
  friend,
  status,
  isOffline,
  tagMenuOpen,
  setTagMenuOpen,
  categories,
  assignFriend,
  handleStartDM,
  handleRemove,
}: {
  friendship: Friendship
  friend: Profile
  status: UserStatus
  isOffline: boolean
  tagMenuOpen: string | null
  setTagMenuOpen: (id: string | null) => void
  categories: FriendCategory[]
  assignFriend: (friendshipId: string, categoryId: string | null) => void
  handleStartDM: (friendId: string) => void
  handleRemove: (friendshipId: string) => void
}) {
  const statusColor = status === 'active' ? 'bg-green-500' : status === 'idle' ? 'bg-amber-400' : 'bg-zinc-600'
  const statusText = status === 'active' ? 'Active' : status === 'idle' ? 'Idle' : 'Offline'
  const statusTextColor = status === 'active' ? 'text-green-400/70' : status === 'idle' ? 'text-amber-400/70' : 'text-zinc-600'

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border group ${
        isOffline
          ? 'bg-zinc-900/50 border-zinc-800/50'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="relative">
        <AvatarIcon
          avatarUrl={friend.avatar_url}
          displayName={friend.display_name}
          className={isOffline ? 'opacity-50' : undefined}
        />
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusColor} rounded-full border-2 border-zinc-900`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOffline ? 'text-zinc-400' : 'text-white'}`}>
          {friend.display_name}
        </p>
        <p className={`text-xs ${statusTextColor}`}>{statusText}</p>
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
}

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
  const startSession = useDMStore((s) => s.startSession)
  const navigate = useNavigate()

  const [showAdd, setShowAdd] = useState(false)
  const [friendCode, setFriendCode] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [tagMenuOpen, setTagMenuOpen] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // Sort helper: active first, then idle, then offline
  const statusOrder = (friendId: string) => {
    const s = getStatus(friendId)
    return s === 'active' ? 0 : s === 'idle' ? 1 : 2
  }

  // Group friends by category, sorted by online status within each group
  const { categoryGroups, uncategorized, totalActive, totalIdle } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const filtered = query
      ? friends.filter((f) => f.friend.display_name.toLowerCase().includes(query))
      : friends

    const grouped = new Map<string, typeof friends>()
    const uncat: typeof friends = []

    for (const f of filtered) {
      const catId = assignments[f.friendship.id]
      if (catId && categories.some((c) => c.id === catId)) {
        if (!grouped.has(catId)) grouped.set(catId, [])
        grouped.get(catId)!.push(f)
      } else {
        uncat.push(f)
      }
    }

    // Sort each group by status
    const sortByStatus = (a: typeof friends[0], b: typeof friends[0]) =>
      statusOrder(a.friend.id) - statusOrder(b.friend.id)

    const catGroups = categories
      .map((cat) => ({
        category: cat,
        friends: (grouped.get(cat.id) || []).sort(sortByStatus),
      }))
      .filter((g) => g.friends.length > 0)

    let active = 0, idle = 0
    for (const f of filtered) {
      const s = getStatus(f.friend.id)
      if (s === 'active') active++
      else if (s === 'idle') idle++
    }

    return {
      categoryGroups: catGroups,
      uncategorized: uncat.sort(sortByStatus),
      totalActive: active,
      totalIdle: idle,
    }
  }, [friends, assignments, categories, onlineUsers, searchQuery])

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
    const sessionId = await startSession(friendId)
    if (sessionId) navigate(`/dm/${sessionId}`)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Friends</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {totalActive > 0 && (
                <span className="text-green-400">{totalActive} active</span>
              )}
              {totalActive > 0 && totalIdle > 0 && ' · '}
              {totalIdle > 0 && (
                <span className="text-amber-400">{totalIdle} idle</span>
              )}
              {(totalActive > 0 || totalIdle > 0) && ' · '}
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

      {/* Category management bar */}
      {friends.length > 0 && (
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-0.5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-400 flex items-center gap-1.5`}>
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                {cat.name}
              </span>
              <button
                onClick={() => removeCategory(cat.id)}
                className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                title="Delete category"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
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

      {/* Search */}
      {friends.length > 3 && (
        <div className="px-6 py-2 border-b border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800/50 text-white placeholder-zinc-500 pl-9 pr-3 py-2 rounded-lg border border-zinc-700/50 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

            {/* Category sections */}
            {categoryGroups.map(({ category, friends: catFriends }) => {
              const isCollapsed = collapsedSections.has(category.id)
              const activeCount = catFriends.filter((f) => getStatus(f.friend.id) === 'active').length
              const idleCount = catFriends.filter((f) => getStatus(f.friend.id) === 'idle').length
              return (
                <section key={category.id}>
                  <button
                    onClick={() => toggleSection(category.id)}
                    className="w-full flex items-center gap-2 mb-2 px-1 group/header"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className={`w-2.5 h-2.5 rounded-full ${category.color}`} />
                    <span className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                      {category.name}
                    </span>
                    <span className="text-zinc-600 text-xs">
                      {catFriends.length}
                      {activeCount > 0 && <span className="text-green-400 ml-1">· {activeCount} on</span>}
                      {idleCount > 0 && <span className="text-amber-400 ml-1">· {idleCount} idle</span>}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1">
                      {catFriends.map(({ friendship, friend }) => {
                        const status = getStatus(friend.id)
                        const isOffline = status === 'offline'
                        return (
                          <FriendCard
                            key={friendship.id}
                            friendship={friendship}
                            friend={friend}
                            status={status}
                            isOffline={isOffline}
                            tagMenuOpen={tagMenuOpen}
                            setTagMenuOpen={setTagMenuOpen}
                            categories={categories}
                            assignFriend={assignFriend}
                            handleStartDM={handleStartDM}
                            handleRemove={handleRemove}
                          />
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}

            {/* Uncategorized section */}
            {uncategorized.length > 0 && (
              <section>
                <button
                  onClick={() => toggleSection('__uncategorized')}
                  className="w-full flex items-center gap-2 mb-2 px-1"
                >
                  {collapsedSections.has('__uncategorized') ? (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                  <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    {categoryGroups.length > 0 ? 'Uncategorized' : 'Friends'}
                  </span>
                  <span className="text-zinc-600 text-xs">{uncategorized.length}</span>
                </button>
                {!collapsedSections.has('__uncategorized') && (
                  <div className="space-y-1">
                    {uncategorized.map(({ friendship, friend }) => {
                      const status = getStatus(friend.id)
                      const isOffline = status === 'offline'
                      return (
                        <FriendCard
                          key={friendship.id}
                          friendship={friendship}
                          friend={friend}
                          status={status}
                          isOffline={isOffline}
                          tagMenuOpen={tagMenuOpen}
                          setTagMenuOpen={setTagMenuOpen}
                          categories={categories}
                          assignFriend={assignFriend}
                          handleStartDM={handleStartDM}
                          handleRemove={handleRemove}
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Empty state */}
            {friends.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No friends yet</p>
                <p className="text-zinc-600 text-xs mt-1">
                  Share your friend code or add someone by theirs
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
