import { schedules } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { format } from 'date-fns'

/**
 * Fires at 17:00 ET — nudges users who haven't started a gym session today.
 */
export const gymCheckinTask = schedules.task({
  id: 'gym-checkin',
  cron: '0 17 * * 1-6',  // Mon–Sat 17:00 UTC
  run: async () => {
    const supabase = createServiceClient()
    const today = format(new Date(), 'yyyy-MM-dd')

    // Find all users who target gym today but have no gym session
    const { data: profiles } = await supabase.from('profiles').select('id, daily_targets')
    if (!profiles) return

    const { data: todaySessions } = await supabase
      .from('gym_sessions')
      .select('user_id')
      .eq('date', today)

    const doneUserIds = new Set((todaySessions ?? []).map((s: { user_id: string }) => s.user_id))

    const nudgeTargets = profiles.filter((p: { id: string; daily_targets: { gym_days_per_week: number } }) => {
      const gymDays: number = p.daily_targets?.gym_days_per_week ?? 0
      return gymDays > 0 && !doneUserIds.has(p.id)
    })

    await Promise.allSettled(
      nudgeTargets.map((p: { id: string }) =>
        sendPushToUser(p.id, {
          title: 'LifeOS — Gym time!',
          body: "Haven't hit the gym yet. You've got time — let's go!",
          url: '/log',
          tag: 'gym-reminder',
        })
      )
    )

    return { nudged: nudgeTargets.length }
  },
})
