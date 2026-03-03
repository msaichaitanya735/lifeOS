'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { format, parse, isWithinInterval, differenceInSeconds, differenceInMinutes } from 'date-fns'
import {
  CheckCircle2, Circle, SkipForward, PlayCircle, RefreshCw,
  ChevronDown, Timer, AlertCircle, Bell, BookOpenCheck,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { TodayResponse, PlanBlock } from '@/lib/types'
import { clsx } from 'clsx'
import Link from 'next/link'

// ── Timer hook — ticks every second ──────────────────────────────────────────
function useLiveSeconds(isoTimestamp: string | null): number {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!isoTimestamp) return
    const tick = () => setSecs(differenceInSeconds(new Date(), new Date(isoTimestamp)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isoTimestamp])
  return secs
}

function fmtElapsed(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function fmtOverdue(mins: number): string {
  if (mins < 60) return `${mins}m late`
  return `${Math.floor(mins / 60)}h ${mins % 60}m late`
}

// ── Block classification ──────────────────────────────────────────────────────
function toDate(hhmm: string): Date {
  return parse(hhmm.slice(0, 5), 'HH:mm', new Date())
}
function to12(hhmm: string): string {
  return format(toDate(hhmm), 'h:mm a')
}

function classifyBlocks(blocks: PlanBlock[], nowStr: string) {
  const now = toDate(nowStr)
  const active  = blocks.find((b) => b.status === 'active')
  const planned = blocks.filter((b) => b.status === 'planned')

  const inWindow = !active && planned.find((b) => {
    try { return isWithinInterval(now, { start: toDate(b.start_time), end: toDate(b.end_time) }) }
    catch { return false }
  })

  const future = planned.filter((b) => toDate(b.start_time) > now)
  const past   = planned.filter((b) => toDate(b.end_time) < now)

  const current = active ?? inWindow ?? future[0] ?? past[past.length - 1] ?? null

  const upcoming = blocks.filter(
    (b) => b !== current && b.status === 'planned' && toDate(b.start_time) > now
  )
  const finished = blocks.filter(
    (b) => b.status === 'done' || b.status === 'skipped' ||
           (b.status === 'planned' && toDate(b.end_time) < now && b !== current)
  )

  return { current, upcoming, finished }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FocusPage() {
  const [data, setData]         = useState<TodayResponse | null>(null)
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const refreshRef              = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchToday = useCallback(async () => {
    const date = format(new Date(), 'yyyy-MM-dd')
    const res = await fetch(`/api/plan/today?date=${date}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  // Initial fetch + auto-refresh every 60 s
  useEffect(() => {
    fetchToday()
    refreshRef.current = setInterval(fetchToday, 60_000)
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [fetchToday])

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

  const blocks = data?.blocks ?? []
  const nowStr = format(new Date(), 'HH:mm')
  const p      = data?.progress
  const date   = format(new Date(), 'yyyy-MM-dd')

  // Show EOD prompt after 6 PM if reflection not yet done
  const [reflectionDone, setReflectionDone] = useState<boolean | null>(null)
  const hour = new Date().getHours()
  useEffect(() => {
    if (hour < 18) { setReflectionDone(true); return }  // Before 6 PM — hide prompt
    fetch(`/api/reflect/today?date=${date}`)
      .then((r) => r.json())
      .then((d) => setReflectionDone(!!d.reflection))
      .catch(() => setReflectionDone(true))
  }, [date, hour])

  const { current, upcoming, finished } = classifyBlocks(blocks, nowStr)

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            {format(new Date(), 'EEEE, MMM d')}
          </p>
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
          <StatChip label="Jobs"   value={p.job_apps_today}          streak={p.streaks.job} />
          <StatChip label="LC"     value={p.leetcode_today}          streak={p.streaks.leetcode} />
          <StatChip label="Skills" value={p.skills_today}            streak={p.streaks.skills} />
          <StatChip label="Gym"    value={p.gym_done_today ? 1 : 0}  streak={p.streaks.gym} isCheck />
        </div>
      )}

      {/* NOW */}
      {current ? (
        <section>
          <SectionLabel>NOW</SectionLabel>
          <ActiveBlockCard
            block={current}
            onStart={async () => { setActing(current.id); await act('/api/block/start', { block_id: current.id }); setActing(null) }}
            onComplete={async () => { setActing(current.id); await act('/api/block/complete', { block_id: current.id }); setActing(null) }}
            onSkip={async () => { setActing(current.id); await act('/api/block/skip', { block_id: current.id }); setActing(null) }}
            acting={acting === current.id}
          />
        </section>
      ) : data?.plan ? (
        <Card className="text-center py-8">
          <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2" />
          <p className="text-gray-300 text-sm font-medium">All blocks done for today!</p>
        </Card>
      ) : (
        <Card glass className="text-center py-8 space-y-3">
          <p className="text-gray-400 text-sm">No plan for today yet.</p>
          <Button size="sm" onClick={() => window.location.href = '/plan'}>Build Plan</Button>
        </Card>
      )}

      {/* NEXT */}
      {upcoming[0] && (
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
            size="sm" variant="danger"
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

      {/* EOD Reflection prompt */}
      {reflectionDone === false && (
        <Link href={`/reflect?date=${date}`}>
          <Card className="flex items-center gap-4 border-indigo-700/60 bg-indigo-900/20 ring-2 ring-indigo-500/30 cursor-pointer hover:ring-indigo-500/60 transition-all">
            <BookOpenCheck size={24} className="text-indigo-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Reflect on your day</p>
              <p className="text-xs text-indigo-300 mt-0.5">Close the loop — 2 minutes to review what you accomplished</p>
            </div>
            <ChevronDown size={16} className="text-gray-500 -rotate-90 shrink-0" />
          </Card>
        </Link>
      )}

      {/* Done / past blocks */}
      {finished.length > 0 && (
        <section>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 hover:text-gray-400 transition-colors"
          >
            <ChevronDown size={14} className={clsx('transition-transform', showDone && 'rotate-180')} />
            {finished.length} block{finished.length > 1 ? 's' : ''} done / past
          </button>
          {showDone && (
            <div className="space-y-2">
              {finished.map((b) => <BlockCard key={b.id} block={b} compact />)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ── ActiveBlockCard — live timer + overdue + check-in ────────────────────────
function ActiveBlockCard({
  block, onStart, onComplete, onSkip, acting,
}: {
  block: PlanBlock
  onStart: () => void
  onComplete: () => void
  onSkip: () => void
  acting?: boolean
}) {
  const isActive  = block.status === 'active'
  const isPlanned = block.status === 'planned'
  const cat       = block.category

  // Elapsed since block became active (updated_at is set when status → active)
  const activeSecs    = useLiveSeconds(isActive ? block.updated_at : null)
  const isLongRunning = isActive && activeSecs > 90 * 60   // > 90 min

  // Overdue: planned block whose start_time has passed
  const nowDate        = new Date()
  const blockStart     = toDate(block.start_time)
  const isOverdue      = isPlanned && blockStart < nowDate
  const overdueMinutes = isOverdue ? differenceInMinutes(nowDate, blockStart) : 0

  // "Still working?" prompt ref — auto-dismisses after a while
  const [checkinDismissed, setCheckinDismissed] = useState(false)

  return (
    <div className="space-y-2">

      {/* Overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-2 rounded-xl bg-orange-900/30 border border-orange-700/50 px-4 py-2.5">
          <AlertCircle size={15} className="text-orange-400 shrink-0" />
          <p className="text-sm text-orange-300 flex-1">
            <span className="font-semibold">{fmtOverdue(overdueMinutes)}</span>
            {' '}— scheduled {to12(block.start_time)}
          </p>
          <OverdueTimer startTime={block.start_time} />
        </div>
      )}

      {/* Still working? check-in */}
      {isLongRunning && !checkinDismissed && (
        <div className="flex items-center gap-3 rounded-xl bg-indigo-900/30 border border-indigo-700/50 px-4 py-3">
          <Bell size={15} className="text-indigo-400 shrink-0" />
          <p className="text-sm text-indigo-300 flex-1 font-medium">
            Still working on this?
          </p>
          <button
            onClick={() => setCheckinDismissed(true)}
            className="text-xs text-indigo-400 hover:text-white border border-indigo-700 rounded-lg px-2.5 py-1 transition-colors"
          >
            Yes, continuing
          </button>
        </div>
      )}

      {/* Main card */}
      <Card className={clsx(
        'ring-2 transition-all',
        isOverdue   ? 'ring-orange-500/60 border-orange-700/40' :
        isActive    ? 'ring-indigo-500/60' :
                      'ring-gray-700/40',
      )}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isActive
              ? <Circle size={20} className="text-yellow-400 animate-pulse" />
              : isOverdue
              ? <AlertCircle size={20} className="text-orange-400" />
              : <Circle size={20} className="text-gray-600" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-base text-white">{block.title}</span>
              {/* Live elapsed timer */}
              {isActive && (
                <div className="flex items-center gap-1 text-xs font-mono text-yellow-400 bg-yellow-900/30 rounded-lg px-2 py-1 shrink-0">
                  <Timer size={11} />
                  {fmtElapsed(activeSecs)}
                </div>
              )}
              {/* Overdue counter */}
              {isOverdue && (
                <div className="flex items-center gap-1 text-xs font-mono text-orange-400 bg-orange-900/30 rounded-lg px-2 py-1 shrink-0">
                  <Timer size={11} />
                  <OverdueTickerInline startTime={block.start_time} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge category={cat} label={cat} />
              {isActive   && <Badge status="active" label="active" />}
              {isOverdue  && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30">
                  overdue
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-1">
              {to12(block.start_time)} – {to12(block.end_time)}
            </p>
            {block.notes && <p className="text-xs text-gray-400 mt-1">{block.notes}</p>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
          {isPlanned && (
            <Button
              size="sm" onClick={onStart} loading={acting}
              className={clsx('flex-1', isOverdue && 'bg-orange-600 hover:bg-orange-500')}
            >
              <PlayCircle size={14} />
              {isOverdue ? 'Start Now' : 'Start'}
            </Button>
          )}
          {isActive && (
            <Button size="sm" onClick={onComplete} loading={acting} className="flex-1">
              <CheckCircle2 size={14} /> Done
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onSkip} loading={acting}>
            Skip
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Ticking overdue duration in the banner (minutes + seconds live)
function OverdueTimer({ startTime }: { startTime: string }) {
  const secs = useLiveSeconds(toDate(startTime).toISOString())
  return (
    <span className="text-xs font-mono text-orange-400 tabular-nums">
      {fmtElapsed(secs)}
    </span>
  )
}

// Inline ticking overdue in the card header
function OverdueTickerInline({ startTime }: { startTime: string }) {
  const secs = useLiveSeconds(toDate(startTime).toISOString())
  return <>{fmtElapsed(secs)}</>
}

// ── Regular (non-primary) block card ─────────────────────────────────────────
function BlockCard({ block, compact }: { block: PlanBlock; compact?: boolean }) {
  const isDone    = block.status === 'done'
  const isSkipped = block.status === 'skipped'

  return (
    <Card className={clsx((isDone || isSkipped) && 'opacity-50')}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isDone    ? <CheckCircle2 size={18} className="text-green-400" /> :
           isSkipped ? <SkipForward  size={18} className="text-gray-600" /> :
                       <Circle       size={18} className="text-gray-600" />}
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
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {to12(block.start_time)} – {to12(block.end_time)}
          </p>
        </div>
      </div>
    </Card>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{children}</p>
}

function StatChip({ label, value, streak, isCheck }: {
  label: string; value: number; streak: number; isCheck?: boolean
}) {
  const active = value > 0
  return (
    <div className={clsx(
      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border',
      active ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400',
    )}>
      <span className="font-semibold">{label}</span>
      <span>{isCheck ? (value ? '✓' : '—') : value}</span>
      {streak > 1 && <span className="text-yellow-400">🔥{streak}</span>}
    </div>
  )
}
