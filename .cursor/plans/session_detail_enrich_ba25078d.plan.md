---
name: Session Detail Enrich
overview: Enrich hardcoded curated session details to match how professional triathlon coaches prescribe workouts (warmup / main / cooldown + purpose + cues), then surface them on tap — no AI generation.
todos:
  - id: schema
    content: Add SessionBlock + blocks/intensityLabel/coachCues to types; materialize in plans.ts
    status: completed
  - id: catalog
    content: Expand catalog.ts beginners/intermediate sessions with coach-style blocks
    status: completed
  - id: detail-ui
    content: Upgrade log/[id].tsx to show structured session detail + keep Pro lock + logging
    status: completed
  - id: compat
    content: Fallback for sessions without blocks; update catch-up simplify + wearable summary if needed
    status: completed
isProject: false
---

# Richer curated session details (coach-style, not AI)

## Research takeaway

Pro coaches and platforms ([TrainingPeaks](https://www.trainingpeaks.com/learn/articles/plan-workouts-more-efficiently-with-these-6-trainingpeaks-tips/), [80/20 Endurance](https://www.8020endurance.com/understanding-your-8020-triathlon-plan/), [MyProCoach](https://support.myprocoach.net/hc/en-us/articles/360022874592-Following-Your-Swim-Sets), [Triathlete / Bolton & Williamson](https://www.triathlete.com/training/how-to-design-your-own-workout/), TrainerRoad) converge on the same athlete-facing session shape:

| Coach field | What athletes see |
|---|---|
| Purpose / goal | Why this session exists in the week |
| Duration | Total time (and distance for swim) |
| Intensity language | Zones and/or RPE (not vague “easy”) |
| Warm-up | Priming block, often with drills/strides |
| Main set | Interval structure: reps × work / rest / zone |
| Cool-down | Easy return to baseline |
| Coach notes / cues | Form, cadence, transition, when to bail |
| Brick-specific | Bike block → transition target → run block |

What TriSync has today in [`content/plans/catalog.ts`](content/plans/catalog.ts) is only a one-line `prescription` + `whyItMatters` — closer to a calendar label than a coach prescription.

**Decision (locked):** keep details **hardcoded/curated** in the catalog (matches [`trisync_constitution.MD`](trisync_constitution.MD): curated plans, not an AI engine). Do **not** generate per-athlete pace/power/CSS in this pass (constitution v2+).

Intensity language for v1 copy: **RPE (1–10) + conversational zone labels** (e.g. “Z2 / conversational”), not FTP%/threshold pace that requires calibration UI.

## Data model

Extend [`lib/types.ts`](lib/types.ts) `PlanSessionTemplate` and `AthleteSession`:

```ts
type SessionBlock = {
  label: string;       // "Warm-up" | "Main set" | "Cool-down" | "Transition"
  detail: string;      // coach-readable steps, e.g. "10 min Z1–2 easy → 4×20s strides"
};

// on template + AthleteSession:
blocks: SessionBlock[];      // typically warm-up / main / cool-down; bricks include Transition
intensityLabel?: string;     // e.g. "Mostly Z2 · RPE 3–4"
coachCues?: string;          // short form/cadence/bail notes
// keep existing: title, prescription (one-line summary for list/wearables), whyItMatters, durationMinutes
```

Materialization in [`lib/plans.ts`](lib/plans.ts) copies the new fields into Firestore/local sessions. Catch-up simplify can still rewrite `prescription` / main-block text as it does today.

Backward compatibility: if an older session lacks `blocks`, the UI falls back to `prescription` only.

## Catalog content

Rewrite session builders in [`content/plans/catalog.ts`](content/plans/catalog.ts) so every non-rest session has:

- One-line `prescription` (list row + wearable push summary)
- `whyItMatters` (purpose)
- `blocks`: Warm-up, Main set, Cool-down (bricks: Bike → Transition → Run)
- `intensityLabel` + optional `coachCues`

Keep the current beginner/intermediate week generators, but expand each `s(...)` call with structured blocks scaled by the existing `scale` factor (durations in minutes; swim copy can stay time-based like today to avoid pool-length complexity).

Rest days stay short (optional mobility text; empty or single block).

After content change, re-seed is only needed if you rely on Firestore `plans` docs ([`scripts/seed-plans.ts`](scripts/seed-plans.ts)); app materialization already reads from catalog for new enrollments. Existing user sessions keep old text until race rebuild / new enrollment — acceptable for this pass.

## UI

Upgrade [`app/log/[id].tsx`](app/log/[id].tsx) into a real session detail + log screen:

1. Header: discipline badge, title, date, duration, intensity label
2. **Why it matters** card
3. **Session plan** cards: each `block` (Warm-up / Main / Cool-down / Transition)
4. Coach cues (if present)
5. Existing log buttons + wearable push
6. Free-tier lock: week 2+ still hides prescription/blocks behind Pro; logging stays available (current constitution behavior)

List rows ([`components/SessionRow.tsx`](components/SessionRow.tsx)) stay compact (title + why snippet); detail lives on tap.

## Out of scope

- AI-generated or personalized pace/power/CSS targets
- Full TrainingPeaks TSS/IF fields
- Per-rep structured workout builder for Garmin FIT steps (can map later from `blocks` text)
- Editing experience level / rewriting entire week templates beyond richer copy
