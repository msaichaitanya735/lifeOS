'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-yellow-600 px-4 py-2 text-xs font-medium text-white"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <WifiOff size={13} aria-hidden="true" />
      You&apos;re offline — showing cached data
    </div>
  )
}
