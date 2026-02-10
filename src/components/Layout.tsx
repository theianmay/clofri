import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { MessageCircle, Users, LogOut, Copy, Check, Pencil, Menu, X, ChevronsLeft, ChevronsRight, Volume2, VolumeX, Mail, Share2, MessageSquareQuote, Reply } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ConnectionBanner } from './ConnectionBanner'
import { usePresenceStore } from '../stores/presenceStore'
import { AvatarIcon } from './AvatarIcon'
import { AvatarPicker } from './AvatarPicker'
import { isSoundEnabled, setSoundEnabled } from '../lib/sounds'
import { useDMStore } from '../stores/dmStore'
import { useGroupStore } from '../stores/groupStore'

export function Layout() {
  const { profile, signOut, updateProfile } = useAuthStore()
  const { join: joinPresence, leave: leavePresence, getStatus, statusMessage, autoReply, setStatusMessage, setAutoReply } = usePresenceStore()

  useEffect(() => {
    if (profile) {
      joinPresence(profile)
    }
    return () => leavePresence()
  }, [profile?.id])

  const [copied, setCopied] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('clofri-sidebar') === 'collapsed')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [editingStatus, setEditingStatus] = useState(false)
  const [statusInput, setStatusInput] = useState('')
  const statusInputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Dynamic page title
  useEffect(() => {
    const path = location.pathname
    let page = 'clofri'
    if (path === '/') page = 'clofri · Friends'
    else if (path === '/messages') page = 'clofri · Messages'
    else if (path.startsWith('/dm/')) page = 'clofri · DM'
    else if (path === '/groups') page = 'clofri · Groups'
    else if (path.startsWith('/group/')) page = 'clofri · Group Chat'
    document.title = page
  }, [location.pathname])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  useEffect(() => {
    if (editingStatus && statusInputRef.current) {
      statusInputRef.current.focus()
    }
  }, [editingStatus])

  const startEditingStatus = () => {
    setStatusInput(statusMessage || '')
    setEditingStatus(true)
  }

  const saveStatus = () => {
    setEditingStatus(false)
    setStatusMessage(statusInput.trim() || null)
  }

  const handleStatusKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveStatus() }
    if (e.key === 'Escape') setEditingStatus(false)
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('clofri-sidebar', next ? 'collapsed' : 'expanded')
  }

  const startEditingName = () => {
    setNameInput(profile?.display_name || '')
    setEditingName(true)
  }

  const saveName = async () => {
    if (!editingName) return
    setEditingName(false)
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== profile?.display_name) {
      await updateProfile({ display_name: trimmed })
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveName() }
    if (e.key === 'Escape') setEditingName(false)
  }

  const copyFriendCode = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.friend_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [shareCopied, setShareCopied] = useState(false)
  const copyShareLink = () => {
    if (!profile) return
    const url = window.location.origin
    const text = `Join me on clofri! ${url}\nMy friend code: ${profile.friend_code}`
    navigator.clipboard.writeText(text)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  const handleAvatarSelect = async (avatarUrl: string) => {
    await updateProfile({ avatar_url: avatarUrl })
  }

  const presenceStatus = profile ? getStatus(profile.id) : 'offline'
  const statusColor = presenceStatus === 'active' ? 'bg-green-500' : presenceStatus === 'idle' ? 'bg-amber-400' : 'bg-zinc-600'

  const unreadDMCount = useDMStore((s) => s.unreadDMs.size)
  const unreadGroupCount = useGroupStore((s) => s.unreadGroups.size)

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Mobile: hamburger + slide-out sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile slide-out */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">cf</span>
              </div>
              <span className="text-white font-semibold text-lg">clofri</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <Users className="w-4 h-4" />
            Friends
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <div className="relative">
              <Mail className="w-4 h-4" />
              {unreadDMCount > 0 && <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            Messages
          </NavLink>
          <NavLink to="/groups" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            <div className="relative">
              <MessageCircle className="w-4 h-4" />
              {unreadGroupCount > 0 && <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            Groups
          </NavLink>
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <div className="px-2 mb-3 space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAvatarPicker(true)} className="relative shrink-0" title="Change avatar">
                <AvatarIcon avatarUrl={profile?.avatar_url || null} displayName={profile?.display_name || ''} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColor} rounded-full border-2 border-zinc-900`} aria-label={presenceStatus === 'active' ? 'Online' : presenceStatus === 'idle' ? 'Idle' : 'Offline'} />
              </button>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={nameInputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={handleNameKeyDown}
                      className="flex-1 min-w-0 bg-zinc-800 text-white text-sm font-medium px-1.5 py-0.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                      maxLength={30}
                    />
                    <button
                      onPointerDown={(e) => { e.preventDefault(); saveName() }}
                      className="p-1.5 text-green-400 hover:text-green-300 transition-colors shrink-0"
                      title="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditingName}
                    className="flex items-center gap-1 text-white text-sm font-medium truncate hover:text-zinc-300 transition-colors group/name"
                  >
                    <span className="truncate">{profile?.display_name}</span>
                    <Pencil className="w-3 h-3 text-zinc-600 group-hover/name:text-zinc-400 shrink-0" />
                  </button>
                )}
              </div>
            </div>
            {/* Status message */}
            {editingStatus ? (
              <div className="flex items-center gap-1">
                <MessageSquareQuote className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  ref={statusInputRef}
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  onBlur={saveStatus}
                  onKeyDown={handleStatusKeyDown}
                  placeholder="Set a status..."
                  className="flex-1 min-w-0 bg-zinc-800 text-zinc-300 text-xs italic px-1.5 py-0.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                  maxLength={150}
                />
                <button
                  onPointerDown={(e) => { e.preventDefault(); saveStatus() }}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors shrink-0"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditingStatus}
                className="flex items-center gap-1.5 text-zinc-500 text-xs italic hover:text-zinc-400 transition-colors truncate"
              >
                <MessageSquareQuote className="w-3 h-3 shrink-0" />
                <span className="truncate">{statusMessage || 'Set a status...'}</span>
              </button>
            )}
            {/* Auto-reply toggle */}
            <button
              onClick={() => setAutoReply(!autoReply)}
              className={`flex items-center gap-1.5 text-xs px-1 py-0.5 rounded transition-colors ${autoReply ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}
              title={autoReply ? 'Auto-reply is on — your status will be sent as a reply when you\'re away' : 'Enable auto-reply when away'}
            >
              <Reply className="w-3 h-3" />
              Auto-reply {autoReply ? 'on' : 'off'}
            </button>
          </div>
          <div className="space-y-0.5">
            <button
              onClick={copyFriendCode}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="font-mono-nostalgic">{profile?.friend_code}</span>
                </>
              )}
            </button>
            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
              title="Copy invite link + friend code"
            >
              {shareCopied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              {shareCopied ? 'Copied!' : 'Share invite'}
            </button>
            <button
              onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next) }}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundOn ? 'Sounds on' : 'Sounds off'}
            </button>
            <button onClick={signOut} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-200 ease-in-out ${collapsed ? 'w-14' : 'w-64'}`}>
        {/* Header */}
        <div className={`border-b border-zinc-800 flex items-center ${collapsed ? 'p-3 justify-center' : 'p-4 justify-between'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">cf</span>
              </div>
              <button onClick={toggleCollapsed} className="p-1 text-zinc-500 hover:text-white transition-colors" title="Expand sidebar">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">cf</span>
                </div>
                <span className="text-white font-semibold text-lg">clofri</span>
              </div>
              <button onClick={toggleCollapsed} className="p-1 text-zinc-500 hover:text-white transition-colors" title="Collapse sidebar">
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 space-y-1 ${collapsed ? 'p-2' : 'p-3'}`}>
          <NavLink
            to="/"
            end
            title="Friends"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
              } text-sm font-medium ${
                isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }
          >
            <Users className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Friends</span>}
          </NavLink>
          <NavLink
            to="/messages"
            title="Messages"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
              } text-sm font-medium ${
                isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }
          >
            <div className="relative shrink-0">
              <Mail className="w-4 h-4" />
              {unreadDMCount > 0 && <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            {!collapsed && <span>Messages</span>}
          </NavLink>
          <NavLink
            to="/groups"
            title="Groups"
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-colors ${
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
              } text-sm font-medium ${
                isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }
          >
            <div className="relative shrink-0">
              <MessageCircle className="w-4 h-4" />
              {unreadGroupCount > 0 && <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            {!collapsed && <span>Groups</span>}
          </NavLink>
        </nav>

        {/* User section */}
        <div className={`border-t border-zinc-800 ${collapsed ? 'p-2' : 'p-3'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setShowAvatarPicker(true)} className="relative" title={profile?.display_name}>
                <AvatarIcon avatarUrl={profile?.avatar_url || null} displayName={profile?.display_name || ''} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColor} rounded-full border-2 border-zinc-900`} aria-label={presenceStatus === 'active' ? 'Online' : presenceStatus === 'idle' ? 'Idle' : 'Offline'} />
              </button>
              <button
                onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next) }}
                className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button onClick={signOut} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="px-2 mb-3 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAvatarPicker(true)}
                    className="relative group/avatar shrink-0"
                    title="Change avatar"
                  >
                    <AvatarIcon avatarUrl={profile?.avatar_url || null} displayName={profile?.display_name || ''} size="sm" />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColor} rounded-full border-2 border-zinc-900`} aria-label={presenceStatus === 'active' ? 'Online' : presenceStatus === 'idle' ? 'Idle' : 'Offline'} />
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                      <Pencil className="w-3 h-3 text-white" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={nameInputRef}
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onBlur={saveName}
                          onKeyDown={handleNameKeyDown}
                          className="flex-1 min-w-0 bg-zinc-800 text-white text-sm font-medium px-1.5 py-0.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                          maxLength={30}
                        />
                        <button
                          onPointerDown={(e) => { e.preventDefault(); saveName() }}
                          className="p-1.5 text-green-400 hover:text-green-300 transition-colors shrink-0"
                          title="Save name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startEditingName}
                        className="flex items-center gap-1 text-white text-sm font-medium truncate hover:text-zinc-300 transition-colors group/name"
                      >
                        <span className="truncate">{profile?.display_name}</span>
                        <Pencil className="w-3 h-3 text-zinc-600 group-hover/name:text-zinc-400 shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Status message */}
                {editingStatus ? (
                  <div className="flex items-center gap-1">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <input
                      ref={statusInputRef}
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value)}
                      onBlur={saveStatus}
                      onKeyDown={handleStatusKeyDown}
                      placeholder="Set a status..."
                      className="flex-1 min-w-0 bg-zinc-800 text-zinc-300 text-xs italic px-1.5 py-0.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                      maxLength={150}
                    />
                    <button
                      onPointerDown={(e) => { e.preventDefault(); saveStatus() }}
                      className="p-1 text-green-400 hover:text-green-300 transition-colors shrink-0"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditingStatus}
                    className="flex items-center gap-1.5 text-zinc-500 text-xs italic hover:text-zinc-400 transition-colors truncate"
                  >
                    <MessageSquareQuote className="w-3 h-3 shrink-0" />
                    <span className="truncate">{statusMessage || 'Set a status...'}</span>
                  </button>
                )}
                {/* Auto-reply toggle */}
                <button
                  onClick={() => setAutoReply(!autoReply)}
                  className={`flex items-center gap-1.5 text-xs px-1 py-0.5 rounded transition-colors ${autoReply ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                  title={autoReply ? 'Auto-reply is on — your status will be sent as a reply when you\'re away' : 'Enable auto-reply when away'}
                >
                  <Reply className="w-3 h-3" />
                  Auto-reply {autoReply ? 'on' : 'off'}
                </button>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={copyFriendCode}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="font-mono-nostalgic">{profile?.friend_code}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
                  title="Copy invite link + friend code"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                  {shareCopied ? 'Copied!' : 'Share invite'}
                </button>
                <button
                  onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next) }}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
                >
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {soundOn ? 'Sounds on' : 'Sounds off'}
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-dvh md:h-screen overflow-hidden">
        <div className="md:hidden h-12" />
        <ConnectionBanner />
        <Outlet />
      </main>

      {/* Avatar picker modal */}
      {showAvatarPicker && profile && (
        <AvatarPicker
          currentAvatarUrl={profile.avatar_url}
          displayName={profile.display_name}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  )
}
