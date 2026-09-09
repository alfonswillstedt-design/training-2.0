import { freeGaps, mergeBusy, resolveDay } from './commitments';
import { addDays, toIsoDate, weekdayOf } from './date';
import { nextSessionId } from './rotation';
import type {
  BusyBlock,
  IsoDate,
  NoSessionReason,
  PlanWeekInput,
  PlannedDay,
  Weekday,
} from './types';
import { findWindow, type WindowResult } from './window';

const DAYS_IN_WEEK = 7;

interface DayContext {
  date: IsoDate;
  weekday: Weekday;
  commitments: BusyBlock[];
  window: WindowResult;
}

/**
 * Räknar ut veckans träningsdagar utifrån den tid användaren inte rår över.
 *
 * Träningsdagarna är ett resultat, aldrig en inmatning: motorn fyller varje
 * dag som faktiskt rymmer ett pass, och lämnar bara de dagar fria som
 * vilodagsreglerna kräver. Funktionen är ren och deterministisk — samma
 * indata ger alltid samma utdata.
 */
export function planWeek(input: PlanWeekInput): PlannedDay[] {
  const { commitments, preferences, plan, rotationState, weekStarting } = input;

  const firstDate = toIsoDate(weekStarting);
  const days: DayContext[] = Array.from({ length: DAYS_IN_WEEK }, (_, offset) => {
    const date = addDays(firstDate, offset);
    const weekday = weekdayOf(date);
    const blocks = resolveDay(commitments, date);
    return {
      date,
      weekday,
      commitments: blocks,
      window: findWindow(freeGaps(mergeBusy(blocks)), preferences, weekday),
    };
  });

  const sessionsById = new Map(plan.sessions.map((session) => [session.id, session]));
  if (sessionsById.size === 0) {
    return days.map((day) => finish(day, null, { kind: 'no-plan' }));
  }

  // I veckobundet läge säger bindningen vilket pass som hör till dagen — aldrig
  // om användaren hinner träna. Tiden räknar motorn ut ändå.
  const bindings =
    plan.mode === 'weekly'
      ? new Map(
          plan.bindings
            .filter((binding) => sessionsById.has(binding.sessionId))
            .map((binding) => [binding.weekday, binding.sessionId]),
        )
      : null;

  // Steg 1: varje dag är antingen en kandidat (null) eller har redan ett skäl.
  const reasons: (NoSessionReason | null)[] = days.map((day) => {
    if (bindings && !bindings.has(day.weekday)) return { kind: 'no-session-for-weekday' };
    if (!day.window.ok) return day.window.reason;
    return null;
  });

  // Steg 2: vilodagsregeln offrar de dagar där passet fick minst marginal.
  const allowedTrainingDays = Math.max(0, DAYS_IN_WEEK - Math.max(0, preferences.rest.minRestDays));
  for (;;) {
    const candidates = reasons.flatMap((reason, index) => (reason === null ? [index] : []));
    if (candidates.length <= allowedTrainingDays) break;

    let victim = candidates[0]!;
    for (const index of candidates) {
      const theirs = slackAt(days, index);
      const best = slackAt(days, victim);
      // Minst marginal offras först. Vid lika vinner den senare veckodagen.
      if (theirs < best || (theirs === best && index > victim)) victim = index;
    }
    reasons[victim] = { kind: 'rest-day', because: 'rest-rule' };
  }

  // Steg 3: fördela passen kronologiskt över de dagar som blev kvar.
  let rotationCursor = rotationState.lastCompletedSessionId;
  let previousDaySessionId: string | null = null;

  return days.map((day, index) => {
    const reason = reasons[index] ?? null;
    if (reason !== null || !day.window.ok) {
      previousDaySessionId = null;
      return finish(day, null, reason);
    }

    const sessionId = bindings
      ? bindings.get(day.weekday)!
      : nextSessionId(plan.sessions, rotationCursor)!;

    if (preferences.rest.noSameSessionBackToBack && previousDaySessionId === sessionId) {
      // Rotationen står still — passet är inte avklarat, bara framflyttat.
      previousDaySessionId = null;
      return finish(day, null, { kind: 'rest-day', because: 'no-same-session-back-to-back' });
    }

    rotationCursor = sessionId;
    previousDaySessionId = sessionId;

    return finish(
      day,
      {
        sessionId,
        sessionName: sessionsById.get(sessionId)!.name,
        ...day.window.placement,
      },
      null,
    );
  });
}

function slackAt(days: DayContext[], index: number): number {
  const window = days[index]!.window;
  return window.ok ? window.placement.slack : Number.POSITIVE_INFINITY;
}

function finish(
  day: DayContext,
  session: PlannedDay['session'],
  reason: NoSessionReason | null,
): PlannedDay {
  return {
    date: day.date,
    weekday: day.weekday,
    commitments: day.commitments,
    session,
    reason: session ? null : reason,
  };
}
