import { schedules } from '@trigger.dev/sdk/v3'
import { sendPushToAll } from '@/lib/push/send'

/**
 * Daily morning reminder — fires at 08:00 ET every day.
 * Tells users to plan their day.
 */
export const dailyReminderTask = schedules.task({
  id: 'daily-reminder',
  cron: '0 8 * * *',   // 08:00 UTC daily (adjust for timezone in prod)
  run: async () => {
    await sendPushToAll({
      title: 'LifeOS — Good morning',
      body: "Time to plan your day. What's the one thing that matters most?",
      url: '/plan',
      tag: 'daily-reminder',
    })

    return { ok: true, sentAt: new Date().toISOString() }
  },
})
