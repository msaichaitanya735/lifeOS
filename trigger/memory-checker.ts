import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format, addMinutes, addDays, addWeeks } from 'date-fns'

/**
 * Memory checker — fires at 3:05 AM UTC = 8:35 AM IST every day.
 *
 * Sends a push for each active memory whose next_remind_at has passed,
 * then advances next_remind_at based on frequency.
 */
export const memoryCheckerTask = schedules.task({
  id: 'memory-checker',
  cron: '5 3 * * *',   // 03:05 UTC = 08:35 IST
  maxDuration: 60,
  run: async () => {
    const supabase = createServiceClient()
    const now = new Date()

    const { data: memories } = await supabase
      .from('memories')
      .select('*')
      .eq('is_active', true)
      .lte('next_remind_at', now.toISOString())

    if (!memories?.length) return { sent: 0 }

    let sent = 0
    await Promise.allSettled(
      (memories as {
        id: string; user_id: string; content: string;
        type: string; frequency: string;
      }[]).map(async (m) => {
        await sendPushToUser(m.user_id, {
          title: m.type === 'goal'        ? '🎯 Goal reminder'
               : m.type === 'habit'       ? '🔁 Habit check-in'
               : m.type === 'affirmation' ? '💬 Affirmation'
               :                            '🧠 Reminder',
          body: m.content,
          url: '/reflect',
          tag: `memory-${m.id}`,
        })

        // Advance or deactivate
        const nextRemind =
          m.frequency === 'daily'  ? addDays(now, 1) :
          m.frequency === 'weekly' ? addWeeks(now, 1) :
          null   // 'once' → deactivate

        await supabase.from('memories').update({
          last_reminded_at: now.toISOString(),
          next_remind_at:   nextRemind?.toISOString() ?? null,
          is_active:        nextRemind !== null,
        }).eq('id', m.id)

        sent++
      })
    )

    return { checked: memories.length, sent, at: format(addMinutes(now, 330), 'HH:mm IST') }
  },
})
