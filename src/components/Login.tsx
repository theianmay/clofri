import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { MessageCircle, Mail, Loader2 } from 'lucide-react'

export function Login() {
  const { signInWithGoogle, signInWithMagicLink } = useAuthStore()
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">clofri</h1>
          <p className="text-zinc-400 mt-2">chat with your close friends</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <p className="text-white font-medium">Check your email</p>
              <p className="text-zinc-400 text-sm mt-1">
                We sent a login link to <span className="text-white">{email}</span>
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-indigo-400 text-sm mt-4 hover:text-indigo-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 font-medium py-2.5 px-4 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-zinc-700" />
                <span className="text-zinc-500 text-xs uppercase">or</span>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>

              <form onSubmit={handleMagicLink}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 text-white placeholder-zinc-500 px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full mt-3 bg-indigo-600 text-white font-medium py-2.5 px-4 rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
