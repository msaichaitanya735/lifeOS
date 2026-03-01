import { PlanBlock, RecoveryMode } from '@/lib/types'
import { format, addMinutes, parse } from 'date-fns'

/**
 * Given the current blocks and a recovery mode, returns a new set of blocks
 * that fit the remaining time of the day.
 */
export function buildRecoveryBlocks(
  blocks: PlanBlock[],
  mode: RecoveryMode,
  nowStr: string // HH:MM
): Omit<PlanBlock, 'id' | 'plan_id' | 'created_at' | 'updated_at'>[] {
  const now = parse(nowStr, 'HH:mm', new Date())

  // Only include blocks that haven't started yet (status = 'planned')
  const remaining = blocks.filter((b) => {
    if (b.status !== 'planned') return false
    const blockStart = parse(b.start_time.slice(0, 5), 'HH:mm', new Date())
    return blockStart >= now
  })

  if (mode === 'reset') {
    // Mark everything remaining as skipped — return empty
    return []
  }

  if (mode === 'minimal') {
    // Keep only high-priority categories
    const priority: PlanBlock['category'][] = ['job', 'leetcode', 'gym']
    const filtered = remaining.filter((b) => priority.includes(b.category))
    return compactSchedule(filtered, now)
  }

  // 'catchup' — keep all remaining blocks, compress schedule
  return compactSchedule(remaining, now)
}

function compactSchedule(
  blocks: PlanBlock[],
  startFrom: Date
): Omit<PlanBlock, 'id' | 'plan_id' | 'created_at' | 'updated_at'>[] {
  let cursor = startFrom
  const BUFFER_MIN = 5

  return blocks.map((b) => {
    const origStart = parse(b.start_time.slice(0, 5), 'HH:mm', new Date())
    const origEnd = parse(b.end_time.slice(0, 5), 'HH:mm', new Date())
    const durationMin = (origEnd.getTime() - origStart.getTime()) / 60_000

    const newStart = cursor
    const newEnd = addMinutes(newStart, durationMin)
    cursor = addMinutes(newEnd, BUFFER_MIN)

    return {
      start_time: format(newStart, 'HH:mm:ss'),
      end_time: format(newEnd, 'HH:mm:ss'),
      category: b.category,
      title: b.title,
      status: 'planned' as const,
      notes: b.notes,
    }
  })
}

export function pickRecoveryMode(
  doneFraction: number,
  hoursRemaining: number
): RecoveryMode {
  if (hoursRemaining < 2) return 'minimal'
  if (doneFraction > 0.6) return 'catchup'
  return 'minimal'
}
