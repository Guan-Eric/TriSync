# Phase 3 — RevenueCat

App code is wired for RevenueCat. Finish these dashboard / store steps before TestFlight billing tests.

## Project (RevenueCat)

- **Project:** TriSync (`projd6e1113e`)
- **Entitlement:** `pro` (TriSync Pro)
- **Offering:** `default` — `$rc_weekly`, `$rc_annual`
- **Test Store products:** `trisync_weekly`, `trisync_yearly`
- **iOS app bundle ID:** `com.guan-eric.trisync` (updated in RevenueCat)

## Environment

`.env` should include:

```bash
# Sandbox / dev builds (Test Store)
REVENUECAT_TEST_API_KEY=test_...

# Production App Store builds
REVENUECAT_API_KEY=appl_...
```

Dev builds prefer `REVENUECAT_TEST_API_KEY` when set.

## Manual dashboard steps

1. **Weekly trial (Test Store)** — On `trisync_weekly`, add a **7-day free trial** introductory offer.
2. **App Store products** — Create matching subscriptions in App Store Connect (`trisync_weekly`, `trisync_yearly`), attach to RevenueCat iOS app, and link to `pro` + `default` offering packages.
3. **Paywall template** — Create a paywall in RevenueCat for the `default` offering (calm copy, no urgency). Until then, the app falls back to a native package list.
4. **Customer Center** — Configure self-service actions (manage, restore, support) in RevenueCat dashboard.
5. **App Store Connect API** — Add In-App Purchase key to RevenueCat iOS app for StoreKit 2 validation.

## App behavior

| Free | Pro (`pro`) |
|------|-------------|
| Logging + history | Full multi-week plan |
| Week 1 prescriptions | Adaptive catch-up |
| | Garmin / Health / Strava sync |

- Firebase `uid` is passed to `Purchases.logIn` on sign-in.
- Paywall: `/paywall` (RevenueCatUI when available).
- Settings: manage subscription + restore.

## Verify (native dev build)

1. Launch app → console shows RevenueCat configured.
2. Sign in → Customer in RC dashboard matches Firebase `uid`.
3. Open paywall → weekly + yearly packages load.
4. Sandbox purchase → `pro` entitlement active; week 2+ unlocks.
5. Restore purchases works after reinstall.
