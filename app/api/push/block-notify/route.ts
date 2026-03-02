import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'

/**
 * POST /api/push/block-notify
 * Body: { block_id, type: 'start_reminder' | 'checkin' }
 *
 * Sends a push to the authenticated user for a specific block.
 * Used when the user taps "Remind me in 5 min" inside the app.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { block_id, type } = await req.json()
  if (!block_id || !type) return NextResponse.json({ error: 'block_id and type required' }, { status: 400 })

  const { data: block, error } = await supabase
    .from('plan_blocks')
    .select('title, start_time, status')
    .eq('id', block_id)
    .single()

  if (error || !block) return NextResponse.json({ error: 'Block not found' }, { status: 404 })

  const payload =
    type === 'checkin'
      ? {
          title: '🔄 Still going?',
          body: `Are you still working on "${block.title}"?`,
          url: '/',
          tag: `checkin-${block_id}`,
        }
      : {
          title: '⏰ Block reminder',
          body: `"${block.title}" starts at ${block.start_time.slice(0, 5)}. Ready?`,
          url: '/',
          tag: `reminder-${block_id}`,
        }

  const result = await sendPushToUser(user.id, payload)
  return NextResponse.json(result)
}
