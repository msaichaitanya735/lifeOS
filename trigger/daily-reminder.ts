import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format, addMinutes } from 'date-fns'

/**
 * Morning planning reminder — fires at 3:00 AM UTC = 8:30 AM IST every day.
 *
 * Per-user check: only sends a push if the user has NOT already committed
 * a plan for today. If they have one, we stay quiet.
 */
export const dailyReminderTask = schedules.task({
  id: 'daily-reminder',
  cron: '0 3 * * *',   // 03:00 UTC = 08:30 IST
  maxDuration: 120,
  run: async () => {
    const supabase = createServiceClient()

    // Compute IST date (UTC+5:30) to match what clients save
    const istDate = addMinutes(new Date(), 330) // 5h30m ahead of UTC
    const today   = format(istDate, 'yyyy-MM-dd')

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')

    if (!profiles?.length) return { sent: 0 }

    let sent = 0
    await Promise.allSettled(
      (profiles as { id: string }[]).map(async (p) => {
        // Check if user already has a committed plan for today
        const { data: plan } = await supabase
          .from('daily_plans')
          .select('id')
          .eq('user_id', p.id)
          .eq('date', today)
          .eq('committed', true)
          .maybeSingle()

        if (plan) return  // Already planned — don't nag

        await sendPushToUser(p.id, {
          title: '🌅 Good morning — time to plan!',
          body: "Your day hasn't been planned yet. Set your intention before you start anything.",
          url: '/plan',
          tag: 'morning-plan-reminder',
        })
        sent++
      })
    )

    return { today, checked: profiles.length, sent }
  },
})
