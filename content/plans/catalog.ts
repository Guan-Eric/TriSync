import type {
  Discipline,
  PlanSessionTemplate,
  PlanWeekTemplate,
  SessionBlock,
  TrainingPlan,
} from '@/lib/types';

function s(
  dayOffset: number,
  discipline: Discipline,
  title: string,
  prescription: string,
  whyItMatters: string,
  durationMinutes: number,
  blocks: SessionBlock[],
  intensityLabel?: string,
  coachCues?: string
): PlanSessionTemplate {
  return {
    dayOffset,
    discipline,
    title,
    prescription,
    whyItMatters,
    durationMinutes,
    blocks,
    intensityLabel,
    coachCues,
  };
}

function repeatBaseWeeks(
  weeks: number,
  builder: (week: number) => PlanWeekTemplate
): PlanWeekTemplate[] {
  return Array.from({ length: weeks }, (_, i) => builder(i + 1));
}

function makePlan(
  id: string,
  name: string,
  distance: TrainingPlan['distance'],
  level: TrainingPlan['level'],
  weeks: number,
  description: string,
  weeklyHoursTarget: TrainingPlan['weeklyHoursTarget'],
  weekTemplates: PlanWeekTemplate[]
): TrainingPlan {
  return { id, name, distance, level, weeks, description, weeklyHoursTarget, weekTemplates };
}

