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
2. **Privacy policy URL** — set on both subscriptions in ASC (or via RevenueCat `set-product-store-state` → `privacy_policy_url`). Use `https://guan-eric.github.io/trisync-legal/privacy/`.
   - As of Jul 21, 2026 this was updated from the broken `https://www.gym-pulse.fit/trisync` (403) URL.
   - Both App Store products were still `REJECTED` / `needs_action` after that fix — they must be **resubmitted with the app version**, not fixed by rebuilding alone.
3. **First IAP with binary** — Apple requires the first subscription to be submitted **with a new app version**:
   - Upload binary (EAS / Xcode)
   - In App Store Connect → version page → **In-App Purchases and Subscriptions** → add `trisync_weekly` and `trisync_yearly`
   - Submit the version for review **together** with both IAPs (Rejected IAPs must be resubmitted with the app)
   - After one IAP is approved, later products can use RevenueCat `submit-products-to-store`
4. **Sandbox / TestFlight verify** with the `appl_` key: offerings resolve, purchase grants `pro`, restore works.
5. **EAS production secret** — `REVENUECAT_API_KEY` must be the App Store public SDK key (`appl_…`).
   - **Visibility must be Sensitive (or Plain text), NOT Secret.**
   - Expo does not expose `Secret` vars when resolving `app.config.js` in EAS CLI, so `extra.revenuecatApiKey` can be baked empty into TestFlight builds even though the var exists in the dashboard.
   - Public RevenueCat SDK keys are meant to ship in the client anyway; Secret is for things like `NPM_TOKEN`, not `appl_…`.
   - After changing visibility, rebuild (config is baked at build time).
   - Release builds no longer fall back to the Test Store key.

### Why App Review saw an error on the subscription page

The paywall (`app/paywall.tsx`) shows an error card when `getOfferings()` returns no current packages. Common causes for TriSync:

| Cause | What reviewers see |
|-------|--------------------|
| Production build missing `appl_` key (or only `test_` baked in) | “Subscription options could not be loaded…” |
| IAPs not attached to the version under review | Empty packages / StoreKit cannot resolve products |
| Privacy policy URL unset on auto-renewables | Products incomplete; may fail sandbox fetch |
| Paid Apps Agreement not Active | StoreKit returns no products |

After fixing ASC metadata, rebuild with `REVENUECAT_API_KEY=appl_…`, verify on a physical iPhone **and** iPad sandbox, then resubmit the binary **with** both subscriptions.

## Optional polish

1. **Paywall template** — Optional. The app uses a native package list (`purchasePackage`), not `RevenueCatUI.Paywall`, so a dashboard paywall is not required for purchases to work. If you later create a paywall for `default` in RevenueCat, you can switch the screen to `RevenueCatUI.Paywall`.
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
