import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRecoveryBlocks } from '@/lib/recovery/replan'
import { RecoveryPayload, PlanBlock } from '@/lib/types'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: RecoveryPayload = await req.json()
  const { plan_id, mode } = body

  if (!plan_id || !mode) {
    return NextResponse.json({ error: 'plan_id and mode required' }, { status: 400 })
  }

  // Fetch existing blocks
  const { data: blocks, error: fetchErr } = await supabase
    .from('plan_blocks')
    .select('*')
    .eq('plan_id', plan_id)
    .order('start_time')

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const nowStr = format(new Date(), 'HH:mm')
  const newBlocks = buildRecoveryBlocks(blocks as PlanBlock[], mode, nowStr)

  // Mark all planned blocks as skipped
  await supabase
    .from('plan_blocks')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('plan_id', plan_id)
    .eq('status', 'planned')

  // Insert recovered blocks
  let inserted: PlanBlock[] = []
  if (newBlocks.length > 0) {
    const { data, error: insertErr } = await supabase
      .from('plan_blocks')
      .insert(newBlocks.map((b) => ({ ...b, plan_id })))
      .select()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    inserted = data ?? []
  }

  await supabase.from('events').insert({
    user_id: user.id,
    type: 'recovery.replanned',
    payload: { plan_id, mode, new_blocks: inserted.length },
  })

  return NextResponse.json({ recovered: inserted.length, blocks: inserted })
}
