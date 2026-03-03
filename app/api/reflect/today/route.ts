import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd')

  const { data: reflection } = await supabase
    .from('daily_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  return NextResponse.json({ reflection: reflection ?? null })
}
