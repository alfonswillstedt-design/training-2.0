import { hhmm } from '../../src/scheduling/time';
import type {
  Commitment,
  OpeningHours,
  Preferences,
  TrainingPlan,
  Weekday,
} from '../../src/scheduling/types';

/** Samma öppettider varje dag. */
export function gymAllWeek(open: string, close: string): Record<Weekday, OpeningHours | null> {
  const hours = { open: hhmm(open), close: hhmm(close) };
  return { 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours, 7: hours };
}

/**
 * En vanlig vardagsuppsättning: 90 min pass, 20 min till gymmet, gym 06–22,
 * träna mellan 06:00 och 21:30, 45 min mattid, ingen PWO, en vilodag.
 */
export function basePreferences(overrides: Partial<Preferences> = {}): Preferences {
  return {
    sessionLength: 90,
    travelToGym: 20,
    travelFromGym: 20,
    travelMode: 'transit',
    gymHours: gymAllWeek('06:00', '22:00'),
    earliestStart: hhmm('06:00'),
    latestEnd: hhmm('21:30'),
    meal: { enabled: true, duration: 45 },
    pwo: { mode: 'off', margin: 20 },
    rest: { minRestDays: 1, noSameSessionBackToBack: false },
    ...overrides,
  };
}

/** Skola måndag–fredag till 15:30. Går direkt till gymmet — ingen mattid. */
export const school: Commitment = {
  id: 'skola',
  label: 'Skola',
  weekdays: [1, 2, 3, 4, 5],
  start: hhmm('08:15'),
  end: hhmm('15:30'),
  needsMealAfter: false,
  exceptions: [],
};

/** Jobb tisdagar 08–16. Efter ett arbetspass behövs mattid före träning. */
export const work: Commitment = {
  id: 'jobb',
  label: 'Jobb',
  weekdays: [2],
  start: hhmm('08:00'),
  end: hhmm('16:00'),
  needsMealAfter: true,
  exceptions: [],
};

export const frontBackPlan: TrainingPlan = {
  mode: 'rolling',
  sessions: [
    { id: 'framsida', name: 'Framsida' },
    { id: 'baksida', name: 'Baksida' },
  ],
};

/** Måndag 2025-09-01. Vanlig vecka, ingen sommartidsövergång. */
export const MONDAY = new Date(2025, 8, 1);
