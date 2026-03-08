'use client'

import { useEffect, useRef, useState } from 'react'

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const deferredPromptRef = useRef<Event | null>(null)

  useEffect(() => {
    // Already installed in standalone mode — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // User already dismissed
    if (localStorage.getItem('install-banner-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

    if (!ios) {
      // Android: reveal banner inside the event callback (satisfies lint rule)
      const handler = (e: Event) => {
        e.preventDefault()
        deferredPromptRef.current = e
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    } else {
      // iOS: no native prompt — schedule reveal asynchronously so setState
      // fires inside a callback, not synchronously in the effect body.
      const timer = setTimeout(() => setShow(true), 0)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('install-banner-dismissed', 'true')
    setShow(false)
  }

  const handleAndroidInstall = async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(prompt as any).prompt()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (prompt as any).userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('install-banner-dismissed', 'true')
    }
    setShow(false)
  }

  // Early return before accessing navigator — component only reaches here after
  // client-side mount (show is false during SSR, so null is returned safely).
  if (!show) return null

  // Safe to read navigator here: show only becomes true after useEffect runs client-side
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-green-700 p-3 text-white">
      {isIOS ? (
        <span className="text-sm">
          📱 Add to home screen: tap <strong>Share</strong> then{' '}
          <strong>Add to Home Screen</strong>
        </span>
      ) : (
        <button onClick={handleAndroidInstall} className="text-sm font-medium">
          📱 Install Nouri on your home screen
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="ml-3 text-lg text-white/80 hover:text-white"
        aria-label="Dismiss install banner"
      >
        ✕
      </button>
    </div>
  )
}
