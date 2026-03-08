# Spec: C5 — PWA & Home Screen Installation

**Priority:** MEDIUM — cosmetic layer on top of working app; build last
**Phase:** 2
**Depends on:** None (additive — applies to the whole app)

---

## Goal

Make Nouri installable on iOS and Android home screens. When installed, it runs in standalone mode (no browser chrome) and looks like a native app. Show an in-app nudge to guide household members through the install flow. Cache static assets and last-known state for basic offline support.

---

## New Dependency

```bash
npm install next-pwa
```

No other new dependencies.

---

## Files Changed (≤6)

| File | Action | What changes |
|------|--------|--------------|
| `next.config.js` (or `.mjs`) | Modify | Wrap config with `withPWA()` |
| `public/manifest.json` | New | Web app manifest: name, icons, theme, `display: standalone` |
| `public/icons/` | New | App icon set (192×192 and 512×512 minimum; see icon notes below) |
| `src/app/layout.tsx` | Modify | Add `<link rel="manifest">` and `<meta name="theme-color">` to `<head>` |
| `src/components/pwa/install-banner.tsx` | New | Sticky install nudge banner (iOS instructions + Android prompt) |
| `src/app/(app)/page.tsx` | Modify | Mount `<InstallBanner />` at page root |

---

## Implementation

### 1. next.config.js — wrap with withPWA

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // ... existing Next.js config ...
})
```

`disable: process.env.NODE_ENV === 'development'` prevents service worker interference during local dev.

### 2. public/manifest.json

```json
{
  "name": "Nouri",
  "short_name": "Nouri",
  "description": "Family nutrition tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Icon notes:** Place `icon-192.png` and `icon-512.png` in `public/icons/`. Use the existing Nouri logo/mark if available, otherwise use a green (#16a34a) square with "N" as a placeholder until real assets exist.

### 3. layout.tsx — manifest link + theme color

```tsx
// In the <head> of src/app/layout.tsx:
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#16a34a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Nouri" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

The `apple-mobile-web-app-capable` meta is required for iOS standalone mode.

### 4. InstallBanner component

Show when:
- User is on a mobile device (check `navigator.userAgent` for mobile indicators)
- App is NOT already running in standalone mode (check `window.matchMedia('(display-mode: standalone)').matches`)
- User has not dismissed the banner (use `localStorage.setItem('install-banner-dismissed', 'true')`)

**iOS banner content:**
```
┌─────────────────────────────────────────────────────┐
│  📱 Add Nouri to your home screen                   │
│  Tap Share [↑] then "Add to Home Screen"      [✕]  │
└─────────────────────────────────────────────────────┘
```

**Android behavior:** Call `deferredPrompt.prompt()` (the native beforeinstallprompt event) instead of showing text instructions. Store the event in a ref when it fires on `window.beforeinstallprompt`.

```typescript
// src/components/pwa/install-banner.tsx
'use client'

import { useEffect, useState } from 'react'

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Already installed in standalone mode — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // User already dismissed
    if (localStorage.getItem('install-banner-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (!ios) {
      // Android: capture beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    } else {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('install-banner-dismissed', 'true')
    setShow(false)
  }

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('install-banner-dismissed', 'true')
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-green-700 text-white p-3 flex items-center justify-between z-50">
      {isIOS ? (
        <span className="text-sm">
          📱 Add to home screen: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
        </span>
      ) : (
        <button onClick={handleAndroidInstall} className="text-sm font-medium">
          📱 Install Nouri on your home screen
        </button>
      )}
      <button onClick={handleDismiss} className="ml-3 text-white/80 hover:text-white text-lg">✕</button>
    </div>
  )
}
```

### 5. Offline behavior

`next-pwa` caches static assets (JS bundles, CSS, images) automatically via the generated service worker. This provides:

- **App shell loads offline** — home screen, kid cards, and navigation render from cache
- **Last-known dashboard data** — if previously loaded, the cached API responses display

AI-powered routes (`/api/log/parse`, `/api/chat`) are **not** cached. If the device is offline and a user attempts to parse a meal or chat, the fetch will fail. Handle gracefully in the existing UI:

```typescript
// In meal parse and chat fetch calls — add a catch:
try {
  const response = await fetch('/api/log/parse', { ... })
  // ...
} catch (error) {
  if (!navigator.onLine) {
    // Show "You're offline. Connect to the internet to log a meal."
  } else {
    throw error  // Re-throw for existing error handling
  }
}
```

---

## Test Skeleton

PWA behavior is verified manually — automated tests for service workers are impractical in CI.

```typescript
// src/components/pwa/__tests__/install-banner.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InstallBanner } from '../install-banner'

describe('InstallBanner', () => {
  it('does not render when already in standalone mode', () => {
    // Mock matchMedia to return standalone: true
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<InstallBanner />)
    expect(screen.queryByText(/add to home screen/i)).toBeNull()
  })

  it('does not render when previously dismissed', () => {
    localStorage.setItem('install-banner-dismissed', 'true')
    render(<InstallBanner />)
    expect(screen.queryByText(/add to home screen/i)).toBeNull()
    localStorage.removeItem('install-banner-dismissed')
  })
})
```

**Manual verification checklist:**
- [ ] iOS Safari: open app → banner appears → tap Share → Add to Home Screen → app installs → banner gone on next open
- [ ] Android Chrome: open app → native install prompt appears → install → app opens in standalone mode
- [ ] Toggle airplane mode after loading → app shell still renders from cache
- [ ] Toggle airplane mode before opening log flow → "you're offline" message appears

---

## Acceptance Criteria

- [ ] `public/manifest.json` exists with correct app name, icons, and `display: standalone`
- [ ] On iOS mobile (not yet installed), sticky banner shows Share → Add to Home Screen instructions
- [ ] On Android (not yet installed), banner triggers native install prompt
- [ ] Banner is dismissible; stays dismissed across sessions (`localStorage`)
- [ ] Once installed in standalone mode, banner never appears
- [ ] App opens from home screen without browser chrome (standalone mode)
- [ ] Static pages load after toggling airplane mode (cached by service worker)
- [ ] AI features (meal parse, chat) show "you're offline" message when network unavailable
- [ ] `npm run build` passes (service worker generated in `public/`)
- [ ] `npm run lint` passes
