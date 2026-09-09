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

/**
 * Färdiga upplägg att börja från och sedan ändra fritt.
 *
 * Passnamnen är utsäde: i samma stund användaren väljer ett upplägg blir de
 * hens egna och går att döpa om. Etiketten i väljaren är däremot rent
 * gränssnitt och ligger i språkmodulen.
 *
 * Varianter som bara upprepar samma pass — "push/pull/ben sex dagar" — finns
 * inte här. I rullande läge cyklar rotationen ändå, så [push, pull, ben, push,
 * pull, ben] ger exakt samma vecka som [push, pull, ben]. Det vore ett val som
 * inte väljer något.
 */
function rolling(id: string, ...names: string[]): { id: string; plan: TrainingPlan } {
  return {
    id,
    plan: {
      mode: 'rolling',
      sessions: names.map((name) => ({
        id: `${id}-${name.toLowerCase().replace(/[^a-z0-9åäö]+/g, '-')}`,
        name,
      })),
    },
  };
}

export const starterPlans: { id: string; plan: TrainingPlan }[] = [
  rolling('helkropp', 'Helkropp'),
  rolling('push-pull', 'Push', 'Pull'),
  rolling('over-under', 'Överkropp', 'Underkropp'),
  rolling('framsida-baksida', 'Framsida', 'Baksida'),
  rolling('push-pull-ben', 'Push', 'Pull', 'Ben'),
  rolling('arnold', 'Bröst & rygg', 'Axlar & armar', 'Ben'),
  rolling('fyrdelad', 'Bröst', 'Rygg', 'Ben', 'Axlar & armar'),
  rolling('kroppsdelar', 'Bröst', 'Rygg', 'Axlar', 'Armar', 'Ben'),
];

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];
