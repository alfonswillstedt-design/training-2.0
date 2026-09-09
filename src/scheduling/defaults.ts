import { hhmm } from './time';
import type { OpeningHours, Preferences, TrainingPlan, Weekday } from './types';

/**
 * Utgångsläget innan användaren svarat på något. Värdena är medvetet vanliga
 * snarare än tomma, så att appen kan visa ett riktigt svar direkt.
 */
export function defaultPreferences(): Preferences {
  const weekdayHours: OpeningHours = { open: hhmm('05:00'), close: hhmm('23:00') };
  const weekendHours: OpeningHours = { open: hhmm('08:00'), close: hhmm('20:00') };

  return {
    sessionLength: 60,
    travelToGym: 15,
    travelFromGym: 15,
    travelMode: 'bike',
    gymHours: {
      1: weekdayHours,
      2: weekdayHours,
      3: weekdayHours,
      4: weekdayHours,
      5: weekdayHours,
      6: weekendHours,
      7: weekendHours,
    },
    earliestStart: hhmm('06:00'),
    latestEnd: hhmm('21:00'),
    meal: { enabled: true, duration: 45 },
    pwo: { mode: 'off', margin: 20 },
    rest: { minRestDays: 1, noSameSessionBackToBack: false },
  };
}

/** Färdiga upplägg användaren kan börja från och sedan ändra fritt. */
export const starterPlans: { id: string; name: string; plan: TrainingPlan }[] = [
  {
    id: 'helkropp',
    name: 'Helkropp',
    plan: { mode: 'rolling', sessions: [{ id: 'helkropp', name: 'Helkropp' }] },
  },
  {
    id: 'over-under',
    name: 'Överkropp / underkropp',
    plan: {
      mode: 'rolling',
      sessions: [
        { id: 'overkropp', name: 'Överkropp' },
        { id: 'underkropp', name: 'Underkropp' },
      ],
    },
  },
  {
    id: 'push-pull-ben',
    name: 'Push / pull / ben',
    plan: {
      mode: 'rolling',
      sessions: [
        { id: 'push', name: 'Push' },
        { id: 'pull', name: 'Pull' },
        { id: 'ben', name: 'Ben' },
      ],
    },
  },
  {
    id: 'framsida-baksida',
    name: 'Framsida / baksida',
    plan: {
      mode: 'rolling',
      sessions: [
        { id: 'framsida', name: 'Framsida' },
        { id: 'baksida', name: 'Baksida' },
      ],
    },
  },
];

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];
