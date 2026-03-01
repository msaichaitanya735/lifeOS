import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? 'admin@lifeos.app'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = createServiceClient()

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subs?.length) return { sent: 0, errors: [] }

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: payload.badge ?? '/icons/badge-72.png',
    data: { url: payload.url ?? '/' },
    tag: payload.tag,
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      )
    )
  )

  const errors: string[] = []
  const staleEndpoints: string[] = []

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number }
      // 410 Gone = subscription expired
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        staleEndpoints.push(subs[i].endpoint)
      } else {
        errors.push(String(result.reason))
      }
    }
  })

  // Clean up stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints)
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return { sent, errors }
}

export async function sendPushToAll(payload: PushPayload) {
  const supabase = createServiceClient()
  const { data: users } = await supabase.from('profiles').select('id')
  if (!users) return

  await Promise.allSettled(users.map((u) => sendPushToUser(u.id, payload)))
}
