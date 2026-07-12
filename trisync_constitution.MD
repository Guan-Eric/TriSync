# TriSync: Triathlon Training — Product Constitution
*A founding document defining what this app is, who it serves, and how decisions get made.*

---

## 1. Mission

Give triathletes a training coach in their pocket that understands the thing generic fitness apps ignore: **triathlon is not three sports, it's one sport with three disciplines that constantly interact.** Brick sessions, cross-discipline fatigue, gear logistics, and race-distance-specific periodization are the product — not an afterthought bolted onto a running app.

We exist to replace the spreadsheet, the $150/month human coach, and the generic single-sport app — for the triathlete who wants structure without the price tag of a coach.

---

## 2. Who this is for

**Primary user:** The self-coached age-group triathlete training for a Sprint, Olympic, 70.3, or Ironman distance race, who currently uses a spreadsheet, a single-sport app stretched across three sports, or nothing at all.

**Not for (at least not v1):** Elite/pro athletes needing live coach feedback, swim-only or bike-only athletes, or multi-sport athletes who want a fully manual logging tool with zero prescription.

---

## 3. Core Principles (non-negotiable)

1. **The plan adapts to the athlete's life, not the other way around.** Missed sessions, illness, and bad weeks are inputs, not failures. The app rebuilds around them rather than making the athlete feel behind.
2. **Brick logic is a first-class citizen.** Any feature that treats swim/bike/run as three independent silos with no awareness of the others is a bug, not a shortcut.
3. **Distance-specific, not one-size-scaled.** A Sprint plan and an Ironman plan are different *training philosophies*, not the same plan with more weeks.
4. **Respect the athlete's existing gear and constraints.** Pool access, indoor trainer, wetsuit season, and daylight hours are real limits — the plan should ask, then work within them, not assume a perfect world.
5. **Simplicity over feature-stuffing.** Every screen answers "what do I do today and why" before it does anything else. Complexity is allowed under the hood, never on the surface.
6. **Design is part of the product, not decoration.** A clean, well-crafted look isn't cosmetic — for a solo-dev app competing with funded incumbents, aesthetic trust is a survival feature.
7. **Data honesty.** No fabricated social proof, no fake urgency in the paywall, no invented "coach" persona pretending to be a real human unless it clearly is AI-driven guidance.

---

## 4. Product Pillars

| Pillar | What it means in practice |
|---|---|
| **Personalized plan** | Race distance, experience level, weekly hours available, and target date drive a structured plan — not a generic template. |
| **Adaptive scheduling** | Missed/rough sessions trigger a rebalance, not silent drift into an outdated plan. |
| **Brick & load awareness** | The engine understands adjacent-day and same-day loading across disciplines when scheduling. |
| **Wearable integration** | Garmin (primary), Apple Watch, and Strava sync so workouts land on the athlete's device automatically. |
| **Shareable identity** | Race recaps and season summaries designed well enough that athletes want to post them — a growth loop, not just a feature. |

---

## 5. What v1 (MVP) actually is

Being honest about scope: a fully dynamic AI training engine (Runna's core moat) is a multi-year, funded-team build. v1 should **not** try to be that.

**v1 = curated expert-written static plans + smart logging, not a dynamic AI engine.**

- Plan library: Sprint / Olympic / 70.3 / Ironman × Beginner / Intermediate (8 plans to start)
- Onboarding: race distance, race date, experience level, weekly available hours, equipment access (pool/no pool, trainer/outdoor)
- Weekly view: this week's sessions across swim/bike/run/brick, with clear "why this session matters" notes
- Manual "how did it go" logging (easy / on target / hard / missed)
- Basic adaptive rule: 2+ missed sessions in a week triggers a simplified catch-up recommendation, not a full re-plan
- Garmin sync (workout push to device) — table stakes, not optional
- Weekly + yearly subscription via RevenueCat, 7-day trial on weekly

**Explicitly deferred to v2+:**
- Fully dynamic plan engine that rewrites future weeks based on performance data
- AI-generated pace/power targets from recent results
- Race recap / shareable season-in-review cards
- Strength & mobility integrated sessions
- Community / social features

---

## 6. Anti-goals (what this app will deliberately NOT do)

- Will not pretend a static plan is "AI-personalized" — copy and marketing must match what the engine actually does at each stage.
- Will not gate basic GPS/session logging behind the paywall — free tier should be a real (if limited) logbook, not a locked demo.
- Will not add features that only exist to justify a higher price tier if they don't serve the plan/adapt/brick core loop.
- Will not chase feature parity with Runna line-by-line. If a feature doesn't serve a triathlete specifically, it doesn't belong.

---

## 7. Monetization

- **Weekly plan** with short free trial (test against 3-day vs 7-day) — for athletes deciding close to race day or trying it out.
- **Yearly plan** at a meaningful discount — the primary target, since a full training cycle spans months and multiple races per year is common for this audience.
- Free tier: logging + a preview of week one of any plan (mirrors the "try before you commit" pattern that works well in this category).

---

## 8. Brand voice

Calm, competent, slightly understated — like a good coach, not a hype machine. Confidence without shouting. Copy should sound like it respects that the athlete already made the hard decision (signing up for a triathlon); the app's job is to make the training make sense, not to manufacture motivation through pressure tactics.

---

## 9. Success metrics (early stage)

- Plan completion rate (% of athletes who reach race week still engaged)
- Week-4 retention (the point where generic motivation fades and structure has to carry people)
- Trial-to-paid conversion on weekly plan
- Yearly plan share of new subscriptions (signals trust in the adaptive/curated value, not just impulse trial)

---

## 10. Amendment principle

This document changes when real athlete feedback or usage data contradicts an assumption here — not when a feature seems cool to build. Any pillar in Section 4 can be revisited; Section 3's core principles should only change with strong evidence they're actively hurting the product.