'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Briefcase, Code2, BookOpen, Dumbbell } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { clsx } from 'clsx'

type Domain = 'job' | 'leetcode' | 'skills' | 'gym'

const TABS: { key: Domain; label: string; Icon: React.ElementType }[] = [
  { key: 'job',      label: 'Job',      Icon: Briefcase },
  { key: 'leetcode', label: 'LC',       Icon: Code2 },
  { key: 'skills',   label: 'Skills',   Icon: BookOpen },
  { key: 'gym',      label: 'Gym',      Icon: Dumbbell },
]

export default function LogPage() {
  const [tab, setTab] = useState<Domain>('job')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function post(endpoint: string, body: object) {
    setLoading(true); setError(''); setSaved(false)
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setLoading(false)
    if (res.ok) setSaved(true)
    else { const d = await res.json(); setError(d.error ?? 'Error') }
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Progress Log</h1>
        <p className="text-xs text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMM d')}</p>
      </div>

      {/* Domain tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSaved(false); setError('') }}
            className={clsx(
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {saved && <p className="text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-2">Logged successfully!</p>}
      {error && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

      {tab === 'job' && <JobForm onSubmit={(b) => post('/api/progress/job/add', b)} loading={loading} />}
      {tab === 'leetcode' && <LCForm onSubmit={(b) => post('/api/progress/leetcode/add', b)} loading={loading} />}
      {tab === 'skills' && <SkillsForm onSubmit={(b) => post('/api/progress/skills/add', b)} loading={loading} />}
      {tab === 'gym' && <GymForm onPost={post} loading={loading} />}
    </div>
  )
}

function JobForm({ onSubmit, loading }: { onSubmit: (b: object) => void; loading: boolean }) {
  const [f, setF] = useState({ company: '', role: '', link: '', notes: '' })
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-white">Job Application</h2>
      {(['company', 'role', 'link', 'notes'] as const).map((key) => (
        <div key={key}>
          <label className="block text-xs text-gray-400 mb-1 capitalize">{key}</label>
          <input
            value={f[key]}
            onChange={(e) => setF({ ...f, [key]: e.target.value })}
            className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={key === 'link' ? 'https://…' : key}
          />
        </div>
      ))}
      <Button size="md" loading={loading} onClick={() => onSubmit(f)} className="w-full">Log Application</Button>
    </Card>
  )
}

function LCForm({ onSubmit, loading }: { onSubmit: (b: object) => void; loading: boolean }) {
  const [f, setF] = useState({ title: '', difficulty: 'medium', topic: '', minutes: '', result: 'solved' })
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-white">LeetCode Session</h2>
      <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}
        placeholder="Problem title" className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none" />
      <div className="flex gap-2">
        <select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}
          className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })}
          className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none">
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
        </select>
      </div>
      <input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}
        placeholder="Topic (e.g. DP, Graph)" className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none" />
      <input type="number" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })}
        placeholder="Minutes spent" className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none" />
      <Button size="md" loading={loading} onClick={() => onSubmit({ ...f, minutes: Number(f.minutes) || null })} className="w-full">Log LeetCode</Button>
    </Card>
  )
}

function SkillsForm({ onSubmit, loading }: { onSubmit: (b: object) => void; loading: boolean }) {
  const [f, setF] = useState({ topic: '', notes: '', confidence: '3', next_review_days: '' })
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-white">Learning Log</h2>
      <input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}
        placeholder="Topic *" required className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none" />
      <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
        placeholder="Notes / key learnings" rows={3}
        className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none resize-none" />
      <div className="flex gap-2 items-center">
        <label className="text-xs text-gray-400 whitespace-nowrap">Confidence (1-5)</label>
        <input type="range" min="1" max="5" value={f.confidence} onChange={(e) => setF({ ...f, confidence: e.target.value })} className="flex-1" />
        <span className="text-sm font-bold text-indigo-400 w-4">{f.confidence}</span>
      </div>
      <input type="number" value={f.next_review_days} onChange={(e) => setF({ ...f, next_review_days: e.target.value })}
        placeholder="Review in N days (optional)" className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none" />
      <Button size="md" loading={loading} onClick={() => onSubmit({ ...f, confidence: Number(f.confidence), next_review_days: Number(f.next_review_days) || null })} className="w-full">Log Skill</Button>
    </Card>
  )
}

function GymForm({ onPost, loading }: { onPost: (endpoint: string, body: object) => void; loading: boolean }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  async function startGym() {
    const res = await fetch('/api/progress/gym/start', { method: 'POST' })
    if (res.ok) { const d = await res.json(); setSessionId(d.id) }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-white">Gym Session</h2>
      {!sessionId ? (
        <Button size="md" loading={loading} onClick={startGym} className="w-full">Start Gym Session</Button>
      ) : (
        <>
          <p className="text-sm text-green-400">Session active — session ID: <span className="font-mono text-xs">{sessionId.slice(0, 8)}…</span></p>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Session notes"
            className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm focus:outline-none" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={loading} onClick={() => onPost('/api/progress/gym/checkin', { session_id: sessionId })} className="flex-1">Check-in</Button>
            <Button size="sm" variant="danger" loading={loading} onClick={() => onPost('/api/progress/gym/end', { session_id: sessionId, notes })} className="flex-1">End Session</Button>
          </div>
        </>
      )}
    </Card>
  )
}