function beginnerWeek(week: number, scale: number): PlanWeekTemplate {
  const m = (n: number) => Math.round(n * scale);
  const recovery = week % 4 === 0;

  return {
    week,
    focus: recovery
      ? 'Recovery week — protect freshness across all three disciplines'
      : 'Build aerobic base with brick awareness',
    sessions: [
      s(
        0,
        'swim',
        'Technique swim',
        `${m(30)} min easy swim, focus on catch and rotation`,
        'Swim economy compounds across the season.',
        m(30),
        [
          {
            label: 'Warm-up',
            detail: `${m(6)} min easy freestyle (Z1–2 / RPE 2–3). Long, relaxed strokes.`,
          },
          {
            label: 'Main set',
            detail: recovery
              ? `${m(18)} min continuous easy freestyle. Every 3–4 min: 4 strokes catch-up drill, then resume freestyle.`
              : `${m(8)} min easy freestyle + ${m(4)} min drill (catch-up or fingertip drag) + ${m(8)} min steady freestyle (Z2 / RPE 3–4).`,
          },
          {
            label: 'Cool-down',
            detail: `${m(4)} min very easy choice stroke (Z1).`,
          },
        ],
        recovery ? 'Easy · RPE 2–3' : 'Mostly Z2 · RPE 3–4',
        'Think catch and rotation, not speed. If form collapses, shorten the main set.'
      ),
      s(
        1,
        'bike',
        'Endurance ride',
        `${m(45)} min steady Zone 2`,
        'Bike fitness carries the race — keep it conversational.',
        m(45),
        [
          {
            label: 'Warm-up',
            detail: `${m(8)} min easy spin Z1–2, cadence 85–95 rpm.`,
          },
          {
            label: 'Main set',
            detail: recovery
              ? `${m(30)} min steady Z1–2. Stay conversational the whole time.`
              : `${m(30)} min steady Z2 / RPE 3–4. Cadence 85–95 rpm. Conversational effort.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(7)} min easy spin Z1, soft pedaling.`,
          },
        ],
        recovery ? 'Easy · RPE 2–3' : 'Mostly Z2 · RPE 3–4',
        'If you cannot speak in full sentences, ease off. Trainer or outdoor both fine.'
      ),
      s(
        2,
        'run',
        'Easy run',
        `${m(30)} min easy run, soft surfaces if available`,
        'Keep run volume honest so brick days stay sustainable.',
        m(30),
        [
          {
            label: 'Warm-up',
            detail: `${m(5)} min walk → easy jog (Z1).`,
          },
          {
            label: 'Main set',
            detail: recovery
              ? `${m(20)} min easy jog Z1–2 / RPE 2–3. Soft surface if available.`
              : `${m(20)} min easy Z2 / RPE 3. Soft surfaces preferred. Finish with 3 × 15s relaxed strides + walk recoveries if legs feel good.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(5)} min walk + easy shakeout.`,
          },
        ],
        recovery ? 'Easy · RPE 2–3' : 'Mostly Z2 · RPE 3',
        'Nose breathing or full sentences. Stop early if a niggle appears.'
      ),
      s(
        3,
        'rest',
        'Rest or mobility',
        'Optional 20 min mobility / walk',
        'Adaptation happens off the bike and out of the pool.',
        20,
        [
          {
            label: 'Main set',
            detail:
              'Optional: 20 min easy walk or light mobility (hips, calves, thoracic spine). No intensity.',
          },
        ],
        'Recovery · RPE 1–2',
        'True rest is training. Skip mobility if you are wiped.'
      ),
      s(
        4,
        'brick',
        'Bike-to-run brick',
        `${m(40)} min easy bike → ${m(15)} min easy run off the bike`,
        'Brick logic: teach the legs to switch disciplines without panic.',
        m(55),
        [
          {
            label: 'Bike',
            detail: recovery
              ? `${m(35)} min easy Z1–2 spin. Keep cadence smooth.`
              : `${m(8)} min easy warm-up → ${m(32)} min steady Z2 bike (RPE 3–4).`,
          },
          {
            label: 'Transition',
            detail: 'Rack/dismount practice. Aim for under 2 minutes — shoes on, start the run.',
          },
          {
            label: 'Run',
            detail: recovery
              ? `${m(12)} min easy jog Z1–2. Short strides, quick feet.`
              : `${m(15)} min easy run off the bike (Z2 / RPE 3). Expect heavy legs for the first 5 min — settle, do not surge.`,
          },
        ],
        recovery ? 'Easy brick · RPE 2–3' : 'Steady brick · RPE 3–4',
        'The skill is the switch. Pace the run by feel, not ego.'
      ),
      s(
        5,
        'swim',
        'Endurance swim',
        `${m(35)} min continuous or long intervals`,
        'Time in water builds race-day confidence.',
        m(35),
        [
          {
            label: 'Warm-up',
            detail: `${m(7)} min easy freestyle + 4 × 25 easy pickups with full rest.`,
          },
          {
            label: 'Main set',
            detail: recovery
              ? `${m(22)} min continuous easy freestyle (Z1–2). Breathe every 3 when comfortable.`
              : `${m(22)} min continuous freestyle or long intervals (e.g. 4 × ${m(5)} min) at Z2 / RPE 3–4 with 30–45s rest.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(6)} min easy choice (Z1).`,
          },
        ],
        recovery ? 'Easy · RPE 2–3' : 'Mostly Z2 · RPE 3–4',
        'Sighting practice every few minutes if you race open water.'
      ),
      s(
        6,
        'run',
        'Longer easy run',
        `${m(40)} min easy`,
        'One longer run anchors weekly run load without intensity stacking.',
        m(40),
        [
          {
            label: 'Warm-up',
            detail: `${m(6)} min walk → easy jog.`,
          },
          {
            label: 'Main set',
            detail: recovery
              ? `${m(28)} min easy continuous Z1–2 / RPE 2–3.`
              : `${m(28)} min easy–steady Z2 / RPE 3. Even effort; slight negative split only if it feels natural.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(6)} min walk.`,
          },
        ],
        recovery ? 'Easy · RPE 2–3' : 'Mostly Z2 · RPE 3',
        'Fuel lightly if over 40 min. Flat route preferred on recovery weeks.'
      ),
    ],
  };
}

