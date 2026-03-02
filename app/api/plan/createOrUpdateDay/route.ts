import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateDayPayload } from '@/lib/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateDayPayload = await req.json()
  const { date, intention, blocks } = body

  if (!date || !blocks?.length) {
    return NextResponse.json({ error: 'date and blocks are required' }, { status: 400 })
  }

  // Upsert the daily plan
  const { data: plan, error: planErr } = await supabase
    .from('daily_plans')
    .upsert(
      { user_id: user.id, date, intention: intention ?? null, committed: true },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (planErr || !plan) {
    return NextResponse.json({ error: planErr?.message ?? 'Plan upsert failed' }, { status: 500 })
  }

  // Delete existing planned blocks (allow re-planning)
  await supabase
    .from('plan_blocks')
    .delete()
    .eq('plan_id', plan.id)
    .eq('status', 'planned')

  // Insert new blocks
  const insertRows = blocks.map((b) => ({
    plan_id: plan.id,
    start_time: b.start_time,
    end_time: b.end_time,
    category: b.category,
    title: b.title,
    notes: b.notes ?? null,
    status: 'planned',
  }))

  const { data: insertedBlocks, error: blocksErr } = await supabase
    .from('plan_blocks')
    .insert(insertRows)
    .select()

  if (blocksErr) {
    return NextResponse.json({ error: blocksErr.message }, { status: 500 })
  }

  return NextResponse.json({ plan, blocks: insertedBlocks })
}
