# Phase 3 — RevenueCat

App code is wired for RevenueCat. App Store products are provisioned in RevenueCat and pushed to App Store Connect.

## Project (RevenueCat)

- **Project:** TriSync (`projd6e1113e`)
- **Entitlement:** `pro` (TriSync Pro) — Test Store + App Store products attached
- **Offering:** `default` — `$rc_weekly`, `$rc_annual` (each package has Test Store + App Store products)
- **Test Store products:** `trisync_weekly`, `trisync_yearly`
- **App Store products:** `trisync_weekly` (`prodb6d30a68e5`), `trisync_yearly` (`prodfe4734be15`)
- **iOS app:** `app269f25981d` · bundle ID `com.guan-eric.trisync`
- **Subscription group:** TriSync Pro
- **Pricing:** Weekly $9.99 (7-day free trial) · Yearly $79.99
- **ASC status:** both products `READY_TO_SUBMIT` (territory prices equalized)

## Environment

`.env` should include:

```bash
# Sandbox / dev builds (Test Store)
REVENUECAT_TEST_API_KEY=test_...

# Production App Store builds
REVENUECAT_API_KEY=appl_...
```

Dev builds prefer `REVENUECAT_TEST_API_KEY` when set. EAS production builds must inject `REVENUECAT_API_KEY` (`appl_…`).

## Remaining App Store Connect steps (manual)

1. **Paid Applications Agreement** + banking/tax active in App Store Connect.
2. **Privacy policy URL** — set on both subscriptions in ASC (or via RevenueCat `set-product-store-state` → `privacy_policy_url`). Currently unset.
3. **First IAP with binary** — Apple requires the first subscription to be submitted **with a new app version**:
   - Upload binary (EAS / Xcode)
   - In App Store Connect → version page → **In-App Purchases and Subscriptions** → add `trisync_weekly` and `trisync_yearly`
   - Submit the version for review
   - After one IAP is approved, later products can use RevenueCat `submit-products-to-store`
4. **Sandbox / TestFlight verify** with the `appl_` key: offerings resolve, purchase grants `pro`, restore works.

## Optional polish

1. **Paywall template** — Create a paywall in RevenueCat for `default` (calm copy, no urgency). Until then, the app falls back to a native package list.
2. **Customer Center** — Configure self-service actions (manage, restore, support) in RevenueCat dashboard.

## App behavior

| Free | Pro (`pro`) |
|------|-------------|
| Logging + history | Full multi-week plan |
| Week 1 prescriptions | Adaptive catch-up |
| | Apple Watch templates + Strava import (Garmin later) |

- Firebase `uid` is passed to `Purchases.logIn` on sign-in.
- Paywall: `/paywall` (RevenueCatUI when available).
- Settings: manage subscription + restore.

## Verify (native / TestFlight)

1. Launch app → console shows RevenueCat configured with `appl_` key (release) or `test_` (dev).
2. Sign in → Customer in RC dashboard matches Firebase `uid`.
3. Open paywall → weekly + yearly packages load from StoreKit.
4. Sandbox purchase → `pro` entitlement active; week 2+ unlocks.
5. Restore purchases works after reinstall.
