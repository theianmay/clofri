import { useState, useEffect, useRef } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export function ConnectionBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false)
      wasOfflineRef.current = true
    }

    const handleOnline = () => {
      setOnline(true)
      if (wasOfflineRef.current) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 3000)
        wasOfflineRef.current = false
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!online) {
    return (
      <div className="bg-red-600/90 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>You're offline</span>
      </div>
    )
  }

  if (showReconnected) {
    return (
      <div className="bg-green-600/90 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <Wifi className="w-4 h-4" />
        <span>Back online</span>
      </div>
    )
  }

  return null
}
