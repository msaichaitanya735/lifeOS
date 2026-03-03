-- ============================================================
-- Migration 003 — Daily Reflections + Memory System
-- ============================================================

-- ── Daily Reflections ─────────────────────────────────────────────────────────
-- Stores the end-of-day check-in answers for each day.
CREATE TABLE IF NOT EXISTS daily_reflections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,

  -- Day overview
  mood          INT,              -- 1-5 (1=terrible, 5=on fire)
  energy        INT,              -- 1-5
  plan_followed TEXT,             -- 'yes' | 'partial' | 'no' | 'no_plan'

  -- Job domain
  job_apps_count     INT DEFAULT 0,
  job_notes          TEXT,        -- callbacks, interviews, rejections

  -- LeetCode domain
  lc_solved          INT DEFAULT 0,
  lc_attempted       INT DEFAULT 0,
  lc_difficulty      JSONB DEFAULT '{"easy":0,"medium":0,"hard":0}',
  lc_topics          TEXT,
  lc_hardest         TEXT,        -- hardest problem title tried

  -- Skills / Learning domain
  skills_topic       TEXT,
  skills_insight     TEXT,        -- key takeaway
  skills_confidence  INT,         -- 1-5
  skills_minutes     INT,

  -- Gym domain
  gym_done           BOOLEAN DEFAULT FALSE,
  gym_muscles        TEXT[],      -- e.g. ['chest', 'triceps', 'shoulders']
  gym_duration_mins  INT,
  gym_highlight      TEXT,        -- PR or highlight exercise

  -- Reflection
  big_win            TEXT,
  one_struggle       TEXT,
  tomorrow_focus     TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- ── Memory System ──────────────────────────────────────────────────────────────
-- Things the user wants to be reminded of regularly.
CREATE TABLE IF NOT EXISTS memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'reminder',  -- 'reminder' | 'goal' | 'habit' | 'affirmation'
  frequency        TEXT NOT NULL DEFAULT 'daily',     -- 'daily' | 'weekly' | 'once'
  remind_time      TEXT DEFAULT '08:30',              -- HH:MM (in user's local time)
  next_remind_at   TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE daily_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_reflections" ON daily_reflections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_memories" ON memories
  FOR ALL USING (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER reflections_updated_at
  BEFORE UPDATE ON daily_reflections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
