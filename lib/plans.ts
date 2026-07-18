import {
  addDays,
  differenceInCalendarDays,
  formatISO,
  parseISO,
  startOfWeek,
  isWithinInterval,
  endOfWeek,
  max as maxDate,
} from 'date-fns';
import type {
  AthleteSession,
  LogStatus,
  PlanSessionTemplate,
  TrainingPlan,
} from './types';

export function planIdFor(distance: string, level: string) {
  return `${distance}_${level}`;
}

/** Monday date key for the calendar week containing `reference` (weekStartsOn: 1). */
export function catchUpWeekKey(reference = new Date()) {
  return formatISO(startOfWeek(reference, { weekStartsOn: 1 }), { representation: 'date' });
}

/**
 * Align the plan so training fits into [startDate, raceDate].
 * Start is max(idealStart, today). If the window is shorter than the full plan,
 * keep the last N template weeks (taper/race prep).
 */
export function computePlanSchedule(
  raceDate: string,
  planWeeks: number,
  today: Date = new Date()
) {
  const race = parseISO(raceDate);
  const todayDate = parseISO(formatISO(today, { representation: 'date' }));
  const idealStart = addDays(race, -(planWeeks * 7 - 1));

  let start = maxDate([idealStart, todayDate]);
  if (start > race) start = todayDate;

  const startDate = formatISO(start, { representation: 'date' });
  const daysAvailable = differenceInCalendarDays(race, start) + 1;
  const weeksAvailable = Math.max(1, Math.min(planWeeks, Math.ceil(daysAvailable / 7)));
  const weekOffset = planWeeks - weeksAvailable;

  return { startDate, weeksToGenerate: weeksAvailable, weekOffset };
}

export function materializeSessions(params: {
  plan: TrainingPlan;
  enrollmentId: string;
  startDate: string;
  weeksToGenerate?: number;
  weekOffset?: number;
}): Omit<AthleteSession, 'id'>[] {
  const { plan, enrollmentId, startDate } = params;
  const weekOffset = params.weekOffset ?? 0;
  const weeksToGenerate = params.weeksToGenerate ?? plan.weeks - weekOffset;
  const start = parseISO(startDate);
  const sessions: Omit<AthleteSession, 'id'>[] = [];

  const templates = plan.weekTemplates
    .filter((week) => week.week > weekOffset && week.week <= weekOffset + weeksToGenerate)
    .sort((a, b) => a.week - b.week);

  templates.forEach((week, index) => {
    const calendarWeek = index + 1;
    for (const template of week.sessions) {
      const scheduled = addDays(start, (calendarWeek - 1) * 7 + template.dayOffset);
      sessions.push({
        enrollmentId,
        planId: plan.id,
        weekNumber: calendarWeek,
        scheduledDate: formatISO(scheduled, { representation: 'date' }),
        discipline: template.discipline,
        title: template.title,
        prescription: template.prescription,
        whyItMatters: template.whyItMatters,
        durationMinutes: template.durationMinutes,
        blocks: template.blocks,
        intensityLabel: template.intensityLabel,
        coachCues: template.coachCues,
        logStatus: null,
        loggedAt: null,
        simplified: false,
        garminWorkoutId: null,
        stravaActivityId: null,
        appleWorkoutScheduled: false,
      });
    }
  });

  return sessions;
}

export function countMissedThisWeek(sessions: AthleteSession[], reference = new Date()) {
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(reference, { weekStartsOn: 1 });
  return sessions.filter((s) => {
    const d = parseISO(s.scheduledDate);
    return (
      isWithinInterval(d, { start: weekStart, end: weekEnd }) && s.logStatus === 'missed'
    );
  }).length;
}

export function nextSessionsToSimplify(sessions: AthleteSession[], count = 3) {
  const today = formatISO(new Date(), { representation: 'date' });
  return sessions
    .filter(
      (s) =>
        s.scheduledDate >= today &&
        s.logStatus === null &&
        s.discipline !== 'rest' &&
        !s.simplified
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, count);
}

export function simplifyPrescription(session: AthleteSession): Partial<AthleteSession> {
  const minutes = Math.max(20, Math.round(session.durationMinutes * 0.7));
  const warm = Math.max(5, Math.round(minutes * 0.2));
  const cool = Math.max(5, Math.round(minutes * 0.15));
  const main = Math.max(10, minutes - warm - cool);

  return {
    simplified: true,
    title: `${session.title} (simplified)`,
    prescription: `Keep this lighter after missed sessions. Aim for ~${minutes} min easy effort — technique over intensity. Original: ${session.prescription}`,
    whyItMatters:
      'Catch-up mode: protecting consistency beats chasing the original load after a rough week.',
    durationMinutes: minutes,
    intensityLabel: 'Easy · RPE 2–3',
    coachCues: 'Skip intensity. If form breaks, shorten the main set and call it done.',
    blocks: [
      {
        label: 'Warm-up',
        detail: `${warm} min easy Z1–2 — shake out, find rhythm`,
      },
      {
        label: 'Main set',
        detail: `${main} min continuous easy effort (Z1–2 / RPE 2–3). Technique over pace.`,
      },
      {
        label: 'Cool-down',
        detail: `${cool} min very easy Z1`,
      },
    ],
  };
}

export function sessionByDate(sessions: AthleteSession[], date: string) {
  return sessions
    .filter((s) => s.scheduledDate === date && s.discipline !== 'rest')
    .sort((a, b) => a.discipline.localeCompare(b.discipline));
}

export function logLabel(status: LogStatus) {
  switch (status) {
    case 'easy':
      return 'Felt easy';
    case 'on_target':
      return 'On target';
    case 'hard':
      return 'Hard';
    case 'missed':
      return 'Missed';
    default:
      return 'Not logged';
  }
}

/** Full coach-style description for wearables / push payloads. Falls back to prescription. */
export function sessionDetailText(session: AthleteSession) {
  const parts: string[] = [];
  if (session.intensityLabel) parts.push(session.intensityLabel);
  if (session.blocks?.length) {
    for (const block of session.blocks) {
      parts.push(`${block.label}: ${block.detail}`);
    }
  } else if (session.prescription) {
    parts.push(session.prescription);
  }
  if (session.whyItMatters) parts.push(`Why: ${session.whyItMatters}`);
  if (session.coachCues) parts.push(`Cues: ${session.coachCues}`);
  return parts.join('\n\n');
}

export function weekNumberForDate(planStartDate: string, scheduledDate: string) {
  const days = differenceInCalendarDays(parseISO(scheduledDate), parseISO(planStartDate));
  return Math.max(1, Math.floor(days / 7) + 1);
}
