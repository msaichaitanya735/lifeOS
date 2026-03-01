import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await sendPushToUser(user.id, {
    title: 'LifeOS',
    body: 'Push notifications are working!',
    url: '/',
    tag: 'test',
  })

  return NextResponse.json(result)
}
