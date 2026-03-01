import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format, subDays } from 'date-fns'

/**
 * Every Sunday at 20:00 — sends a weekly summary push.
 */
export const weeklyReviewTask = schedules.task({
  id: 'weekly-review',
  cron: '0 20 * * 0',
  run: async () => {
    const supabase = createServiceClient()
    const today = format(new Date(), 'yyyy-MM-dd')
    const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')

    const { data: profiles } = await supabase.from('profiles').select('id')
    if (!profiles) return

    await Promise.allSettled(
      profiles.map(async (p: { id: string }) => {
        const [{ count: jobs }, { count: lc }, { count: gym }] = await Promise.all([
          supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', p.id).gte('date', weekAgo).lte('date', today),
          supabase.from('leetcode_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).gte('date', weekAgo).lte('date', today),
          supabase.from('gym_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).gte('date', weekAgo).lte('date', today).not('end_ts', 'is', null),
        ])

        const body = `This week: ${jobs ?? 0} job apps • ${lc ?? 0} LC problems • ${gym ?? 0} gym sessions. Check your stats!`

        await sendPushToUser(p.id, {
          title: 'LifeOS — Weekly Review',
          body,
          url: '/stats',
          tag: 'weekly-review',
        })
      })
    )

    return { processed: profiles.length }
  },
})
