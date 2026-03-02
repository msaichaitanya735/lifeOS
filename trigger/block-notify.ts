import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format, parse, differenceInMinutes } from 'date-fns'

/**
 * Runs every 15 minutes.
 *
 * For each user with a plan today it checks:
 *  1. OVERDUE  — planned block whose start_time passed 5–20 min ago → "Time to start X"
 *  2. CHECK-IN — active block running > 90 min without completion   → "Still working on X?"
 *
 * Events table is used to deduplicate: we insert a 'push.block_overdue' or
 * 'push.block_checkin' event and skip if one already exists for that block today.
 */
export const blockNotifyTask = schedules.task({
  id: 'block-notify',
  cron: '*/15 * * * *',
  maxDuration: 120,
  run: async () => {
    const supabase = createServiceClient()
    const today    = format(new Date(), 'yyyy-MM-dd')
    const now      = new Date()
    const nowStr   = format(now, 'HH:mm')

    // ── Fetch all plans for today ────────────────────────────────────────────
    const { data: plans } = await supabase
      .from('daily_plans')
      .select('id, user_id')
      .eq('date', today)

    if (!plans?.length) return { checked: 0 }

    let overdueCount = 0
    let checkinCount = 0

    await Promise.allSettled(
      plans.map(async (plan: { id: string; user_id: string }) => {
        const { data: blocks } = await supabase
          .from('plan_blocks')
          .select('id, title, category, start_time, end_time, status, updated_at')
          .eq('plan_id', plan.id)

        if (!blocks?.length) return

        // ── Already-sent events for today (dedup) ───────────────────────────
        const { data: sentEvents } = await supabase
          .from('events')
          .select('payload')
          .eq('user_id', plan.user_id)
          .in('type', ['push.block_overdue', 'push.block_checkin'])
          .gte('ts', `${today}T00:00:00Z`)

        const sentBlockIds = new Set(
          (sentEvents ?? []).map((e: { payload: { block_id?: string } }) => e.payload?.block_id)
        )

        await Promise.allSettled(
          blocks.map(async (block: {
            id: string; title: string; category: string;
            start_time: string; end_time: string;
            status: string; updated_at: string;
          }) => {
            if (sentBlockIds.has(block.id)) return

            const blockStart = parse(block.start_time.slice(0, 5), 'HH:mm', new Date())
            const minsSinceStart = differenceInMinutes(now, blockStart)

            // ── 1. OVERDUE: planned block, start passed 3–20 min ago ────────
            if (
              block.status === 'planned' &&
              minsSinceStart >= 3 &&
              minsSinceStart <= 20
            ) {
              await sendPushToUser(plan.user_id, {
                title: '⏰ Time to start!',
                body: `"${block.title}" was scheduled for ${block.start_time.slice(0, 5)}. Still starting?`,
                url: '/',
                tag: `overdue-${block.id}`,
              })

              await supabase.from('events').insert({
                user_id: plan.user_id,
                type: 'push.block_overdue',
                payload: { block_id: block.id, block_title: block.title, mins_late: minsSinceStart },
              })

              overdueCount++
              return
            }

            // ── 2. CHECK-IN: active block running > 90 min ──────────────────
            if (block.status === 'active') {
              const minsActive = differenceInMinutes(now, new Date(block.updated_at))
              if (minsActive >= 90 && minsActive <= 105) {
                await sendPushToUser(plan.user_id, {
                  title: '🔄 Still going?',
                  body: `You've been on "${block.title}" for ${Math.floor(minsActive / 60)}h ${minsActive % 60}m. Still working?`,
                  url: '/',
                  tag: `checkin-${block.id}`,
                })

                await supabase.from('events').insert({
                  user_id: plan.user_id,
                  type: 'push.block_checkin',
                  payload: { block_id: block.id, block_title: block.title, mins_active: minsActive },
                })

                checkinCount++
              }
            }
          })
        )
      })
    )

    return { checked: plans.length, overdueCount, checkinCount }
  },
})
