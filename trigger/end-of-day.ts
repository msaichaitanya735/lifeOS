import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format } from 'date-fns'

/**
 * Fires at 21:00 ET — sends each user a personalised EOD summary push.
 */
export const endOfDayTask = schedules.task({
  id: 'end-of-day',
  cron: '0 21 * * *',
  run: async () => {
    const supabase = createServiceClient()
    const today = format(new Date(), 'yyyy-MM-dd')

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, notification_prefs, daily_targets')

    if (!profiles) return

    await Promise.allSettled(
      profiles.map(async (p: { id: string; notification_prefs: { end_of_day: boolean }; daily_targets: { job_apps: number; leetcode: number } }) => {
        if (!p.notification_prefs?.end_of_day) return

        // Gather today's counts
        const [{ count: jobs }, { count: lc }, { count: gym }] = await Promise.all([
          supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', p.id).eq('date', today),
          supabase.from('leetcode_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).eq('date', today),
          supabase.from('gym_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).eq('date', today).not('end_ts', 'is', null),
        ])

        const body = `Jobs: ${jobs ?? 0} | LC: ${lc ?? 0} | Gym: ${(gym ?? 0) > 0 ? '✓' : '✗'}`

        await sendPushToUser(p.id, {
          title: 'LifeOS — EOD Report',
          body,
          url: '/stats',
          tag: 'eod',
        })
      })
    )

    return { processed: profiles.length }
  },
})
