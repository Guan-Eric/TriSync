export type RaceDistance = 'sprint' | 'olympic' | 'half' | 'ironman';
export type ExperienceLevel = 'beginner' | 'intermediate';
export type Discipline = 'swim' | 'bike' | 'run' | 'brick' | 'rest';
export type LogStatus = 'easy' | 'on_target' | 'hard' | 'missed' | null;

export type EquipmentAccess = {
  pool: boolean;
  trainer: boolean;
  outdoorBike: boolean;
};

export type UserProfile = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  onboardingComplete: boolean;
  raceDistance?: RaceDistance;
  raceDate?: string;
  experienceLevel?: ExperienceLevel;
  weeklyHours?: number;
  equipment?: EquipmentAccess;
  activePlanId?: string | null;
  activeEnrollmentId?: string | null;
  /** Monday date key of the week when catch-up was applied or dismissed. */
  catchUpDismissedWeekKey?: string | null;
  garminConnected?: boolean;
  appleHealthConnected?: boolean;
  stravaConnected?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlanSessionTemplate = {
  dayOffset: number;
  discipline: Discipline;
  title: string;
  prescription: string;
  whyItMatters: string;
  durationMinutes: number;
};

export type PlanWeekTemplate = {
  week: number;
  focus: string;
  sessions: PlanSessionTemplate[];
};

export type TrainingPlan = {
  id: string;
  name: string;
  distance: RaceDistance;
  level: ExperienceLevel;
  weeks: number;
  description: string;
  weeklyHoursTarget: { min: number; max: number };
  weekTemplates: PlanWeekTemplate[];
};

export type Enrollment = {
  id: string;
  planId: string;
  startDate: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
};

export type AthleteSession = {
  id: string;
  enrollmentId: string;
  planId: string;
  weekNumber: number;
  scheduledDate: string;
  discipline: Discipline;
  title: string;
  prescription: string;
  whyItMatters: string;
  durationMinutes: number;
  logStatus: LogStatus;
  loggedAt?: string | null;
  simplified?: boolean;
  garminWorkoutId?: string | null;
};
