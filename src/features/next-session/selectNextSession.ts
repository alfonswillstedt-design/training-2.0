import type { IsoDate, Minutes, PlannedDay, PlannedSession } from '../../scheduling/types';

/** En dag som faktiskt fick ett pass. */
export type TrainingDay = PlannedDay & { session: PlannedSession };

export interface NextUp {
  /** Dagen som är idag, om veckan innehåller den. */
  today: PlannedDay | null;
  /** Sant när dagens pass redan är avklarat. */
  todayCompleted: boolean;
  /** Första passet som återstår, från och med nu. Null när veckan är slut. */
  next: TrainingDay | null;
  /**
   * Dagens pass som hunnit ta slut utan att loggas. Utan det här kan den som
   * tränar på morgonen aldrig markera passet som gjort, och rotationen står
   * still för alltid.
   */
  missedToday: PlannedSession | null;
}

function hasSession(day: PlannedDay): day is TrainingDay {
  return day.session !== null;
}

/**
 * Väljer vad startvyn ska visa. Ren funktion — vyn ska aldrig behöva leta
 * själv, och logiken ska gå att testa utan att rendera något.
 *
 * ISO-datum jämförs som strängar, vilket är samma sak som kronologiskt.
 *
 * Ett pass som redan är slut är inte längre nästa pass. Ett pågående pass är
 * det däremot — den som är mitt i det vill fortfarande se sina tider.
 */
export function selectNextSession(
  days: PlannedDay[],
  today: IsoDate,
  completedDates: ReadonlySet<IsoDate> = new Set(),
  now: Minutes = 0,
): NextUp {
  const todayPlan = days.find((day) => day.date === today) ?? null;

  const remaining = days.filter((day) => {
    if (day.date < today || completedDates.has(day.date)) return false;
    if (day.date > today) return true;
    return day.session === null || day.session.end > now;
  });

  const todaySession = todayPlan !== null && hasSession(todayPlan) ? todayPlan.session : null;
  const loggedToday = completedDates.has(today);

  return {
    today: todayPlan,
    todayCompleted: todaySession !== null && loggedToday,
    next: remaining.find(hasSession) ?? null,
    missedToday:
      todaySession !== null && !loggedToday && todaySession.end <= now ? todaySession : null,
  };
}
