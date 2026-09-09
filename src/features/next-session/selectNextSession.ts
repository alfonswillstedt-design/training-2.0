import type { IsoDate, PlannedDay, PlannedSession } from '../../scheduling/types';

/** En dag som faktiskt fick ett pass. */
export type TrainingDay = PlannedDay & { session: PlannedSession };

export interface NextUp {
  /** Dagen som är idag, om veckan innehåller den. */
  today: PlannedDay | null;
  /** Sant när dagens pass redan är avklarat. */
  todayCompleted: boolean;
  /** Första passet som återstår, från och med idag. Null när veckan är slut. */
  next: TrainingDay | null;
}

function hasSession(day: PlannedDay): day is TrainingDay {
  return day.session !== null;
}

/**
 * Väljer vad startvyn ska visa. Ren funktion — vyn ska aldrig behöva leta
 * själv, och logiken ska gå att testa utan att rendera något.
 *
 * ISO-datum jämförs som strängar, vilket är samma sak som kronologiskt.
 */
export function selectNextSession(
  days: PlannedDay[],
  today: IsoDate,
  completedDates: ReadonlySet<IsoDate> = new Set(),
): NextUp {
  const todayPlan = days.find((day) => day.date === today) ?? null;

  return {
    today: todayPlan,
    todayCompleted: todayPlan !== null && hasSession(todayPlan) && completedDates.has(today),
    next:
      days
        .filter((day) => day.date >= today && !completedDates.has(day.date))
        .find(hasSession) ?? null,
  };
}
