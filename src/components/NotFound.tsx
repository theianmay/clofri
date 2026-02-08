import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-6xl font-bold text-zinc-700 mb-2">404</p>
        <h2 className="text-white font-semibold text-lg mb-1">Page not found</h2>
        <p className="text-zinc-400 text-sm mb-6">
          This page doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Friends
        </button>
      </div>
    </div>
  )
}