function intermediateWeek(week: number, scale: number): PlanWeekTemplate {
  const m = (n: number) => Math.round(n * scale);
  const deload = week % 4 === 0;

  return {
    week,
    focus: deload
      ? 'Deload — reduce intensity, keep touch across disciplines'
      : 'Quality work with managed cross-discipline fatigue',
    sessions: [
      s(
        0,
        'swim',
        'Threshold swim',
        `${m(40)} min with 4–6 × quality efforts`,
        'Race-pace feel in the water without wrecking the week.',
        m(40),
        [
          {
            label: 'Warm-up',
            detail: `${m(8)} min easy freestyle → 4 × 25 build to Z3 with full rest.`,
          },
          {
            label: 'Main set',
            detail: deload
              ? `${m(24)} min aerobic freestyle with occasional short pickups (Z2). No hard intervals.`
              : `${m(6)} min easy + 5 × (${m(3)} min strong Z3–4 / RPE 6–7, ${m(1)} min easy). Finish remaining time easy if needed.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(6)} min easy freestyle or backstroke (Z1).`,
          },
        ],
        deload ? 'Aerobic · RPE 3–4' : 'Quality · RPE 6–7 peaks',
        'Quality strokes under fatigue beat thrashing. Rest longer between reps if form breaks.'
      ),
      s(
        1,
        'bike',
        'Sweet-spot ride',
        `${m(60)} min with sweet-spot blocks`,
        'Bike power is the race engine for longer distances.',
        m(60),
        [
          {
            label: 'Warm-up',
            detail: `${m(12)} min progressive Z1 → Z2, include 3 × 30s high-cadence spins.`,
          },
          {
            label: 'Main set',
            detail: deload
              ? `${m(38)} min steady Z2. Skip sweet-spot; keep it aerobic.`
              : `2 × (${m(12)} min sweet-spot Z3 / RPE 6, ${m(4)} min easy Z1–2). Remaining time easy spin.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(10)} min easy Z1 spin.`,
          },
        ],
        deload ? 'Endurance · RPE 3–4' : 'Sweet-spot · RPE 6',
        'Cadence 85–95. If power/feel drifts above target, shorten the second block.'
      ),
      s(
        2,
        'run',
        'Quality run',
        `${m(40)} min with strides or tempo finish`,
        'Sharpen run economy while respecting prior-day bike load.',
        m(40),
        [
          {
            label: 'Warm-up',
            detail: `${m(10)} min easy jog + 4 × 20s strides with walk recoveries.`,
          },
          {
            label: 'Main set',
            detail: deload
              ? `${m(22)} min easy Z2. Optional 3 × 15s relaxed strides.`
              : `${m(18)} min easy → ${m(8)} min tempo Z3 / RPE 6 → ${m(4)} min easy.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(6)} min walk/jog easy.`,
          },
        ],
        deload ? 'Easy · RPE 3' : 'Tempo finish · RPE 6',
        'Yesterday’s bike counts. If legs are dead, keep the whole run easy.'
      ),
      s(
        3,
        'rest',
        'Active recovery',
        'Easy spin or walk 20–30 min',
        'Clear residual fatigue before the brick.',
        25,
        [
          {
            label: 'Main set',
            detail:
              '20–30 min easy spin or walk (Z1 / RPE 1–2). Optional light mobility. No intensity.',
          },
        ],
        'Recovery · RPE 1–2',
        'Protect tomorrow’s brick. Skip if sleep or stress is already high.'
      ),
      s(
        4,
        'brick',
        'Race-sim brick',
        `${m(50)} min bike → ${m(20)} min run at controlled effort`,
        'Same-day loading is the triathlon skill generic apps miss.',
        m(70),
        [
          {
            label: 'Bike',
            detail: deload
              ? `${m(40)} min easy–steady Z2. No race-pace pushes.`
              : `${m(10)} min warm-up → ${m(40)} min controlled Z2–3 bike (RPE 4–5), last ${m(8)} min closer to race effort.`,
          },
          {
            label: 'Transition',
            detail: 'Practice race transition. Target under 90 seconds.',
          },
          {
            label: 'Run',
            detail: deload
              ? `${m(15)} min easy jog off the bike.`
              : `${m(20)} min run: first ${m(8)} min settle easy, then controlled race-ish effort (Z3 / RPE 5–6).`,
          },
        ],
        deload ? 'Easy brick · RPE 3' : 'Race-sim · RPE 5–6',
        'Rehearse fueling on the bike. Do not bury the run — controlled beats heroic.'
      ),
      s(
        5,
        'swim',
        'Endurance swim',
        `${m(45)} min aerobic`,
        'Volume that supports open-water confidence.',
        m(45),
        [
          {
            label: 'Warm-up',
            detail: `${m(8)} min easy + 4 × 50 progressive with 15s rest.`,
          },
          {
            label: 'Main set',
            detail: deload
              ? `${m(30)} min continuous aerobic freestyle (Z2).`
              : `${m(30)} min aerobic freestyle or 3 × ${m(10)} min at Z2 / RPE 3–4 with 45s rest. Include brief sighting practice.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(7)} min easy choice (Z1).`,
          },
        ],
        deload ? 'Aerobic · RPE 3' : 'Mostly Z2 · RPE 3–4',
        'Long strokes. Use pull buoy for a portion if shoulders need a break.'
      ),
      s(
        6,
        'run',
        'Long run',
        `${m(55)} min easy–steady`,
        'Long run sits away from brick day to manage cumulative load.',
        m(55),
        [
          {
            label: 'Warm-up',
            detail: `${m(8)} min walk → easy jog.`,
          },
          {
            label: 'Main set',
            detail: deload
              ? `${m(40)} min easy Z1–2 continuous.`
              : `${m(40)} min easy–steady Z2 / RPE 3–4. Even effort; save a little for the last 10 min if feeling good.`,
          },
          {
            label: 'Cool-down',
            detail: `${m(7)} min walk.`,
          },
        ],
        deload ? 'Easy · RPE 2–3' : 'Steady long · RPE 3–4',
        'Fuel and hydrate. Flat-to-rolling route. Separate from brick day on purpose.'
      ),
    ],
  };
}

