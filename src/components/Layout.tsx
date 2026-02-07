import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { MessageCircle, Users, LogOut, Copy, Check, Pencil, Menu, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ConnectionBanner } from './ConnectionBanner'

export function Layout() {
  const { profile, signOut, updateProfile } = useAuthStore()
  const [copied, setCopied] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  const startEditingName = () => {
    setNameInput(profile?.display_name || '')
    setEditingName(true)
  }

  const saveName = async () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== profile?.display_name) {
      await updateProfile({ display_name: trimmed })
    }
    setEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditingName(false)
  }

  const copyFriendCode = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.friend_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">clofri</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }
          >
            <Users className="w-4 h-4" />
            Friends
          </NavLink>
          <NavLink
            to="/groups"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`
            }
          >
            <MessageCircle className="w-4 h-4" />
            Groups
          </NavLink>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-2 mb-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-medium">
                {profile?.display_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={handleNameKeyDown}
                  className="w-full bg-zinc-800 text-white text-sm font-medium px-1.5 py-0.5 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                  maxLength={30}
                />
              ) : (
                <button
                  onClick={startEditingName}
                  className="flex items-center gap-1 text-white text-sm font-medium truncate hover:text-zinc-300 transition-colors group/name"
                >
                  <span className="truncate">{profile?.display_name}</span>
                  <Pencil className="w-3 h-3 text-zinc-600 group-hover/name:text-zinc-400 shrink-0" />
                </button>
              )}
              <button
                onClick={copyFriendCode}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{profile?.friend_code}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-2 py-1 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col md:ml-0 ml-0">
        <div className="md:hidden h-12" />{/* spacer for mobile hamburger */}
        <ConnectionBanner />
        <Outlet />
      </main>
    </div>
  )
}
