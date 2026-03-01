// ============================================================
// LifeOS — Shared TypeScript types
// ============================================================

export type Category = 'job' | 'leetcode' | 'skills' | 'gym' | 'admin' | 'personal'
export type BlockStatus = 'planned' | 'active' | 'done' | 'skipped'
export type LeetcodeDifficulty = 'easy' | 'medium' | 'hard'
export type LeetcodeResult = 'solved' | 'attempted'

// ---- Database row types ----

export interface Profile {
  id: string
  timezone: string
  notification_prefs: NotificationPrefs
  daily_targets: DailyTargets
  created_at: string
  updated_at: string
}

export interface NotificationPrefs {
  job: boolean
  leetcode: boolean
  skills: boolean
  gym: boolean
  end_of_day: boolean
  end_of_day_time: string      // "21:00"
  block_reminder_minutes: number
}

export interface DailyTargets {
  job_apps: number
  leetcode: number
  gym_days_per_week: number
  skills_blocks: number
}

export interface DailyPlan {
  id: string
  user_id: string
  date: string        // YYYY-MM-DD
  intention: string | null
  committed: boolean
  created_at: string
}

export interface PlanBlock {
  id: string
  plan_id: string
  start_time: string  // HH:MM:SS
  end_time: string    // HH:MM:SS
  category: Category
  title: string
  status: BlockStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  user_id: string
  date: string
  company: string | null
  role: string | null
  link: string | null
  status: string
  notes: string | null
  created_at: string
}

export interface LeetcodeSession {
  id: string
  user_id: string
  date: string
  title: string | null
  difficulty: LeetcodeDifficulty | null
  topic: string | null
  minutes: number | null
  result: LeetcodeResult | null
  created_at: string
}

export interface LearningLog {
  id: string
  user_id: string
  date: string
  topic: string
  notes: string | null
  confidence: number    // 1-5
  next_review_at: string | null
  created_at: string
}

export interface GymSession {
  id: string
  user_id: string
  date: string
  start_ts: string
  end_ts: string | null
  checkin_ts: string | null
  notes: string | null
  created_at: string
}

export interface GymExercise {
  id: string
  session_id: string
  name: string
  sets: number | null
  reps: number | null
  weight: number | null
  duration_sec: number | null
  created_at: string
}

export interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface AppEvent {
  id: string
  user_id: string
  ts: string
  type: string
  payload: Record<string, unknown>
}

// ---- API request/response types ----

export interface CreateDayPayload {
  date: string
  intention?: string
  blocks: CreateBlockPayload[]
}

export interface CreateBlockPayload {
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  category: Category
  title: string
  notes?: string
}

export interface TodayResponse {
  plan: DailyPlan | null
  blocks: PlanBlock[]
  progress: DomainProgress
  activeGymSession: GymSession | null
}

export interface DomainProgress {
  job_apps_today: number
  leetcode_today: number
  skills_today: number
  gym_done_today: boolean
  streaks: DomainStreaks
}

export interface DomainStreaks {
  job: number
  leetcode: number
  gym: number
  skills: number
}

export type RecoveryMode = 'minimal' | 'catchup' | 'reset'

export interface RecoveryPayload {
  plan_id: string
  mode: RecoveryMode
}
