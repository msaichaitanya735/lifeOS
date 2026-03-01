-- ============================================================
-- LifeOS — Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Enums ----
CREATE TYPE category AS ENUM ('job', 'leetcode', 'skills', 'gym', 'admin', 'personal');
CREATE TYPE block_status AS ENUM ('planned', 'active', 'done', 'skipped');

-- ---- profiles ----
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone            TEXT NOT NULL DEFAULT 'America/New_York',
  notification_prefs  JSONB NOT NULL DEFAULT '{
    "job": true,
    "leetcode": true,
    "skills": true,
    "gym": true,
    "end_of_day": true,
    "end_of_day_time": "21:00",
    "block_reminder_minutes": 5
  }',
  daily_targets       JSONB NOT NULL DEFAULT '{
    "job_apps": 25,
    "leetcode": 2,
    "gym_days_per_week": 5,
    "skills_blocks": 1
  }',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- daily_plans ----
CREATE TABLE daily_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  intention   TEXT,
  committed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ---- plan_blocks ----
CREATE TABLE plan_blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  category    category NOT NULL,
  title       TEXT NOT NULL,
  status      block_status NOT NULL DEFAULT 'planned',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- events (audit log) ----
CREATE TABLE events (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ts       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type     TEXT NOT NULL,
  payload  JSONB NOT NULL DEFAULT '{}'
);

-- ---- job_applications ----
CREATE TABLE job_applications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  company     TEXT,
  role        TEXT,
  link        TEXT,
  status      TEXT NOT NULL DEFAULT 'applied',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- leetcode_sessions ----
CREATE TABLE leetcode_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  title       TEXT,
  difficulty  TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic       TEXT,
  minutes     INTEGER,
  result      TEXT CHECK (result IN ('solved', 'attempted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- learning_logs ----
CREATE TABLE learning_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  topic           TEXT NOT NULL,
  notes           TEXT,
  confidence      INTEGER CHECK (confidence BETWEEN 1 AND 5),
  next_review_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- gym_sessions ----
CREATE TABLE gym_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  start_ts    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_ts      TIMESTAMPTZ,
  checkin_ts  TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- gym_exercises ----
CREATE TABLE gym_exercises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES gym_sessions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sets          INTEGER,
  reps          INTEGER,
  weight        NUMERIC,
  duration_sec  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- push_subscriptions ----
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_blocks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leetcode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_exercises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "own_profile_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- daily_plans
CREATE POLICY "own_plans" ON daily_plans FOR ALL USING (auth.uid() = user_id);

-- plan_blocks (via plan ownership)
CREATE POLICY "own_blocks" ON plan_blocks FOR ALL USING (
  auth.uid() = (SELECT user_id FROM daily_plans WHERE id = plan_id)
);

-- events
CREATE POLICY "own_events" ON events FOR ALL USING (auth.uid() = user_id);

-- job_applications
CREATE POLICY "own_job_apps" ON job_applications FOR ALL USING (auth.uid() = user_id);

-- leetcode_sessions
CREATE POLICY "own_leetcode" ON leetcode_sessions FOR ALL USING (auth.uid() = user_id);

-- learning_logs
CREATE POLICY "own_learning" ON learning_logs FOR ALL USING (auth.uid() = user_id);

-- gym_sessions
CREATE POLICY "own_gym_sessions" ON gym_sessions FOR ALL USING (auth.uid() = user_id);

-- gym_exercises (via session ownership)
CREATE POLICY "own_gym_exercises" ON gym_exercises FOR ALL USING (
  auth.uid() = (SELECT user_id FROM gym_sessions WHERE id = session_id)
);

-- push_subscriptions
CREATE POLICY "own_push_subs" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_daily_plans_user_date    ON daily_plans(user_id, date DESC);
CREATE INDEX idx_plan_blocks_plan         ON plan_blocks(plan_id, start_time);
CREATE INDEX idx_events_user_ts           ON events(user_id, ts DESC);
CREATE INDEX idx_job_apps_user_date       ON job_applications(user_id, date DESC);
CREATE INDEX idx_leetcode_user_date       ON leetcode_sessions(user_id, date DESC);
CREATE INDEX idx_learning_user_date       ON learning_logs(user_id, date DESC);
CREATE INDEX idx_gym_sessions_user_date   ON gym_sessions(user_id, date DESC);
CREATE INDEX idx_push_subs_user           ON push_subscriptions(user_id);
