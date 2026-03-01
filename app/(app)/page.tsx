'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Circle, SkipForward, PlayCircle, RefreshCw } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { TodayResponse, PlanBlock } from '@/lib/types'
import { clsx } from 'clsx'

export default function FocusPage() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchToday = useCallback(async () => {
    const res = await fetch('/api/plan/today')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchToday() }, [fetchToday])

  async function act(endpoint: string, body: object) {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) await fetchToday()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  const blocks = data?.blocks ?? []
  const now = new Date()
  const nowStr = format(now, 'HH:mm')

  // Classify blocks
  const active = blocks.find((b) => b.status === 'active')
  const nowNext = blocks.filter((b) => {
    if (b.status !== 'planned') return false
    return b.start_time.slice(0, 5) >= nowStr
  })
  const current = active ?? nowNext[0] ?? null
  const next = active ? nowNext[0] : nowNext[1]
  const later = active ? nowNext.slice(1, 4) : nowNext.slice(2, 5)

  const p = data?.progress
  const today = format(now, 'EEEE, MMM d')

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">{today}</p>
          <h1 className="text-xl font-bold text-white">Focus Rail</h1>
        </div>
        <button onClick={fetchToday} className="text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Progress chips */}
      {p && (
        <div className="flex gap-2 flex-wrap">
          <StatChip label="Jobs" value={p.job_apps_today} streak={p.streaks.job} />
          <StatChip label="LC" value={p.leetcode_today} streak={p.streaks.leetcode} />
          <StatChip label="Skills" value={p.skills_today} streak={p.streaks.skills} />
          <StatChip label="Gym" value={p.gym_done_today ? 1 : 0} streak={p.streaks.gym} isCheck />
        </div>
      )}

      {/* NOW */}
      {current ? (
        <section>
          <SectionLabel>NOW</SectionLabel>
          <BlockCard
            block={current}
            primary
            onStart={async () => { setActing(current.id); await act('/api/block/start', { block_id: current.id }); setActing(null) }}
            onComplete={async () => { setActing(current.id); await act('/api/block/complete', { block_id: current.id }); setActing(null) }}
            onSkip={async () => { setActing(current.id); await act('/api/block/skip', { block_id: current.id }); setActing(null) }}
            acting={acting === current.id}
          />
        </section>
      ) : (
        <Card className="text-center py-8">
          <p className="text-gray-400 text-sm">No active block. Great job or plan your day!</p>
        </Card>
      )}

      {/* NEXT */}
      {next && (
        <section>
          <SectionLabel>NEXT</SectionLabel>
          <BlockCard block={next} />
        </section>
      )}

      {/* LATER */}
      {later.length > 0 && (
        <section>
          <SectionLabel>LATER</SectionLabel>
          <div className="space-y-2">
            {later.map((b) => <BlockCard key={b.id} block={b} compact />)}
          </div>
        </section>
      )}

      {/* Active gym session */}
      {data?.activeGymSession && (
        <Card glass className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">Gym Active</p>
            <p className="text-sm text-gray-300">Started {format(new Date(data.activeGymSession.start_ts), 'h:mm a')}</p>
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

      {/* No plan prompt */}
      {!data?.plan && (
        <Card glass className="text-center py-6">
          <p className="text-gray-400 text-sm mb-3">No plan for today yet.</p>
          <Button size="sm" onClick={() => window.location.href = '/plan'}>Build Plan</Button>
        </Card>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{children}</p>
  )
}

function StatChip({ label, value, streak, isCheck }: { label: string; value: number; streak: number; isCheck?: boolean }) {
  const active = isCheck ? value > 0 : value > 0
  return (
    <div className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border', active ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400')}>
      <span className="font-semibold">{label}</span>
      <span>{isCheck ? (value ? '✓' : '—') : value}</span>
      {streak > 1 && <span className="text-yellow-400">🔥{streak}</span>}
    </div>
  )
}

function BlockCard({
  block,
  primary,
  compact,
  onStart,
  onComplete,
  onSkip,
  acting,
}: {
  block: PlanBlock
  primary?: boolean
  compact?: boolean
  onStart?: () => void
  onComplete?: () => void
  onSkip?: () => void
  acting?: boolean
}) {
  const isActive = block.status === 'active'
  const isPlanned = block.status === 'planned'

  return (
    <Card className={clsx(primary && 'ring-2 ring-indigo-500/50')}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {block.status === 'done' ? (
            <CheckCircle2 size={20} className="text-green-400" />
          ) : block.status === 'skipped' ? (
            <SkipForward size={20} className="text-gray-600" />
          ) : (
            <Circle size={20} className={isActive ? 'text-yellow-400' : 'text-gray-600'} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('font-semibold', compact ? 'text-sm' : 'text-base', 'text-white truncate')}>
              {block.title}
            </span>
            <Badge category={block.category} label={block.category} />
            {isActive && <Badge status="active" label="active" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
          </p>
          {block.notes && !compact && <p className="text-xs text-gray-400 mt-1">{block.notes}</p>}
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
