import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id, notes } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const update: Record<string, unknown> = { end_ts: new Date().toISOString() }
  if (notes) update.notes = notes

  const { data, error } = await supabase
    .from('gym_sessions')
    .update(update)
    .eq('id', session_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('events').insert({
    user_id: user.id,
    type: 'gym.completed',
    payload: { session_id },
  })

  return NextResponse.json(data)
}
