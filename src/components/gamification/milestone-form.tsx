'use client'

import { useState } from 'react'

interface MilestoneFormProps {
  childId: string
  onCreated: () => void  // called after successful creation so parent can refresh
}

/**
 * Parent-facing form for creating a milestone goal for a child.
 * Only rendered in parent/authenticated views (not in kid-only mode).
 * POSTs to /api/child/[childId]/milestones.
 */
export function MilestoneForm({ childId, onCreated }: MilestoneFormProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const count = parseInt(targetCount, 10)
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    if (!Number.isInteger(count) || count < 1) {
      setError('Target must be a positive whole number.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/child/${childId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), targetCount: count }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to create goal.')
        return
      }

      // Reset and close
      setDescription('')
      setTargetCount('')
      setOpen(false)
      onCreated()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
      >
        + Set a new goal
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h4 className="mb-3 text-sm font-semibold text-gray-900">New Milestone Goal</h4>

      <div className="mb-3">
        <label
          htmlFor="milestone-desc"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Description
        </label>
        <input
          id="milestone-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='e.g. "Log 20 meals"'
          maxLength={200}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="milestone-target"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Target count
        </label>
        <input
          id="milestone-target"
          type="number"
          min={1}
          max={9999}
          value={targetCount}
          onChange={(e) => setTargetCount(e.target.value)}
          placeholder="e.g. 20"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
        />
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Set Goal'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
