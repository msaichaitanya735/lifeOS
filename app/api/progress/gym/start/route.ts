import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = format(new Date(), 'yyyy-MM-dd')

  // Check if already active
  const { data: existing } = await supabase
    .from('gym_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)
    .is('end_ts', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Gym session already active' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('gym_sessions')
    .insert({ user_id: user.id, date: today, start_ts: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
