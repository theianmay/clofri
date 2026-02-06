import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { MessageCircle, Mail, Loader2 } from 'lucide-react'

export function Login() {
  const { signInWithMagicLink } = useAuthStore()
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const result = await signInWithMagicLink(email.trim())
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setMagicLinkSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">clofri</h1>
          <p className="text-zinc-400 mt-2">chat with your close friends</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <Mail className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-white font-medium">Check your email</p>
              <p className="text-zinc-400 text-sm mt-1">
                We sent a login link to <span className="text-white">{email}</span>
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-blue-400 text-sm mt-4 hover:text-blue-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleMagicLink}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none transition-colors"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full mt-3 bg-blue-600 text-white font-medium py-2.5 px-4 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send magic link
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-zinc-600 text-xs text-center mt-6">
          Messages are ephemeral. If you're not here, you miss it.
        </p>
      </div>
    </div>
  )
}
