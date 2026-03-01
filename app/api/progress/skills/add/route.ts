import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, addDays } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic, notes, confidence, next_review_days, date } = await req.json()

  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const next_review_at = next_review_days
    ? addDays(new Date(), next_review_days).toISOString()
    : null

  const { data, error } = await supabase
    .from('learning_logs')
    .insert({
      user_id: user.id,
      date: date ?? format(new Date(), 'yyyy-MM-dd'),
      topic,
      notes: notes ?? null,
      confidence: confidence ?? 3,
      next_review_at,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
