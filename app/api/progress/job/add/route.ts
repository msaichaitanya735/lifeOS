import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company, role, link, status, notes, date } = await req.json()

  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      user_id: user.id,
      date: date ?? format(new Date(), 'yyyy-MM-dd'),
      company: company ?? null,
      role: role ?? null,
      link: link ?? null,
      status: status ?? 'applied',
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