export const PLAN_CATALOG: TrainingPlan[] = [
  makePlan(
    'sprint_beginner',
    'Sprint · Beginner',
    'sprint',
    'beginner',
    8,
    'An 8-week introduction to triathlon rhythm with short bricks and sustainable volume.',
    { min: 4, max: 6 },
    repeatBaseWeeks(8, (w) => beginnerWeek(w, 0.85))
  ),
  makePlan(
    'sprint_intermediate',
    'Sprint · Intermediate',
    'sprint',
    'intermediate',
    8,
    'Sharper quality sessions and race-sim bricks for athletes with multi-sport experience.',
    { min: 5, max: 8 },
    repeatBaseWeeks(8, (w) => intermediateWeek(w, 0.9))
  ),
  makePlan(
    'olympic_beginner',
    'Olympic · Beginner',
    'olympic',
    'beginner',
    12,
    'Twelve weeks building toward Olympic distance with progressive brick exposure.',
    { min: 5, max: 8 },
    repeatBaseWeeks(12, (w) => beginnerWeek(w, 1))
  ),
  makePlan(
    'olympic_intermediate',
    'Olympic · Intermediate',
    'olympic',
    'intermediate',
    12,
    'Quality-focused Olympic prep with deliberate cross-discipline load management.',
    { min: 7, max: 10 },
    repeatBaseWeeks(12, (w) => intermediateWeek(w, 1.05))
  ),
  makePlan(
    'half_beginner',
    '70.3 · Beginner',
    'half',
    'beginner',
    16,
    'A patient 70.3 build — aerobic bike emphasis and durable brick practice.',
    { min: 7, max: 10 },
    repeatBaseWeeks(16, (w) => beginnerWeek(w, 1.15))
  ),
  makePlan(
    'half_intermediate',
    '70.3 · Intermediate',
    'half',
    'intermediate',
    16,
    'Intermediate 70.3 plan with longer bricks and structured intensity.',
    { min: 9, max: 12 },
    repeatBaseWeeks(16, (w) => intermediateWeek(w, 1.2))
  ),
  makePlan(
    'ironman_beginner',
    'Ironman · Beginner',
    'ironman',
    'beginner',
    24,
    'Long-cycle Ironman philosophy: patience, bike durability, and recovery as training.',
    { min: 9, max: 12 },
    repeatBaseWeeks(24, (w) => beginnerWeek(w, 1.3))
  ),
  makePlan(
    'ironman_intermediate',
    'Ironman · Intermediate',
    'ironman',
    'intermediate',
    24,
    'Intermediate Ironman build with substantial volume and disciplined deloads.',
    { min: 11, max: 15 },
    repeatBaseWeeks(24, (w) => intermediateWeek(w, 1.35))
  ),
];

export function getPlanById(id: string) {
  return PLAN_CATALOG.find((p) => p.id === id);
}

export function selectPlan(distance: TrainingPlan['distance'], level: TrainingPlan['level']) {
  return PLAN_CATALOG.find((p) => p.distance === distance && p.level === level);
}
