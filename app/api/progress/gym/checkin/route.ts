import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('gym_sessions')
    .update({ checkin_ts: new Date().toISOString() })
    .eq('id', session_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
