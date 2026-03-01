# Alexa / Voice Integration (Phase 2)

> **Status:** Planned — Phase 2. This doc is a design spec, not yet implemented.

## Goal

Allow the user to log progress and get a quick status report via Alexa voice commands, without touching their phone.

---

## Alexa Skill Overview

| Intent | Utterance Example | Action |
|---|---|---|
| LogJobApp | "Alexa, tell LifeOS I applied to Google" | POST `/api/progress/job/add` |
| LogLeetcode | "Alexa, tell LifeOS I solved a medium today" | POST `/api/progress/leetcode/add` |
| StartGym | "Alexa, tell LifeOS I'm at the gym" | POST `/api/progress/gym/start` |
| EndGym | "Alexa, tell LifeOS gym done" | POST `/api/progress/gym/end` with active session |
| StatusReport | "Alexa, ask LifeOS how's my day going?" | GET `/api/plan/today` → summary |

---

## Architecture

```
User Voice ──► Alexa Skill (Alexa Developer Console)
                      │
                      ▼
             AWS Lambda (Node.js handler)
                      │  Authorization: Bearer <API_KEY>
                      ▼
             LifeOS API (Next.js on Vercel)
                      │
                      ▼
               Supabase (Postgres)
```

### Authentication

The Alexa skill uses **Account Linking** (OAuth 2.0) backed by Supabase Auth.

1. User links their LifeOS account in the Alexa app.
2. Supabase issues an access token.
3. Lambda includes the token in `Authorization: Bearer` header on every LifeOS API call.

---

## Lambda Handler Skeleton (future)

```typescript
import Alexa from 'ask-sdk-core'

const LogJobAppHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === 'IntentRequest'
      && input.requestEnvelope.request.intent.name === 'LogJobApp'
  },
  async handle(input) {
    const token = input.requestEnvelope.session.user.accessToken
    await fetch('https://lifeos.app/api/progress/job/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: null, status: 'applied' }),
    })
    return input.responseBuilder.speak('Got it, application logged.').getResponse()
  },
}
```

---

## Setup Steps (when implementing)

1. Create Alexa skill in [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
2. Enable **Account Linking** → Supabase Auth OAuth app.
3. Define intents / sample utterances in the skill interaction model.
4. Deploy Lambda handler with `ask-sdk-core`.
5. Add `ALEXA_SKILL_ID` env var to Vercel for request verification.
6. Test with Alexa simulator or an Echo device.
