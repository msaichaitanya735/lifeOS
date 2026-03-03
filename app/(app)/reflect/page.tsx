'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  ChevronRight, ChevronLeft, CheckCircle2,
  Briefcase, Code2, BookOpen, Dumbbell, Star, Brain,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { clsx } from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReflectionState {
  // Step 1 — Overview
  mood: number          // 1-5
  energy: number        // 1-5
  plan_followed: string // 'yes' | 'partial' | 'no' | 'no_plan'
  // Step 2 — Jobs
  job_apps_count: number
  job_notes: string
  // Step 3 — LeetCode
  lc_solved: number
  lc_attempted: number
  lc_difficulty: { easy: number; medium: number; hard: number }
  lc_topics: string
  lc_hardest: string
  // Step 4 — Skills
  skills_topic: string
  skills_insight: string
  skills_confidence: number
  skills_minutes: number
  // Step 5 — Gym
  gym_done: boolean
  gym_muscles: string[]
  gym_duration_mins: number
  gym_highlight: string
  // Step 6 — Reflect + Memory
  big_win: string
  one_struggle: string
  tomorrow_focus: string
  memory_content: string
  memory_type: string
  memory_frequency: string
}

const INITIAL: ReflectionState = {
  mood: 0, energy: 0, plan_followed: '',
  job_apps_count: 0, job_notes: '',
  lc_solved: 0, lc_attempted: 0,
  lc_difficulty: { easy: 0, medium: 0, hard: 0 },
  lc_topics: '', lc_hardest: '',
  skills_topic: '', skills_insight: '', skills_confidence: 3, skills_minutes: 0,
  gym_done: false, gym_muscles: [], gym_duration_mins: 0, gym_highlight: '',
  big_win: '', one_struggle: '', tomorrow_focus: '',
  memory_content: '', memory_type: 'reminder', memory_frequency: 'daily',
}

const MOODS = [
  { v: 1, emoji: '😫', label: 'Rough' },
  { v: 2, emoji: '😕', label: 'Meh' },
  { v: 3, emoji: '🙂', label: 'OK' },
  { v: 4, emoji: '😄', label: 'Good' },
  { v: 5, emoji: '🔥', label: 'Fired up' },
]

const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body']

const STEPS = [
  { id: 'overview',  label: 'Day',      Icon: Star },
  { id: 'jobs',      label: 'Jobs',     Icon: Briefcase },
  { id: 'leetcode',  label: 'LC',       Icon: Code2 },
  { id: 'skills',    label: 'Skills',   Icon: BookOpen },
  { id: 'gym',       label: 'Gym',      Icon: Dumbbell },
  { id: 'reflect',   label: 'Reflect',  Icon: Brain },
]

