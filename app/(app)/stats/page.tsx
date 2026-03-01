'use client'

import { useEffect, useState } from 'react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { Flame, Briefcase, Code2, Dumbbell, BookOpen } from 'lucide-react'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

interface WeekData {
  dates: string[]
  job: number[]
  leetcode: number[]
  gym: boolean[]
  skills: number[]
  streaks: { job: number; leetcode: number; gym: number; skills: number }
}

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
      const end = dateStrs[dateStrs.length - 1]

      const [jobRes, lcRes, gymRes, skillsRes] = await Promise.all([
        supabase.from('job_applications').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('leetcode_sessions').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('gym_sessions').select('date').eq('user_id', user.id).gte('date', start).lte('date', end).not('end_ts', 'is', null),
        supabase.from('learning_logs').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
      ])

      const count = (rows: { date: string }[] | null, d: string) =>
        (rows ?? []).filter((r) => r.date === d).length

      setData({
        dates: dateStrs,
        job: dateStrs.map((d) => count(jobRes.data, d)),
        leetcode: dateStrs.map((d) => count(lcRes.data, d)),
        gym: dateStrs.map((d) => count(gymRes.data, d) > 0),
        skills: dateStrs.map((d) => count(skillsRes.data, d)),
        streaks: { job: 0, leetcode: 0, gym: 0, skills: 0 }, // populated via RPC in prod
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  )

  if (!data) return null

  const totalJob = data.job.reduce((a, b) => a + b, 0)
  const totalLC = data.leetcode.reduce((a, b) => a + b, 0)
  const totalGym = data.gym.filter(Boolean).length
  const totalSkills = data.skills.reduce((a, b) => a + b, 0)

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Stats</h1>
        <p className="text-xs text-gray-500 mt-0.5">Last 7 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Briefcase size={18} />} label="Job Apps" value={totalJob} color="text-blue-400" />
        <StatCard icon={<Code2 size={18} />} label="LeetCode" value={totalLC} color="text-indigo-400" />
        <StatCard icon={<Dumbbell size={18} />} label="Gym Days" value={totalGym} color="text-green-400" />
        <StatCard icon={<BookOpen size={18} />} label="Skills Logs" value={totalSkills} color="text-purple-400" />
      </div>

      {/* Streaks */}
      <Card>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Flame size={16} className="text-orange-400" /> Streaks
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Job', value: data.streaks.job },
            { label: 'LeetCode', value: data.streaks.leetcode },
            { label: 'Gym', value: data.streaks.gym },
            { label: 'Skills', value: data.streaks.skills },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
              <span className="text-sm text-gray-300">{label}</span>
              <span className="font-bold text-orange-400">{value}d</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 7-day heatmap */}
      <Card>
        <h2 className="font-semibold text-white mb-3">7-Day Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <td className="pb-2 pr-2"></td>
                {data.dates.map((d) => (
                  <td key={d} className="pb-2 text-center font-medium">
                    {format(new Date(d + 'T12:00:00'), 'EEE')}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              {[
                { label: 'Jobs', values: data.job.map((v) => v > 0) },
                { label: 'LC',   values: data.leetcode.map((v) => v > 0) },
                { label: 'Gym',  values: data.gym },
                { label: 'Skill',values: data.skills.map((v) => v > 0) },
              ].map(({ label, values }) => (
                <tr key={label}>
                  <td className="pr-2 text-gray-400 py-1">{label}</td>
                  {values.map((v, i) => (
                    <td key={i} className="text-center py-1">
                      <span className={`inline-block w-5 h-5 rounded ${v ? 'bg-indigo-500' : 'bg-gray-800'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
