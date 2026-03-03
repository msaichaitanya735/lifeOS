'use client'

import { useEffect, useState } from 'react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { Flame, Briefcase, Code2, Dumbbell, BookOpen, SmilePlus } from 'lucide-react'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

interface Reflection {
  date: string
  mood: number | null
  energy: number | null
  gym_done: boolean
  job_apps_count: number
  lc_solved: number
  big_win: string | null
}

interface WeekData {
  dates: string[]
  job: number[]
  leetcode: number[]
  gym: boolean[]
  skills: number[]
  mood: (number | null)[]
  streaks: { job: number; leetcode: number; gym: number; skills: number }
  reflections: Reflection[]
}

const MOOD_EMOJI = ['', '😫', '😕', '🙂', '😄', '🔥']

export default function StatsPage() {
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const days = eachDayOfInterval({ start: subDays(today, 6), end: today })
      const dateStrs = days.map((d) => format(d, 'yyyy-MM-dd'))
      const start = dateStrs[0]
      const end   = dateStrs[dateStrs.length - 1]

      const [jobRes, lcRes, gymRes, skillsRes, streakRes, reflectRes] = await Promise.all([
        supabase.from('job_applications').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('leetcode_sessions').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('gym_sessions').select('date').eq('user_id', user.id).gte('date', start).lte('date', end).not('end_ts', 'is', null),
        supabase.from('learning_logs').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.rpc('get_streaks', { p_user_id: user.id }),
        supabase.from('daily_reflections')
          .select('date, mood, energy, gym_done, job_apps_count, lc_solved, big_win')
          .eq('user_id', user.id).gte('date', start).lte('date', end),
      ])

      const count = (rows: { date: string }[] | null, d: string) =>
        (rows ?? []).filter((r) => r.date === d).length

      const reflections: Reflection[] = reflectRes.data ?? []
      const reflectByDate = Object.fromEntries(reflections.map((r) => [r.date, r]))

      const defaultStreaks = { job: 0, leetcode: 0, gym: 0, skills: 0 }
      const streaks = (streakRes.data && !streakRes.error) ? streakRes.data : defaultStreaks

      setData({
        dates: dateStrs,
        job:      dateStrs.map((d) => count(jobRes.data, d)),
        leetcode: dateStrs.map((d) => count(lcRes.data, d)),
        gym:      dateStrs.map((d) => count(gymRes.data, d) > 0),
        skills:   dateStrs.map((d) => count(skillsRes.data, d)),
        mood:     dateStrs.map((d) => reflectByDate[d]?.mood ?? null),
        streaks,
        reflections,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-800 animate-pulse" />)}
    </div>
  )

  if (!data) return null

  const totalJob    = data.job.reduce((a, b) => a + b, 0)
  const totalLC     = data.leetcode.reduce((a, b) => a + b, 0)
  const totalGym    = data.gym.filter(Boolean).length
  const totalSkills = data.skills.reduce((a, b) => a + b, 0)
  const avgMood     = (() => {
    const vals = data.mood.filter((v): v is number => v !== null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  })()

  // Recent big wins
  const recentWins = data.reflections
    .filter((r) => r.big_win?.trim())
    .slice(-3)
    .reverse()

  return (
    <div className="px-4 pt-6 pb-24 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Stats</h1>
        <p className="text-xs text-gray-500 mt-0.5">Last 7 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Briefcase size={18} />} label="Job Apps"   value={totalJob}    color="text-blue-400" />
        <StatCard icon={<Code2 size={18} />}     label="LC Solved"  value={totalLC}     color="text-indigo-400" />
        <StatCard icon={<Dumbbell size={18} />}  label="Gym Days"   value={totalGym}    color="text-green-400" />
        <StatCard icon={<BookOpen size={18} />}  label="Skill Logs" value={totalSkills} color="text-purple-400" />
      </div>

      {/* Mood + Streaks row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="mb-1 text-pink-400"><SmilePlus size={18} /></div>
          <p className="text-2xl font-bold text-white">{avgMood ?? '—'}</p>
          <p className="text-xs text-gray-400">Avg mood</p>
        </Card>
        <Card className="flex flex-col justify-between">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-1">
            <Flame size={13} /> Streaks
          </p>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {[
              { label: 'Jobs', value: data.streaks.job },
              { label: 'LC',   value: data.streaks.leetcode },
              { label: 'Gym',  value: data.streaks.gym },
              { label: 'Skill',value: data.streaks.skills },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-base font-bold text-orange-400">{value}<span className="text-xs text-gray-600">d</span></p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 7-day activity heatmap */}
      <Card>
        <h2 className="font-semibold text-white mb-3">7-Day Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <td className="pb-2 pr-2 w-10"></td>
                {data.dates.map((d) => (
                  <td key={d} className="pb-2 text-center font-medium">
                    {format(new Date(d + 'T12:00:00'), 'EEE')}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Jobs',  values: data.job.map((v) => v > 0),      color: 'bg-blue-500' },
                { label: 'LC',    values: data.leetcode.map((v) => v > 0),  color: 'bg-indigo-500' },
                { label: 'Gym',   values: data.gym,                         color: 'bg-green-500' },
                { label: 'Skill', values: data.skills.map((v) => v > 0),    color: 'bg-purple-500' },
                { label: 'Mood',  values: data.mood.map((v) => v !== null), color: 'bg-pink-500' },
              ].map(({ label, values, color }) => (
                <tr key={label}>
                  <td className="pr-2 text-gray-400 py-1 text-right text-xs">{label}</td>
                  {values.map((v, i) => (
                    <td key={i} className="text-center py-1">
                      <span className={`inline-block w-5 h-5 rounded ${v ? color : 'bg-gray-800'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mood emojis row */}
        <div className="flex mt-2">
          <div className="w-10 pr-2" />
          {data.mood.map((m, i) => (
            <div key={i} className="flex-1 text-center text-base">
              {m ? MOOD_EMOJI[m] : <span className="text-gray-800 text-xs">·</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Recent wins */}
      {recentWins.length > 0 && (
        <Card>
          <h2 className="font-semibold text-white mb-3">🏆 Recent Wins</h2>
          <div className="space-y-2">
            {recentWins.map((r) => (
              <div key={r.date} className="bg-gray-800/60 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-500 mb-0.5">{format(new Date(r.date + 'T12:00:00'), 'EEE, MMM d')}</p>
                <p className="text-sm text-gray-200">{r.big_win}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </Card>
  )
}
