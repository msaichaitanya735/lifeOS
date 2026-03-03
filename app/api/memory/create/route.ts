import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, type = 'reminder', frequency = 'daily' } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const nextRemind = new Date()
  nextRemind.setDate(nextRemind.getDate() + 1)

  const { data, error } = await supabase
    .from('memories')
    .insert({ user_id: user.id, content: content.trim(), type, frequency, next_remind_at: nextRemind.toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memory: data })
}
