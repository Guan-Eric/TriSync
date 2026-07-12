import type { Discipline, PlanSessionTemplate, PlanWeekTemplate, TrainingPlan } from '@/lib/types';

function s(
  dayOffset: number,
  discipline: Discipline,
  title: string,
  prescription: string,
  whyItMatters: string,
  durationMinutes: number
): PlanSessionTemplate {
  return { dayOffset, discipline, title, prescription, whyItMatters, durationMinutes };
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
  return {
    week,
    focus:
      week % 4 === 0
        ? 'Recovery week — protect freshness across all three disciplines'
        : 'Build aerobic base with brick awareness',
    sessions: [
      s(0, 'swim', 'Technique swim', `${m(30)} min easy swim, focus on catch and rotation`, 'Swim economy compounds across the season.', m(30)),
      s(1, 'bike', 'Endurance ride', `${m(45)} min steady Zone 2`, 'Bike fitness carries the race — keep it conversational.', m(45)),
      s(2, 'run', 'Easy run', `${m(30)} min easy run, soft surfaces if available`, 'Keep run volume honest so brick days stay sustainable.', m(30)),
      s(3, 'rest', 'Rest or mobility', 'Optional 20 min mobility / walk', 'Adaptation happens off the bike and out of the pool.', 20),
      s(4, 'brick', 'Bike-to-run brick', `${m(40)} min easy bike → ${m(15)} min easy run off the bike`, 'Brick logic: teach the legs to switch disciplines without panic.', m(55)),
      s(5, 'swim', 'Endurance swim', `${m(35)} min continuous or long intervals`, 'Time in water builds race-day confidence.', m(35)),
      s(6, 'run', 'Longer easy run', `${m(40)} min easy`, 'One longer run anchors weekly run load without intensity stacking.', m(40)),
    ],
  };
}

function intermediateWeek(week: number, scale: number): PlanWeekTemplate {
  const m = (n: number) => Math.round(n * scale);
  return {
    week,
    focus:
      week % 4 === 0
        ? 'Deload — reduce intensity, keep touch across disciplines'
        : 'Quality work with managed cross-discipline fatigue',
    sessions: [
      s(0, 'swim', 'Threshold swim', `${m(40)} min with 4–6 × quality efforts`, 'Race-pace feel in the water without wrecking the week.', m(40)),
      s(1, 'bike', 'Sweet-spot ride', `${m(60)} min with sweet-spot blocks`, 'Bike power is the race engine for longer distances.', m(60)),
      s(2, 'run', 'Quality run', `${m(40)} min with strides or tempo finish`, 'Sharpen run economy while respecting prior-day bike load.', m(40)),
      s(3, 'rest', 'Active recovery', 'Easy spin or walk 20–30 min', 'Clear residual fatigue before the brick.', 25),
      s(4, 'brick', 'Race-sim brick', `${m(50)} min bike → ${m(20)} min run at controlled effort`, 'Same-day loading is the triathlon skill generic apps miss.', m(70)),
      s(5, 'swim', 'Endurance swim', `${m(45)} min aerobic`, 'Volume that supports open-water confidence.', m(45)),
      s(6, 'run', 'Long run', `${m(55)} min easy–steady`, 'Long run sits away from brick day to manage cumulative load.', m(55)),
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
