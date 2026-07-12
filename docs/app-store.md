# App Store Connect checklist (iOS)

Bundle ID: `com.trisync.app`
Name: TriSync
Subtitle: Triathlon training that adapts

## Privacy nutrition labels (draft)

- **Health & Fitness**: Workout plans and session logs; Apple Health / Watch workout writes
- **Identifiers**: User ID (Firebase Auth / RevenueCat)
- **Purchases**: Subscription status via RevenueCat / App Store
- **Diagnostics**: Crash/performance if enabled later

Third-party: Garmin Connect OAuth (workout push), Strava OAuth (completed activities). Tokens stay on-device in SecureStore.

## Screenshots to capture

1. Today — session + why it matters
2. Week — swim/bike/run/brick
3. Onboarding — distance selection
4. Paywall — weekly trial + yearly (no fake urgency)
5. Settings — Garmin connect

## TestFlight

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest submit --platform ios --profile production
```

Replace `extra.eas.projectId` in `app.json` after `eas init`.
