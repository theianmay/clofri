import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { MessageCircle, Users, LogOut, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function Layout() {
  const { profile, signOut } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const copyFriendCode = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.friend_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">clofri</span>
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
            <MessageCircle className="w-4 h-4" />
            Groups
          </NavLink>
          <NavLink
            to="/friends"
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
              <p className="text-white text-sm font-medium truncate">
                {profile?.display_name}
              </p>
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
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
