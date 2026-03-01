import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { block_id, notes } = await req.json()
  if (!block_id) return NextResponse.json({ error: 'block_id required' }, { status: 400 })

  const update: Record<string, unknown> = { status: 'done', updated_at: new Date().toISOString() }
  if (notes) update.notes = notes

  const { data, error } = await supabase
    .from('plan_blocks')
    .update(update)
    .eq('id', block_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('events').insert({
    user_id: user.id,
    type: 'block.completed',
    payload: { block_id, notes },
  })

  return NextResponse.json(data)
}