// ── Inner page (uses useSearchParams) ─────────────────────────────────────────
function ReflectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd')

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ReflectionState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)

  // Check if reflection already submitted today
  useEffect(() => {
    fetch(`/api/reflect/today?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.reflection) {
          setAlreadyDone(true)
          // Pre-populate form with existing data
          const r = d.reflection
          setForm({
            mood: r.mood ?? 0,
            energy: r.energy ?? 0,
            plan_followed: r.plan_followed ?? '',
            job_apps_count: r.job_apps_count ?? 0,
            job_notes: r.job_notes ?? '',
            lc_solved: r.lc_solved ?? 0,
            lc_attempted: r.lc_attempted ?? 0,
            lc_difficulty: r.lc_difficulty ?? { easy: 0, medium: 0, hard: 0 },
            lc_topics: r.lc_topics ?? '',
            lc_hardest: r.lc_hardest ?? '',
            skills_topic: r.skills_topic ?? '',
            skills_insight: r.skills_insight ?? '',
            skills_confidence: r.skills_confidence ?? 3,
            skills_minutes: r.skills_minutes ?? 0,
            gym_done: r.gym_done ?? false,
            gym_muscles: r.gym_muscles ?? [],
            gym_duration_mins: r.gym_duration_mins ?? 0,
            gym_highlight: r.gym_highlight ?? '',
            big_win: r.big_win ?? '',
            one_struggle: r.one_struggle ?? '',
            tomorrow_focus: r.tomorrow_focus ?? '',
            memory_content: '',
            memory_type: 'reminder',
            memory_frequency: 'daily',
          })
        }
      })
      .catch(() => {})
  }, [date])

  function set<K extends keyof ReflectionState>(key: K, value: ReflectionState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleMuscle(m: string) {
    const current = form.gym_muscles
    set('gym_muscles', current.includes(m) ? current.filter((x) => x !== m) : [...current, m])
  }

  async function submit() {
    setSaving(true)
    const { memory_content, memory_type, memory_frequency, ...fields } = form
    const body: Record<string, unknown> = { date, ...fields }
    if (memory_content.trim()) {
      body.memory = { content: memory_content, type: memory_type, frequency: memory_frequency }
    }
    await fetch('/api/reflect/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setDone(true)
  }

  // ── Done screen ──
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <div className="text-6xl animate-bounce">🎉</div>
        <h1 className="text-2xl font-bold text-white">Day logged!</h1>
        <p className="text-gray-400 text-sm max-w-xs">
          Your reflection for {format(new Date(date + 'T12:00:00'), 'MMMM d')} is saved.
          {form.memory_content.trim() ? ' Your memory has been noted and you\'ll be reminded.' : ''}
        </p>
        {form.big_win.trim() && (
          <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-2xl px-5 py-4 max-w-xs w-full">
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-1">Today&apos;s Win</p>
            <p className="text-white text-sm">{form.big_win}</p>
          </div>
        )}
        <Button onClick={() => router.push('/')} className="w-full max-w-xs mt-2">
          Back to Focus Rail
        </Button>
      </div>
    )
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Progress bar */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest">End of Day · {format(new Date(date + 'T12:00:00'), 'MMM d')}</p>
          <p className="text-xs text-gray-600">{step + 1}/{STEPS.length}</p>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        {/* Step pills */}
        <div className="flex gap-1.5 mt-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={clsx(
                'flex-1 flex flex-col items-center py-1.5 rounded-xl text-xs font-medium transition-all',
                i === step ? 'bg-indigo-600 text-white' :
                i < step   ? 'bg-green-900/40 text-green-400' :
                              'bg-gray-800 text-gray-600'
              )}
            >
              <s.Icon size={12} className="mb-0.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-28">
        {step === 0 && <StepOverview form={form} set={set} alreadyDone={alreadyDone} />}
        {step === 1 && <StepJobs form={form} set={set} />}
        {step === 2 && <StepLeetCode form={form} set={set} />}
        {step === 3 && <StepSkills form={form} set={set} />}
        {step === 4 && <StepGym form={form} set={set} toggleMuscle={toggleMuscle} />}
        {step === 5 && <StepReflect form={form} set={set} />}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 px-5 py-3 flex gap-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="flex items-center gap-1">
            <ChevronLeft size={16} /> Back
          </Button>
        )}
        {isLast ? (
          <Button loading={saving} onClick={submit} className="flex-1 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> Save Reflection
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} className="flex-1 flex items-center justify-center gap-2">
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1 — Overview ────────────────────────────────────────────────────────
function StepOverview({ form, set, alreadyDone }: { form: ReflectionState; set: <K extends keyof ReflectionState>(k: K, v: ReflectionState[K]) => void; alreadyDone: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">How was your day?</h2>
        {alreadyDone && <p className="text-xs text-indigo-400 mt-1">You already reflected today — updating your answers.</p>}
      </div>

      {/* Mood */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">Overall mood</p>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.v}
              onClick={() => set('mood', m.v)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all',
                form.mood === m.v ? 'border-indigo-500 bg-indigo-900/30' : 'border-gray-800 bg-gray-900'
              )}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-xs text-gray-400">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">
          Energy level <span className="text-indigo-400 font-bold">{form.energy}/5</span>
        </p>
        <input
          type="range" min={1} max={5} value={form.energy || 3}
          onChange={(e) => set('energy', Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Drained</span><span>Wired</span>
        </div>
      </div>

      {/* Plan adherence */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">Did you follow your plan?</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'yes',     label: '✅ Yes, nailed it' },
            { v: 'partial', label: '🟡 Partially' },
            { v: 'no',      label: '❌ Not really' },
            { v: 'no_plan', label: '📋 Had no plan' },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => set('plan_followed', v)}
              className={clsx(
                'rounded-xl px-4 py-3 text-sm font-medium border transition-all text-left',
                form.plan_followed === v
                  ? 'bg-indigo-900/30 border-indigo-600 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 2 — Jobs ─────────────────────────────────────────────────────────────
function StepJobs({ form, set }: { form: ReflectionState; set: <K extends keyof ReflectionState>(k: K, v: ReflectionState[K]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">💼 Job Hunt</h2>
        <p className="text-sm text-gray-400 mt-1">How many applications did you send today?</p>
      </div>

      <div className="flex items-center gap-4 bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <button
          onClick={() => set('job_apps_count', Math.max(0, form.job_apps_count - 1))}
          className="w-10 h-10 rounded-xl bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 transition-colors"
        >−</button>
        <div className="flex-1 text-center">
          <p className="text-4xl font-bold text-white tabular-nums">{form.job_apps_count}</p>
          <p className="text-xs text-gray-500 mt-1">applications</p>
        </div>
        <button
          onClick={() => set('job_apps_count', form.job_apps_count + 1)}
          className="w-10 h-10 rounded-xl bg-indigo-600 text-white text-xl font-bold hover:bg-indigo-500 transition-colors"
        >+</button>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">Any responses? (callbacks, rejections, interviews)</p>
        <textarea
          value={form.job_notes}
          onChange={(e) => set('job_notes', e.target.value)}
          placeholder="e.g. Got a callback from Google, rejected by Amazon…"
          rows={3}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {form.job_apps_count === 0 && (
        <div className="bg-orange-900/20 border border-orange-800/50 rounded-xl px-4 py-3">
          <p className="text-sm text-orange-300">No applications today — that&apos;s OK. What got in the way?</p>
          <input
            value={form.job_notes}
            onChange={(e) => set('job_notes', e.target.value)}
            placeholder="What happened?"
            className="mt-2 w-full bg-transparent border-b border-orange-800 text-sm text-gray-300 placeholder-gray-600 focus:outline-none py-1"
          />
        </div>
      )}
    </div>
  )
}

// ── Step 3 — LeetCode ─────────────────────────────────────────────────────────
function StepLeetCode({ form, set }: { form: ReflectionState; set: <K extends keyof ReflectionState>(k: K, v: ReflectionState[K]) => void }) {
  const total = form.lc_difficulty.easy + form.lc_difficulty.medium + form.lc_difficulty.hard

  function setDiff(level: 'easy' | 'medium' | 'hard', val: number) {
    const updated = { ...form.lc_difficulty, [level]: Math.max(0, val) }
    set('lc_difficulty', updated)
    set('lc_solved', updated.easy + updated.medium + updated.hard)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">🧩 LeetCode</h2>
        <p className="text-sm text-gray-400 mt-1">Problems you worked on today</p>
      </div>

      {/* Difficulty breakdown */}
      <div className="space-y-3">
        {[
          { level: 'easy'   as const, color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800/50',  label: 'Easy' },
          { level: 'medium' as const, color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/50', label: 'Medium' },
          { level: 'hard'   as const, color: 'text-red-400',    bg: 'bg-red-900/30 border-red-800/50',     label: 'Hard' },
        ].map(({ level, color, bg, label }) => (
          <div key={level} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${bg}`}>
            <span className={`text-sm font-semibold w-14 ${color}`}>{label}</span>
            <button onClick={() => setDiff(level, form.lc_difficulty[level] - 1)}
              className="w-8 h-8 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-700">−</button>
            <span className={`flex-1 text-center text-xl font-bold tabular-nums ${color}`}>
              {form.lc_difficulty[level]}
            </span>
            <button onClick={() => setDiff(level, form.lc_difficulty[level] + 1)}
              className="w-8 h-8 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-700">+</button>
          </div>
        ))}
        <p className="text-center text-sm text-gray-500">Total: <span className="text-white font-bold">{total}</span> problems</p>
      </div>

      {total > 0 && (
        <>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Topics covered</p>
            <input
              value={form.lc_topics}
              onChange={(e) => set('lc_topics', e.target.value)}
              placeholder="e.g. Dynamic Programming, BFS, Sliding Window"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Hardest problem you attempted</p>
            <input
              value={form.lc_hardest}
              onChange={(e) => set('lc_hardest', e.target.value)}
              placeholder="Problem title"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-1">Also attempted but not solved</p>
            <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <button onClick={() => set('lc_attempted', Math.max(0, form.lc_attempted - 1))}
                className="w-8 h-8 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-700">−</button>
              <span className="flex-1 text-center text-xl font-bold text-gray-300">{form.lc_attempted}</span>
              <button onClick={() => set('lc_attempted', form.lc_attempted + 1)}
                className="w-8 h-8 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-700">+</button>
            </div>
          </div>
        </>
      )}

      {total === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 text-center">
          <p className="text-gray-500 text-sm">No problems today — consistency is built day by day. Tomorrow is a new shot.</p>
        </div>
      )}
    </div>
  )
}

