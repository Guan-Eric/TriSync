# TriSync

Triathlon training for age-group athletes — curated plans, honest logging, brick-aware weeks, RevenueCat subscriptions, and wearable sync (Garmin, Apple Watch/Health, Strava).

## Stack

- Expo (iOS) + Expo Router
- Uniwind (Tailwind v4) styling
- Firebase Auth / Firestore (no Cloud Functions required)
- RevenueCat (`pro` entitlement)
- On-device wearables: Garmin + Apple HealthKit + Strava (tokens in SecureStore)
- Local demo mode when Firebase keys are unset

## Quick start

```bash
cp .env.example .env
npm install
npm start
```

Tap **Continue in demo mode** to exercise onboarding → Today → Week → logging. Use **Unlock Pro (local demo)** on the paywall to test gating and wearable settings.

Apple Health / Watch needs a **dev build**: `npx expo run:ios` (not Expo Go).

## Configure Firebase

Project **`trisync-app`** is set up. Config is loaded from `.env` via [`app.config.js`](./app.config.js) → `expo.extra` (Ascend-style), then read in app code with `expo-constants`.

- iOS app `com.trisync.app` + Web app
- Firestore `(default)` + security rules deployed
- `GoogleService-Info.plist` in repo root

Enable **Anonymous** + **Apple** sign-in:  
https://console.firebase.google.com/project/trisync-app/authentication/providers

After `eas init`, set `EAS_PROJECT_ID` in `.env`.

Blaze / Cloud Functions are **not required** for the current wearable design.

## Configure RevenueCat

RevenueCat project **TriSync** (`projd6e1113e`) is provisioned with:

- Entitlement: `pro`
- Test Store products: `trisync_weekly` ($9.99), `trisync_yearly` ($79.99)
- Offering `default` with `$rc_weekly` and `$rc_annual`
- Keys in `.env`

## Wearables (Pro)

All sync runs on-device — no backend proxy.

| Integration | What it does | Env |
|---|---|---|
| **Garmin** | OAuth + push prescribed workouts | `GARMIN_CLIENT_ID` (+ optional secret) |
| **Apple Watch** | Write workouts to HealthKit | Dev build + HealthKit capability |
| **Strava** | Post completed sessions as activities | `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` |

Connect from **Settings**. From a session log, use **Push workout to devices** or auto-sync on complete (non-missed).

## Ship

See [docs/app-store.md](./docs/app-store.md) for TestFlight / privacy checklist (include Health + Garmin disclosures).

## Product constitution

See [trisync_constitution.MD](./trisync_constitution.MD).
