-- ============================================================
-- LifeOS — get_streaks RPC
-- Returns consecutive-day streaks for each domain.
-- ============================================================

CREATE OR REPLACE FUNCTION get_streaks(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  job_streak INT := 0;
  lc_streak  INT := 0;
  gym_streak INT := 0;
  sk_streak  INT := 0;
  d DATE;
BEGIN
  -- job streak (consecutive days with at least one application)
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM job_applications WHERE user_id = p_user_id AND date = d
    );
    job_streak := job_streak + 1;
    d := d - INTERVAL '1 day';
  END LOOP;

  -- leetcode streak
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM leetcode_sessions WHERE user_id = p_user_id AND date = d
    );
    lc_streak := lc_streak + 1;
    d := d - INTERVAL '1 day';
  END LOOP;

  -- gym streak (completed sessions only)
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM gym_sessions WHERE user_id = p_user_id AND date = d AND end_ts IS NOT NULL
    );
    gym_streak := gym_streak + 1;
    d := d - INTERVAL '1 day';
  END LOOP;

  -- skills streak
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM learning_logs WHERE user_id = p_user_id AND date = d
    );
    sk_streak := sk_streak + 1;
    d := d - INTERVAL '1 day';
  END LOOP;

  RETURN json_build_object(
    'job',      job_streak,
    'leetcode', lc_streak,
    'gym',      gym_streak,
    'skills',   sk_streak
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