// ── Step 4 — Skills ───────────────────────────────────────────────────────────
function StepSkills({ form, set }: { form: ReflectionState; set: <K extends keyof ReflectionState>(k: K, v: ReflectionState[K]) => void }) {
  const studied = form.skills_topic.trim().length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">📚 Learning</h2>
        <p className="text-sm text-gray-400 mt-1">What did you study or work on today?</p>
      </div>

      <input
        value={form.skills_topic}
        onChange={(e) => set('skills_topic', e.target.value)}
        placeholder="Topic / technology / concept"
        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {studied && (
        <>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Key insight or takeaway</p>
            <textarea
              value={form.skills_insight}
              onChange={(e) => set('skills_insight', e.target.value)}
              placeholder="The one thing you'd tell yourself tomorrow"
              rows={3}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">
              Confidence in this topic <span className="text-indigo-400 font-bold">{form.skills_confidence}/5</span>
            </p>
            <input
              type="range" min={1} max={5} value={form.skills_confidence}
              onChange={(e) => set('skills_confidence', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Confused</span><span>Got it</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Time spent (minutes)</p>
            <input
              type="number"
              value={form.skills_minutes || ''}
              onChange={(e) => set('skills_minutes', Number(e.target.value))}
              placeholder="e.g. 90"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Step 5 — Gym ──────────────────────────────────────────────────────────────
function StepGym({ form, set, toggleMuscle }: {
  form: ReflectionState
  set: <K extends keyof ReflectionState>(k: K, v: ReflectionState[K]) => void
  toggleMuscle: (m: string) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">🏋️ Gym</h2>
        <p className="text-sm text-gray-400 mt-1">Did you train today?</p>
      </div>

      <div className="flex gap-3">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => set('gym_done', v)}
            className={clsx(
              'flex-1 py-4 rounded-2xl border-2 text-sm font-semibold transition-all',
              form.gym_done === v && v ? 'bg-green-900/30 border-green-600 text-green-300' :
              form.gym_done === v && !v ? 'bg-gray-800 border-gray-600 text-gray-300' :
                                         'bg-gray-900 border-gray-800 text-gray-500'
            )}
          >
            {v ? '💪 Yes, I trained!' : '❌ Rest day'}
          </button>
        ))}
      </div>

      {form.gym_done && (
        <>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">Muscle groups trained</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={clsx(
                    'rounded-xl px-4 py-2 text-sm font-medium border transition-all',
                    form.gym_muscles.includes(m)
                      ? 'bg-green-900/30 border-green-600 text-green-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Session duration (minutes)</p>
            <input
              type="number"
              value={form.gym_duration_mins || ''}
              onChange={(e) => set('gym_duration_mins', Number(e.target.value))}
              placeholder="e.g. 75"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Highlight or PR 🏆</p>
            <input
              value={form.gym_highlight}
              onChange={(e) => set('gym_highlight', e.target.value)}
              placeholder="e.g. Hit 100kg bench for the first time!"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Step 6 — Reflect ──────────────────────────────────────────────────────────
function StepReflect({ form, set }: { form: ReflectionState; set: <K extends keyof ReflectionState>(k: K, v: ReflectionState[K]) => void }) {
  const [addMemory, setAddMemory] = useState(false)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">🌟 Reflect</h2>
        <p className="text-sm text-gray-400 mt-1">Close the day with intention</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">🏆 Biggest win today</p>
        <textarea
          value={form.big_win}
          onChange={(e) => set('big_win', e.target.value)}
          placeholder="Even small wins count — what are you proud of?"
          rows={2}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">🧱 One thing that held you back</p>
        <textarea
          value={form.one_struggle}
          onChange={(e) => set('one_struggle', e.target.value)}
          placeholder="What friction showed up? Distraction, mood, unclear task?"
          rows={2}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">🎯 Tomorrow&apos;s main focus</p>
        <input
          value={form.tomorrow_focus}
          onChange={(e) => set('tomorrow_focus', e.target.value)}
          placeholder="One thing that must happen tomorrow"
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Memory section */}
      {!addMemory ? (
        <button
          onClick={() => setAddMemory(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-700 text-sm text-gray-500 hover:border-indigo-600 hover:text-indigo-400 transition-all"
        >
          + Add something to remember
        </button>
      ) : (
        <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-indigo-300">🧠 Add to memory</p>
          <input
            value={form.memory_content}
            onChange={(e) => set('memory_content', e.target.value)}
            placeholder="What should you be reminded of?"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <select
              value={form.memory_frequency}
              onChange={(e) => set('memory_frequency', e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="daily">Daily reminder</option>
              <option value="weekly">Weekly reminder</option>
              <option value="once">Just once</option>
            </select>
            <select
              value={form.memory_type}
              onChange={(e) => set('memory_type', e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="reminder">Reminder</option>
              <option value="goal">Goal</option>
              <option value="habit">Habit</option>
              <option value="affirmation">Affirmation</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page export (Suspense boundary for useSearchParams) ───────────────────────
export default function ReflectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /></div>}>
      <ReflectInner />
    </Suspense>
  )
}
