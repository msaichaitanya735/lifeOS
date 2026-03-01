'use client'

import { useState, useEffect, useRef } from 'react'
import { format, addMinutes, parse, differenceInMinutes } from 'date-fns'
import { Plus, Trash2, ChevronRight, Send, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Category, CreateBlockPayload } from '@/lib/types'
import { clsx } from 'clsx'

// ── Category config ────────────────────────────────────────────
const CATEGORIES: { key: Category; label: string; emoji: string; color: string; ring: string }[] = [
  { key: 'job',      label: 'Job',     emoji: '💼', color: 'bg-blue-500/20 text-blue-300',    ring: 'ring-blue-500' },
  { key: 'leetcode', label: 'LC',      emoji: '🧩', color: 'bg-indigo-500/20 text-indigo-300', ring: 'ring-indigo-500' },
  { key: 'skills',   label: 'Skills',  emoji: '📚', color: 'bg-purple-500/20 text-purple-300', ring: 'ring-purple-500' },
  { key: 'gym',      label: 'Gym',     emoji: '🏋️', color: 'bg-green-500/20 text-green-300',  ring: 'ring-green-500' },
  { key: 'admin',    label: 'Admin',   emoji: '⚙️', color: 'bg-gray-500/20 text-gray-300',    ring: 'ring-gray-500' },
  { key: 'personal', label: 'Personal',emoji: '🧘', color: 'bg-orange-500/20 text-orange-300',ring: 'ring-orange-500' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<Category, typeof CATEGORIES[0]>

const DEFAULT_BLOCKS: CreateBlockPayload[] = [
  { start_time: '09:00', end_time: '12:00', category: 'job',      title: 'Job Applications' },
  { start_time: '12:30', end_time: '13:30', category: 'leetcode', title: 'LeetCode' },
  { start_time: '14:00', end_time: '15:30', category: 'skills',   title: 'Skills / Study' },
  { start_time: '17:00', end_time: '18:30', category: 'gym',      title: 'Gym' },
]

// ── Helpers ────────────────────────────────────────────────────
function to12(hhmm: string) {
  if (!hhmm) return '--:--'
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function durationLabel(start: string, end: string) {
  try {
    const s = parse(start, 'HH:mm', new Date())
    const e = parse(end, 'HH:mm', new Date())
    const mins = differenceInMinutes(e, s)
    if (mins <= 0) return ''
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
  } catch { return '' }
}

// ── Main page ──────────────────────────────────────────────────
export default function PlanPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [intention, setIntention] = useState('')
  const [blocks, setBlocks] = useState<CreateBlockPayload[]>(DEFAULT_BLOCKS)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Load today's existing plan
  useEffect(() => {
    if (date === format(new Date(), 'yyyy-MM-dd')) {
      fetch('/api/plan/today')
        .then((r) => r.json())
        .then((d) => {
          if (d.plan) setIntention(d.plan.intention ?? '')
          if (d.blocks?.length) {
            setBlocks(d.blocks.map((b: { start_time: string; end_time: string; category: Category; title: string; notes?: string }) => ({
              start_time: b.start_time.slice(0, 5),
              end_time:   b.end_time.slice(0, 5),
              category:   b.category,
              title:      b.title,
              notes:      b.notes,
            })))
          }
        })
        .catch(() => {})
    }
  }, [date])

  function addBlock() {
    const last = blocks[blocks.length - 1]
    const prevEnd = last ? parse(last.end_time, 'HH:mm', new Date()) : parse('09:00', 'HH:mm', new Date())
    const start = addMinutes(prevEnd, 15)
    const end   = addMinutes(start, 60)
    const newIdx = blocks.length
    setBlocks([...blocks, { start_time: format(start, 'HH:mm'), end_time: format(end, 'HH:mm'), category: 'job', title: '' }])
    setExpandedIdx(newIdx)
  }

  function removeBlock(i: number) {
    setBlocks(blocks.filter((_, idx) => idx !== i))
    setExpandedIdx(null)
  }

  function updateBlock(i: number, patch: Partial<CreateBlockPayload>) {
    setBlocks(blocks.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  }

  async function handleCommit() {
    if (blocks.some((b) => !b.title.trim())) { setError('Every block needs a title'); return }
    setError('')
    setSaving(true)
    const res = await fetch('/api/plan/createOrUpdateDay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, intention, blocks }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      {/* ── Header ── */}
      <div className="px-5 pt-7 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Plan your day</h1>

        {/* Date strip */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {[-1, 0, 1, 2].map((offset) => {
            const d = addMinutes(new Date(), offset * 24 * 60)
            const str = format(d, 'yyyy-MM-dd')
            const active = str === date
            return (
              <button
                key={str}
                onClick={() => setDate(str)}
                className={clsx(
                  'flex-shrink-0 rounded-2xl px-4 py-2.5 text-center transition-all',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                )}
              >
                <p className="text-xs font-medium">{format(d, 'EEE')}</p>
                <p className={clsx('text-lg font-bold leading-none', active ? 'text-white' : 'text-gray-200')}>
                  {format(d, 'd')}
                </p>
              </button>
            )
          })}
        </div>

        {/* Intention */}
        <div className="mt-4 flex items-center gap-2 bg-gray-900 rounded-2xl px-4 py-3 border border-gray-800">
          <Sparkles size={15} className="text-indigo-400 shrink-0" />
          <input
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="Today's intention…"
            className="bg-transparent flex-1 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="px-5 space-y-0">
        {blocks.map((block, i) => (
          <BlockCard
            key={i}
            block={block}
            index={i}
            total={blocks.length}
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            onChange={(patch) => updateBlock(i, patch)}
            onRemove={() => removeBlock(i)}
          />
        ))}
      </div>

      {/* ── Add block ── */}
      <div className="px-5 mt-4">
        <button
          onClick={addBlock}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-700 py-4 text-gray-500 hover:border-indigo-600 hover:text-indigo-400 transition-all"
        >
          <Plus size={18} />
          <span className="text-sm font-medium">Add block</span>
        </button>
      </div>

      {/* ── Commit ── */}
      <div className="px-5 mt-5 space-y-3">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded-xl px-4 py-2">{error}</p>
        )}
        <Button size="lg" loading={saving} onClick={handleCommit} className="w-full">
          {saved ? '✓ Plan committed!' : <><Send size={15} /> Commit Plan</>}
        </Button>
      </div>
    </div>
  )
}

// ── Block Card ─────────────────────────────────────────────────
interface BlockCardProps {
  block: CreateBlockPayload
  index: number
  total: number
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<CreateBlockPayload>) => void
  onRemove: () => void
}

function BlockCard({ block, index, total, expanded, onToggle, onChange, onRemove }: BlockCardProps) {
  const cat = CAT_MAP[block.category]
  const dur = durationLabel(block.start_time, block.end_time)
  const titleRef = useRef<HTMLInputElement>(null)

  // Auto-focus title when card first expands with no title
  useEffect(() => {
    if (expanded && !block.title) {
      setTimeout(() => titleRef.current?.focus(), 80)
    }
  }, [expanded, block.title])

  return (
    <div className="relative flex gap-3">
      {/* ── Timeline spine ── */}
      <div className="flex flex-col items-center pt-5">
        <div className={clsx('w-3 h-3 rounded-full ring-2 shrink-0', cat.color, cat.ring)} />
        {index < total - 1 && (
          <div className="w-0.5 flex-1 bg-gray-800 mt-1" />
        )}
      </div>

      {/* ── Card ── */}
      <div className="flex-1 pb-4">
        {/* Collapsed / header row — always visible */}
        <button
          onClick={onToggle}
          className={clsx(
            'w-full text-left rounded-2xl border transition-all',
            expanded
              ? 'bg-gray-900 border-indigo-600/60'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          )}
        >
          {/* Time bar */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <TimeChip time={block.start_time} />
            <ChevronRight size={14} className="text-gray-600" />
            <TimeChip time={block.end_time} />
            {dur && <span className="ml-auto text-xs text-gray-500 font-medium">{dur}</span>}
          </div>

          {/* Title + category */}
          <div className="flex items-center gap-2 px-4 pb-4">
            <span className="text-base">{cat.emoji}</span>
            <span className={clsx('text-sm font-semibold', block.title ? 'text-white' : 'text-gray-500')}>
              {block.title || 'Untitled block'}
            </span>
          </div>
        </button>

        {/* ── Expanded edit panel ── */}
        {expanded && (
          <div className="mt-2 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">

            {/* Time pickers */}
            <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Start</p>
                <input
                  type="time"
                  value={block.start_time}
                  onChange={(e) => onChange({ start_time: e.target.value })}
                  className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">End</p>
                <input
                  type="time"
                  value={block.end_time}
                  onChange={(e) => onChange({ end_time: e.target.value })}
                  className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Category pills */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs text-gray-500 mb-2.5 font-medium uppercase tracking-wide">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => onChange({ category: c.key })}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition-all',
                      block.category === c.key
                        ? `${c.color} ${c.ring}`
                        : 'bg-gray-800 text-gray-500 ring-transparent hover:text-gray-300'
                    )}
                  >
                    <span>{c.emoji}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Title</p>
              <input
                ref={titleRef}
                type="text"
                value={block.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="What are you doing?"
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
              />
            </div>

            {/* Notes */}
            <div className="px-4 pb-4">
              <input
                type="text"
                value={block.notes ?? ''}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full bg-gray-800/50 rounded-xl px-4 py-2.5 text-gray-400 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
              />
            </div>

            {/* Delete */}
            <button
              onClick={onRemove}
              className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-800 text-xs text-red-400 hover:bg-red-900/10 transition-colors"
            >
              <Trash2 size={13} /> Remove block
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Time chip ──────────────────────────────────────────────────
function TimeChip({ time }: { time: string }) {
  return (
    <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-sm font-mono font-semibold text-white tracking-tight">
      {to12(time)}
    </span>
  )
}
