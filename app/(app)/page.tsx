'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, parse, isWithinInterval } from 'date-fns'
import { CheckCircle2, Circle, SkipForward, PlayCircle, RefreshCw, ChevronDown } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { TodayResponse, PlanBlock } from '@/lib/types'
import { clsx } from 'clsx'

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(hhmm: string): Date {
  return parse(hhmm.slice(0, 5), 'HH:mm', new Date())
}

function to12(hhmm: string) {
  const d = toDate(hhmm)
  return format(d, 'h:mm a')
}

/**
 * Determine which block should be shown as "NOW".
 * Priority:
 *  1. Any block with status = 'active'
 *  2. A planned block whose time window contains the current time
 *  3. The next upcoming planned block (soonest start_time after now)
 *  4. The most-recent past planned block (hasn't been actioned yet)
 */
function classifyBlocks(blocks: PlanBlock[], nowStr: string) {
  const now = toDate(nowStr)

  const active   = blocks.find((b) => b.status === 'active')
  const planned  = blocks.filter((b) => b.status === 'planned')

  const inWindow = !active && planned.find((b) => {
    try {
      return isWithinInterval(now, { start: toDate(b.start_time), end: toDate(b.end_time) })
    } catch { return false }
  })

  const future   = planned.filter((b) => toDate(b.start_time) > now)
  const past     = planned.filter((b) => toDate(b.end_time)   < now)

  const current  = active ?? inWindow ?? future[0] ?? past[past.length - 1] ?? null

  // Everything that isn't the current block, split into upcoming / done
  const upcoming = blocks.filter(
    (b) => b !== current && b.status === 'planned' && toDate(b.start_time) > now
  )
  const finished = blocks.filter(
    (b) => b.status === 'done' || b.status === 'skipped' ||
           (b.status === 'planned' && toDate(b.end_time) < now && b !== current)
  )

  return { current, upcoming, finished }
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function FocusPage() {
  const [data, setData]       = useState<TodayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const fetchToday = useCallback(async () => {
    const res = await fetch('/api/plan/today')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchToday() }, [fetchToday])

  async function act(endpoint: string, body: object) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) await fetchToday()
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  const blocks   = data?.blocks ?? []
  const nowStr   = format(new Date(), 'HH:mm')
  const today    = format(new Date(), 'EEEE, MMM d')
  const p        = data?.progress

  const { current, upcoming, finished } = classifyBlocks(blocks, nowStr)

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">{today}</p>
          <h1 className="text-xl font-bold text-white">Focus Rail</h1>
        </div>
        <button
          onClick={fetchToday}
          aria-label="Refresh"
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Progress chips */}
      {p && (
        <div className="flex gap-2 flex-wrap">
          <StatChip label="Jobs"   value={p.job_apps_today}             streak={p.streaks.job} />
          <StatChip label="LC"     value={p.leetcode_today}             streak={p.streaks.leetcode} />
          <StatChip label="Skills" value={p.skills_today}               streak={p.streaks.skills} />
          <StatChip label="Gym"    value={p.gym_done_today ? 1 : 0}    streak={p.streaks.gym} isCheck />
        </div>
      )}

      {/* NOW */}
      {current ? (
        <section>
          <SectionLabel>NOW</SectionLabel>
          <BlockCard
            block={current}
            primary
            onStart={async () => {
              setActing(current.id)
              await act('/api/block/start', { block_id: current.id })
              setActing(null)
            }}
            onComplete={async () => {
              setActing(current.id)
              await act('/api/block/complete', { block_id: current.id })
              setActing(null)
            }}
            onSkip={async () => {
              setActing(current.id)
              await act('/api/block/skip', { block_id: current.id })
              setActing(null)
            }}
            acting={acting === current.id}
          />
        </section>
      ) : data?.plan ? (
        <Card className="text-center py-8">
          <p className="text-gray-400 text-sm">All blocks done for today! 🎉</p>
        </Card>
      ) : (
        <Card glass className="text-center py-8 space-y-3">
          <p className="text-gray-400 text-sm">No plan for today yet.</p>
          <Button size="sm" onClick={() => window.location.href = '/plan'}>
            Build Plan
          </Button>
        </Card>
      )}

      {/* NEXT */}
      {upcoming.length > 0 && (
        <section>
          <SectionLabel>NEXT — {to12(upcoming[0].start_time)}</SectionLabel>
          <BlockCard block={upcoming[0]} />
        </section>
      )}

      {/* LATER */}
      {upcoming.length > 1 && (
        <section>
          <SectionLabel>LATER</SectionLabel>
          <div className="space-y-2">
            {upcoming.slice(1, 4).map((b) => (
              <BlockCard key={b.id} block={b} compact />
            ))}
          </div>
        </section>
      )}

      {/* Active gym session */}
      {data?.activeGymSession && (
        <Card glass className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">Gym Active</p>
            <p className="text-sm text-gray-300">
              Started {format(new Date(data.activeGymSession.start_ts), 'h:mm a')}
            </p>
          </div>
          <Button
            size="sm"
            variant="danger"
            loading={acting === data.activeGymSession.id}
            onClick={async () => {
              setActing(data.activeGymSession!.id)
              await act('/api/progress/gym/end', { session_id: data.activeGymSession!.id })
              setActing(null)
            }}
          >
            End
          </Button>
        </Card>
      )}

      {/* Done / skipped today */}
      {finished.length > 0 && (
        <section>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 hover:text-gray-400 transition-colors"
          >
            <ChevronDown
              size={14}
              className={clsx('transition-transform', showDone ? 'rotate-180' : '')}
            />
            {finished.length} block{finished.length > 1 ? 's' : ''} done / past
          </button>
          {showDone && (
            <div className="space-y-2">
              {finished.map((b) => (
                <BlockCard key={b.id} block={b} compact />
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{children}</p>
  )
}

function StatChip({
  label, value, streak, isCheck,
}: { label: string; value: number; streak: number; isCheck?: boolean }) {
  const active = value > 0
  return (
    <div className={clsx(
      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border',
      active
        ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300'
        : 'bg-gray-800 border-gray-700 text-gray-400',
    )}>
      <span className="font-semibold">{label}</span>
      <span>{isCheck ? (value ? '✓' : '—') : value}</span>
      {streak > 1 && <span className="text-yellow-400">🔥{streak}</span>}
    </div>
  )
}

function BlockCard({
  block, primary, compact, onStart, onComplete, onSkip, acting,
}: {
  block: PlanBlock
  primary?: boolean
  compact?: boolean
  onStart?: () => void
  onComplete?: () => void
  onSkip?: () => void
  acting?: boolean
}) {
  const isActive  = block.status === 'active'
  const isPlanned = block.status === 'planned'
  const isDone    = block.status === 'done'
  const isSkipped = block.status === 'skipped'

  return (
    <Card className={clsx(
      primary && 'ring-2 ring-indigo-500/50',
      (isDone || isSkipped) && 'opacity-50',
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isDone    ? <CheckCircle2 size={20} className="text-green-400" /> :
           isSkipped ? <SkipForward  size={20} className="text-gray-600" /> :
           isActive  ? <Circle       size={20} className="text-yellow-400 animate-pulse" /> :
                       <Circle       size={20} className="text-gray-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx(
              'font-semibold truncate',
              compact ? 'text-sm' : 'text-base',
              isDone || isSkipped ? 'line-through text-gray-500' : 'text-white',
            )}>
              {block.title}
            </span>
            <Badge category={block.category} label={block.category} />
            {isActive && <Badge status="active" label="active" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {to12(block.start_time)} – {to12(block.end_time)}
          </p>
          {block.notes && !compact && (
            <p className="text-xs text-gray-400 mt-1">{block.notes}</p>
          )}
        </div>
      </div>

      {primary && (isPlanned || isActive) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
          {isPlanned && (
            <Button size="sm" onClick={onStart} loading={acting} className="flex-1">
              <PlayCircle size={14} /> Start
            </Button>
          )}
          {isActive && (
            <Button size="sm" onClick={onComplete} loading={acting} className="flex-1">
              <CheckCircle2 size={14} /> Complete
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onSkip} loading={acting}>
            Skip
          </Button>
        </div>
      )}
    </Card>
  )
}
