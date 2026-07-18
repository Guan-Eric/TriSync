# App Store Connect checklist (iOS)

Bundle ID: `com.guan-eric.trisync`
Name: TriSync
Subtitle: Triathlon training that adapts

## Legal / support URLs (GitHub Pages)

- Support: https://guan-eric.github.io/trisync-legal/support/
- Privacy Policy: https://guan-eric.github.io/trisync-legal/privacy/
- Terms of Use: https://guan-eric.github.io/trisync-legal/terms/
- Repo: https://github.com/Guan-Eric/trisync-legal

Source files also live at `GymPulse/docs/trisync/` for local edits; push updates to `trisync-legal` to republish.

## Subscriptions (RevenueCat → ASC)

Products are created and priced in App Store Connect via RevenueCat:

| Product ID | Price | Trial | ASC status |
|------------|-------|-------|------------|
| `trisync_weekly` | $9.99/week | 7-day free | Ready to Submit |
| `trisync_yearly` | $79.99/year | — | Ready to Submit |

Subscription group: **TriSync Pro**

### First submission (required)

Apple will not approve the first IAP alone. On your **first version** submit:

1. Confirm Paid Apps Agreement + banking/tax are active.
2. Add a public **privacy policy URL** on both subscriptions (required for auto-renewables).
3. Upload the binary (`eas build` / `eas submit`).
4. On the version page → **In-App Purchases and Subscriptions** → add both products.
5. Submit the version for review together with the IAPs.

After one subscription is approved, later IAP updates can use RevenueCat’s submit-to-store flow.

## Privacy nutrition labels (draft)

- **Health & Fitness**: Workout plans and session logs; Apple Health / Watch workout writes
- **Identifiers**: User ID (Firebase Auth / RevenueCat)
- **Purchases**: Subscription status via RevenueCat / App Store
- **Diagnostics**: Crash/performance if enabled later

Third-party: Strava OAuth (import activities you post — TriSync does not post for you). Apple Health / WorkoutKit (send startable workout templates to Watch). Garmin Connect OAuth pending developer approval.

## Screenshots to capture

1. Today — session + why it matters
2. Week — swim/bike/run/brick
3. Onboarding — distance selection
4. Paywall — weekly trial + yearly (no fake urgency)
5. Settings — wearable sync

## TestFlight

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest submit --platform ios --profile production
```

Ensure production EAS secrets include `REVENUECAT_API_KEY` (`appl_…`), not only the Test Store key.
