/**
 * Phase 2 AI stubs — replace with real Claude API calls when ready.
 * Each function returns a placeholder or mock response so the UI can
 * be built against these interfaces today.
 */

export interface AIInsight {
  headline: string
  detail: string
  actionable: string
}

/** Analyse the week's stats and return a motivational insight. */
export async function generateWeeklyInsight(stats: {
  jobApps: number
  leetcodeSolved: number
  gymDays: number
  skillsBlocks: number
}): Promise<AIInsight> {
  // TODO: replace with Anthropic SDK call
  return {
    headline: 'Solid week — keep the momentum!',
    detail: `You submitted ${stats.jobApps} job apps, solved ${stats.leetcodeSolved} LeetCode problems, hit the gym ${stats.gymDays} times, and logged ${stats.skillsBlocks} skills blocks.`,
    actionable: 'Try to add one more LeetCode problem tomorrow to strengthen your streak.',
  }
}

/** Suggest an optimised block schedule for tomorrow. */
export async function suggestTomorrowPlan(context: {
  timezone: string
  targets: { job_apps: number; leetcode: number; gym_days_per_week: number; skills_blocks: number }
  recentFatigue: 'low' | 'medium' | 'high'
}): Promise<{ title: string; category: string; start: string; end: string }[]> {
  // TODO: replace with AI planner
  void context
  return [
    { title: 'Job Applications', category: 'job', start: '09:00', end: '12:00' },
    { title: 'LeetCode', category: 'leetcode', start: '12:30', end: '13:30' },
    { title: 'Skills / Study', category: 'skills', start: '14:00', end: '15:30' },
    { title: 'Gym', category: 'gym', start: '17:00', end: '18:30' },
  ]
}

/** Detect a burnout risk from the last 7 days of data. */
export async function detectBurnoutRisk(recentData: {
  skippedBlocksLast7Days: number
  avgDailyDoneRatio: number
}): Promise<{ risk: 'low' | 'medium' | 'high'; message: string }> {
  // TODO: replace with real inference
  const { skippedBlocksLast7Days, avgDailyDoneRatio } = recentData
  if (skippedBlocksLast7Days > 10 || avgDailyDoneRatio < 0.4) {
    return { risk: 'high', message: 'High skip rate detected. Consider a lighter plan tomorrow.' }
  }
  if (skippedBlocksLast7Days > 5 || avgDailyDoneRatio < 0.65) {
    return { risk: 'medium', message: 'Some fatigue signals — build in more breaks.' }
  }
  return { risk: 'low', message: 'You\'re on a healthy rhythm.' }
}
