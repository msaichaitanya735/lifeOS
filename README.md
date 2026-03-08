# LifeOS

Production PWA for personal discipline — Next.js 15, Supabase, Trigger.dev scheduled jobs, VAPID push notifications. AI layer in active development.

---


## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase (Postgres + RLS) |
| Styling | Tailwind CSS v3 |
| Push | web-push (VAPID) |
| Jobs | Trigger.dev v3 |
| Deploy | Vercel |

---

## Features

- **Focus Rail** — Now / Next / Later block view with one-tap start/complete/skip
- **Plan Builder** — Morning ritual: set intention + schedule time blocks by category
- **Progress Log** — Log job apps, LeetCode sessions, skills, gym (with live timer)
- **Stats** — 7-day heatmap, streaks per domain, weekly totals
- **Push Notifications** — VAPID-based, per-device; EOD reports, gym nudges
- **Recovery / Replan** — If the day goes sideways, repack remaining blocks (minimal / catchup / reset mode)
- **PWA** — Installable, offline shell via Service Worker

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Trigger.dev](https://trigger.dev) project (optional for local dev)

### 1. Clone & Install

```bash
git clone <repo>
cd LifeOS
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (secret) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | same command |
| `VAPID_EMAIL` | your email |
| `TRIGGER_SECRET_KEY` | Trigger.dev dashboard |
| `TRIGGER_PROJECT_ID` | Trigger.dev dashboard |

### 3. Database

Run the migration in the Supabase SQL editor (or with `supabase db push` if using the CLI):

```bash
# with supabase CLI
supabase db push
```

The migration is at `supabase/migrations/001_initial.sql`.

> **Note:** The `get_streaks` RPC is referenced by the `/api/plan/today` route. If you haven't created it yet, the streaks will default to `{ job: 0, leetcode: 0, gym: 0, skills: 0 }`. See below for the SQL.

<details>
<summary>get_streaks SQL function</summary>

```sql
CREATE OR REPLACE FUNCTION get_streaks(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  job_streak INT := 0;
  lc_streak  INT := 0;
  gym_streak INT := 0;
  sk_streak  INT := 0;
  d DATE;
BEGIN
  -- job streak
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM job_applications WHERE user_id = p_user_id AND date = d);
    job_streak := job_streak + 1;
    d := d - 1;
  END LOOP;

  -- lc streak
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM leetcode_sessions WHERE user_id = p_user_id AND date = d);
    lc_streak := lc_streak + 1;
    d := d - 1;
  END LOOP;

  -- gym streak
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM gym_sessions WHERE user_id = p_user_id AND date = d AND end_ts IS NOT NULL);
    gym_streak := gym_streak + 1;
    d := d - 1;
  END LOOP;

  -- skills streak
  d := CURRENT_DATE;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM learning_logs WHERE user_id = p_user_id AND date = d);
    sk_streak := sk_streak + 1;
    d := d - 1;
  END LOOP;

  RETURN json_build_object('job', job_streak, 'leetcode', lc_streak, 'gym', gym_streak, 'skills', sk_streak);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

</details>

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Trigger.dev jobs (optional)

```bash
npm run trigger:dev
```

---

## Project Structure

```
LifeOS/
├── app/
│   ├── (auth)/            # Login, register pages
│   ├── (app)/             # Protected app shell
│   │   ├── page.tsx       # Focus Rail
│   │   ├── plan/          # Plan builder
│   │   ├── log/           # Progress logging
│   │   ├── stats/         # Stats & streaks
│   │   └── settings/      # Targets, push, account
│   ├── api/               # API routes
│   │   ├── plan/
│   │   ├── block/
│   │   ├── recovery/
│   │   ├── progress/
│   │   └── push/
│   ├── globals.css
│   └── layout.tsx
├── components/ui/         # Card, Button, Badge, BottomNav
├── lib/
│   ├── types.ts
│   ├── supabase/          # client.ts, server.ts
│   ├── push/send.ts       # VAPID push wrapper
│   ├── recovery/replan.ts # Rule-based replan logic
│   └── ai/stubs.ts        # Phase 2 AI placeholders
├── trigger/               # Trigger.dev scheduled jobs
├── public/
│   ├── sw.js              # Service worker
│   ├── manifest.json
│   └── icons/             # PWA icons (add manually)
├── supabase/migrations/
├── docs/alexa.md
└── middleware.ts
```

---

## Deployment

```bash
vercel --prod
```

Set all environment variables in the Vercel dashboard before deploying.

---

## PWA Icons

You'll need to place icon PNGs in `public/icons/`:

```
icon-72.png   icon-96.png   icon-128.png  icon-144.png
icon-152.png  icon-192.png  icon-384.png  icon-512.png
badge-72.png
```

A quick way to generate them from a single SVG:

```bash
npx pwa-asset-generator logo.svg public/icons --manifest public/manifest.json
```

---

## Phase 2 Roadmap

- [ ] Real AI insights via Anthropic Claude API (`lib/ai/stubs.ts` → real calls)
- [ ] Alexa voice skill (`docs/alexa.md`)
- [ ] Offline-first queue with Background Sync
- [ ] Calendar import/export (iCal)
- [ ] Multi-user / team mode
