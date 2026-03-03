import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, memory, ...fields } = body

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  // Upsert the reflection
  const { data: reflection, error } = await supabase
    .from('daily_reflections')
    .upsert(
      { user_id: user.id, date, ...fields },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If user wrote something to remember, save it as a memory
  if (memory?.content?.trim()) {
    const now = new Date()
    const nextRemind = new Date(now)
    nextRemind.setDate(nextRemind.getDate() + 1)

    await supabase.from('memories').insert({
      user_id: user.id,
      content: memory.content.trim(),
      type: memory.type ?? 'reminder',
      frequency: memory.frequency ?? 'daily',
      next_remind_at: nextRemind.toISOString(),
    })
  }

  return NextResponse.json({ reflection })
}
