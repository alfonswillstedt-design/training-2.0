import { planWeek } from '../scheduling/planWeek';
import { hhmm } from '../scheduling/time';
import type {
  Commitment,
  IsoDate,
  OpeningHours,
  PlannedDay,
  Preferences,
  TrainingPlan,
  Weekday,
} from '../scheduling/types';

/**
 * Hårdkodad testdata för steg 2, körd genom den riktiga motorn i stället för
 * att vara påhittade `PlannedDay`-objekt. Vyn får då exakt den data den
 * kommer att få när lagringen finns på plats.
 */

const WEEK_STARTING = new Date(2025, 8, 1); // måndag 2025-09-01

function gym(open: string, close: string): Record<Weekday, OpeningHours | null> {
  const hours: OpeningHours = { open: hhmm(open), close: hhmm(close) };
  return { 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours, 7: hours };
}

function preferences(overrides: Partial<Preferences> = {}): Preferences {
  return {
    sessionLength: 90,
    travelToGym: 20,
    travelFromGym: 20,
    travelMode: 'transit',
    gymHours: gym('06:00', '22:00'),
    earliestStart: hhmm('09:00'),
    latestEnd: hhmm('21:30'),
    meal: { enabled: true, duration: 45 },
    pwo: { mode: 'off', margin: 20 },
    rest: { minRestDays: 1, noSameSessionBackToBack: false },
    ...overrides,
  };
}

const school: Commitment = {
  id: 'skola',
  label: 'Skola',
  weekdays: [1, 2, 3, 4, 5],
  start: hhmm('08:15'),
  end: hhmm('15:30'),
  needsMealAfter: false,
  exceptions: [],
};

const work: Commitment = {
  id: 'jobb',
  label: 'Jobb',
  weekdays: [2],
  start: hhmm('08:00'),
  end: hhmm('16:00'),
  needsMealAfter: true,
  exceptions: [],
};

const eveningShift: Commitment = {
  id: 'kvallsjobb',
  label: 'Kvällsjobb',
  weekdays: [3],
  start: hhmm('16:00'),
  end: hhmm('23:00'),
  needsMealAfter: true,
  exceptions: [],
};

const roundTheClock: Commitment = {
  id: 'lager',
  label: 'Lagerjobb',
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  start: 0,
  end: 1440,
  needsMealAfter: true,
  exceptions: [],
};

const frontBack: TrainingPlan = {
  mode: 'rolling',
  sessions: [
    { id: 'framsida', name: 'Framsida' },
    { id: 'baksida', name: 'Baksida' },
  ],
};

const noPlan: TrainingPlan = { mode: 'rolling', sessions: [] };

const noRest = { minRestDays: 0, noSameSessionBackToBack: false };

export interface Scenario {
  id: string;
  name: string;
  today: IsoDate;
  days: PlannedDay[];
}

function scenario(
  id: string,
  name: string,
  today: IsoDate,
  commitments: Commitment[],
  prefs: Preferences,
  plan: TrainingPlan = frontBack,
): Scenario {
  return {
    id,
    name,
    today,
    days: planWeek({
      commitments,
      preferences: prefs,
      plan,
      rotationState: { lastCompletedSessionId: null },
      weekStarting: WEEK_STARTING,
    }),
  };
}

export const scenarios: Scenario[] = [
  scenario('skoldag', 'Skoldag', '2025-09-01', [school, work], preferences()),
  scenario('efter-jobbet', 'Efter jobbet', '2025-09-02', [school, work], preferences({ rest: noRest })),
  scenario('vilodag', 'Vilodag idag', '2025-09-02', [school, work], preferences()),
  scenario(
    'pwo',
    'PWO före passet',
    '2025-09-01',
    [school],
    preferences({ rest: noRest, pwo: { mode: 'before', margin: 30 } }),
  ),
  scenario(
    'gar-inte-ihop',
    'Går inte ihop idag',
    '2025-09-03',
    [school, eveningShift],
    preferences({ rest: noRest }),
  ),
  scenario('inget-upplagg', 'Inget upplägg', '2025-09-01', [school], preferences(), noPlan),
  scenario('full-vecka', 'Ingen tid alls', '2025-09-01', [roundTheClock], preferences()),
];
