import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { WifiOff, Wifi } from 'lucide-react'

export function ConnectionBanner() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const channel = supabase.channel('connection-monitor')

    channel
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          if (status === 'disconnected' || status === 'reconnecting') {
            setShowReconnected(true)
            setTimeout(() => setShowReconnected(false), 3000)
          }
          setStatus('connected')
        } else if (state === 'CHANNEL_ERROR') {
          setStatus('disconnected')
        } else if (state === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    const handleOnline = () => {
      if (status === 'disconnected') setStatus('reconnecting')
    }
    const handleOffline = () => setStatus('disconnected')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (!navigator.onLine) setStatus('disconnected')

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (status === 'disconnected') {
    return (
      <div className="bg-red-600/90 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>Connection lost. Checking...</span>
      </div>
    )
  }

  if (status === 'reconnecting') {
    return (
      <div className="bg-amber-600/90 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4 animate-pulse" />
        <span>Reconnecting...</span>
      </div>
    )
  }

  if (showReconnected) {
    return (
      <div className="bg-green-600/90 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <Wifi className="w-4 h-4" />
        <span>Reconnected</span>
      </div>
    )
  }

  return null
}
