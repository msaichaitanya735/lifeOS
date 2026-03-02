import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TodayResponse } from '@/lib/types'
import { format } from 'date-fns'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use client-supplied date to avoid UTC vs local-timezone mismatch on Vercel
  const { searchParams } = new URL(req.url)
  const today = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd')

  // Plan + blocks
  const { data: plan } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  const { data: blocks } = plan
    ? await supabase
        .from('plan_blocks')
        .select('*')
        .eq('plan_id', plan.id)
        .order('start_time')
    : { data: [] }

  // Progress counts for today
  const [jobRes, lcRes, skillsRes, gymRes, streakRes] = await Promise.all([
    supabase.from('job_applications').select('id', { count: 'exact' }).eq('user_id', user.id).eq('date', today),
    supabase.from('leetcode_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).eq('date', today),
    supabase.from('learning_logs').select('id', { count: 'exact' }).eq('user_id', user.id).eq('date', today),
    supabase.from('gym_sessions').select('id', { count: 'exact' }).eq('user_id', user.id).eq('date', today).not('end_ts', 'is', null),
    supabase.rpc('get_streaks', { p_user_id: user.id }),
  ])

  // Active gym session (started but not ended)
  const { data: activeGym } = await supabase
    .from('gym_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .is('end_ts', null)
    .maybeSingle()

  // get_streaks RPC may not exist yet — fall back to zeros
  const streaks = (streakRes.data && !streakRes.error)
    ? streakRes.data
    : { job: 0, leetcode: 0, gym: 0, skills: 0 }

  const response: TodayResponse = {
    plan: plan ?? null,
    blocks: blocks ?? [],
    progress: {
      job_apps_today: jobRes.count ?? 0,
      leetcode_today: lcRes.count ?? 0,
      skills_today: skillsRes.count ?? 0,
      gym_done_today: (gymRes.count ?? 0) > 0,
      streaks,
    },
    activeGymSession: activeGym ?? null,
  }

  return NextResponse.json(response)
}
