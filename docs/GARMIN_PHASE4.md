# Phase 4 — Garmin workout push

Prescribed sessions can be pushed to Garmin Connect so they appear on the athlete's watch.

## Architecture

| Mode | OAuth | Token storage | Workout push |
|------|--------|---------------|--------------|
| **Firebase** (production) | Expo AuthSession PKCE on device | `users/{uid}/integrations/garmin` via Cloud Functions | `garminPushWorkout` callable |
| **Local demo** (`USE_LOCAL_DATA=true`) | Same PKCE flow | Expo SecureStore on device | Direct Training API from app |

## Cloud Functions

Deploy after setting secrets:

```bash
npx -y firebase-tools@latest functions:secrets:set GARMIN_CLIENT_ID
npx -y firebase-tools@latest functions:secrets:set GARMIN_CLIENT_SECRET
npm run functions:build
npx -y firebase-tools@latest deploy --only functions
```

| Function | Purpose |
|----------|---------|
| `garminExchangeCode` | Exchange OAuth code; store refresh token server-side |
| `garminDisconnect` | Delete tokens; set `garminConnected: false` |
| `garminPushWorkout` | Push one session; save `garminWorkoutId` on session doc |

Token refresh failures and invalid Garmin responses clear `garminConnected` automatically.

## Garmin Connect Developer Program

1. Register app at [Garmin Developer](https://developer.garmin.com/) (Connect Developer Program).
2. OAuth redirect URI: `trisync://garmin` (scheme `trisync` in `app.config.js`).
3. Scopes: `ACTIVITY_WRITE`, `WORKOUT_IMPORT`.
4. Add `GARMIN_CLIENT_ID` to `.env` (client) and Firebase secrets (functions).

## App behavior

- **Pro only** — Garmin connect and push are gated behind `pro` entitlement.
- **Connect** (Settings) — OAuth → exchange via CF → push next 7 days of unpushed sessions.
- **Today** — Auto-pushes today's sessions when Garmin is connected (silent).
- **Log** — Manual "Push workout to devices" + sync on log (non-missed).
- **Plan rebuild** — After race/distance/level change, unpushed upcoming sessions sync to Garmin.

Workout payload: title, rich description (blocks / RPE / cues), sport, estimated duration.

## Verify

1. Deploy functions with Garmin secrets.
2. Native dev build with `GARMIN_CLIENT_ID` in `.env`.
3. Pro user → Settings → Connect Garmin → authorize.
4. Check Firestore `users/{uid}/integrations/garmin` exists; profile `garminConnected: true`.
5. Open Today — session should get `garminWorkoutId` after push.
6. Workout visible in Garmin Connect app / watch.

## Out of scope (v1)

- Activity pull from Garmin
- Structured FIT step-by-step intervals (text prescription only)
