import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format, addMinutes } from 'date-fns'

/**
 * End-of-day reflection prompt — fires at 3:30 PM UTC = 9:00 PM IST every day.
 *
 * Sends a personalised push to each user that:
 *  - Has not completed today's reflection yet
 *  - Has end_of_day notifications enabled
 *
 * The push deep-links to /reflect?date=YYYY-MM-DD
 */
export const endOfDayTask = schedules.task({
  id: 'end-of-day',
  cron: '30 15 * * *',   // 15:30 UTC = 21:00 IST
  maxDuration: 120,
  run: async () => {
    const supabase = createServiceClient()

    const istDate = addMinutes(new Date(), 330)
    const today   = format(istDate, 'yyyy-MM-dd')

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, notification_prefs, daily_targets')

    if (!profiles?.length) return { sent: 0 }

    let sent = 0
    await Promise.allSettled(
      (profiles as { id: string; notification_prefs: { end_of_day?: boolean }; daily_targets: { job_apps: number; leetcode: number } }[]).map(async (p) => {
        if (!p.notification_prefs?.end_of_day) return

        // Skip if they already reflected today
        const { data: reflection } = await supabase
          .from('daily_reflections')
          .select('id')
          .eq('user_id', p.id)
          .eq('date', today)
          .maybeSingle()

        if (reflection) return  // Already reflected

        // Gather a quick summary to make the notification personal
        const [{ count: jobs }, { count: lc }, { count: gymCount }] = await Promise.all([
          supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', p.id).eq('date', today),
          supabase.from('leetcode_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).eq('date', today),
          supabase.from('gym_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).eq('date', today).not('end_ts', 'is', null),
        ])

        const parts: string[] = []
        if ((jobs ?? 0) > 0)      parts.push(`${jobs} job app${(jobs ?? 0) > 1 ? 's' : ''}`)
        if ((lc ?? 0) > 0)        parts.push(`${lc} LC problem${(lc ?? 0) > 1 ? 's' : ''}`)
        if ((gymCount ?? 0) > 0)  parts.push('gym ✓')

        const body = parts.length > 0
          ? `Today: ${parts.join(' · ')} — reflect & close the loop.`
          : "How was your day? Take 2 min to close it out."

        await sendPushToUser(p.id, {
          title: '📊 Time to reflect on your day',
          body,
          url: `/reflect?date=${today}`,
          tag: `eod-reflect-${today}`,
        })
        sent++
      })
    )

    return { today, checked: profiles.length, sent }
  },
})
