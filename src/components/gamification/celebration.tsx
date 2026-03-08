'use client'

import { useEffect, useRef } from 'react'

export interface CelebrationProps {
  badges: string[]        // badge keys just earned
  milestones: string[]    // milestone descriptions just completed
  pointsEarned: number
  onDismiss: () => void
}

/** Map badge key → { name, icon } for display inside the overlay. */
const BADGE_DISPLAY: Record<string, { name: string; icon: string }> = {
  'first-meal':       { name: 'First Bite',         icon: '🥗' },
  'meals-5':          { name: 'Five and Counting',   icon: '⭐' },
  'meals-25':         { name: 'On a Roll',           icon: '🎯' },
  'meals-100':        { name: 'Century',             icon: '🏆' },
  'streak-3':         { name: '3-Day Streak',        icon: '🔥' },
  'streak-7':         { name: 'Week Warrior',        icon: '🔥🔥' },
  'streak-30':        { name: 'Habit Locked',        icon: '💪' },
  'protein-goal-5':   { name: 'Protein Pro',         icon: '💪' },
  'calories-goal-day':{ name: 'Balanced Day',        icon: '✅' },
  'family-meal':      { name: 'Family Table',        icon: '🍽️' },
  'variety-5':        { name: 'Foodie',              icon: '🌈' },
  'early-bird':       { name: 'Early Bird',          icon: '🌅' },
}

/**
 * Full-screen celebration overlay.
 * Fires when `badges.length > 0 || milestones.length > 0`.
 * Auto-dismisses after 4 seconds or immediately on tap.
 */
export function CelebrationOverlay({
  badges,
  milestones,
  pointsEarned,
  onDismiss,
}: CelebrationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const hasBadges = badges.length > 0
  const hasMilestones = milestones.length > 0

  if (!hasBadges && !hasMilestones) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Achievement celebration"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
    >
      {/* Confetti dots — pure CSS, no library */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-2 w-2 animate-bounce rounded-full"
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              top: `${(i * 53 + 11) % 80}%`,
              backgroundColor: [
                '#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#ef4444',
              ][i % 6],
              animationDelay: `${(i * 0.13).toFixed(2)}s`,
              animationDuration: `${0.6 + (i % 5) * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white px-6 py-8 shadow-2xl"
      >
        <div className="mb-4 text-center text-4xl">🎉</div>

        {pointsEarned > 0 && (
          <p className="mb-4 text-center text-lg font-bold text-gray-900">
            +{pointsEarned} points!
          </p>
        )}

        {hasBadges && (
          <div className="mb-4">
            <p className="mb-2 text-center text-sm font-semibold text-gray-700">
              New badge{badges.length > 1 ? 's' : ''} earned!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {badges.map((key) => {
                const badge = BADGE_DISPLAY[key] ?? { name: key, icon: '🏅' }
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center gap-1 rounded-xl bg-amber-50 px-4 py-3 text-center shadow-sm"
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-xs font-medium text-amber-800">
                      {badge.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {hasMilestones && (
          <div className="mb-4">
            <p className="mb-2 text-center text-sm font-semibold text-gray-700">
              Goal{milestones.length > 1 ? 's' : ''} completed!
            </p>
            <ul className="space-y-1">
              {milestones.map((desc, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-800"
                >
                  ✅ {desc}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Awesome!
        </button>

        <p className="mt-2 text-center text-xs text-gray-400">
          Tap anywhere or wait to dismiss
        </p>
      </div>
    </div>
  )
}
