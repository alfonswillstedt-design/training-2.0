import { describe, expect, it } from 'vitest';
import { selectNextSession } from '../../src/features/next-session/selectNextSession';
import { hhmm } from '../../src/scheduling/time';
import type {
  IsoDate,
  NoSessionReason,
  PlannedDay,
  PlannedSession,
  Weekday,
} from '../../src/scheduling/types';
import { weekdayOf } from '../../src/scheduling/date';

function session(name: string): PlannedSession {
  return {
    sessionId: name.toLowerCase(),
    sessionName: name,
    start: hhmm('15:50'),
    end: hhmm('17:20'),
    leaveHome: hhmm('15:30'),
    homeAgain: hhmm('17:40'),
    meal: null,
    pwo: null,
    slack: 250,
  };
}

function day(date: IsoDate, name: string | null, reason: NoSessionReason | null = null): PlannedDay {
  return {
    date,
    weekday: weekdayOf(date) as Weekday,
    commitments: [],
    session: name ? session(name) : null,
    reason: name ? null : reason,
  };
}

const restToday: NoSessionReason = { kind: 'rest-day', because: 'rest-rule' };

const week: PlannedDay[] = [
  day('2025-09-01', 'Framsida'),
  day('2025-09-02', null, restToday),
  day('2025-09-03', 'Baksida'),
  day('2025-09-04', 'Framsida'),
];

describe('selectNextSession', () => {
  it('visar dagens pass när det finns ett', () => {
    const result = selectNextSession(week, '2025-09-01');
    expect(result.next?.date).toBe('2025-09-01');
    expect(result.next?.session.sessionName).toBe('Framsida');
    expect(result.todayCompleted).toBe(false);
  });

  it('hoppar fram till nästa pass på en vilodag, och behåller skälet för idag', () => {
    const result = selectNextSession(week, '2025-09-02');
    expect(result.next?.date).toBe('2025-09-03');
    expect(result.today?.reason).toEqual(restToday);
  });

  it('bryr sig inte om dagar som redan passerat', () => {
    const result = selectNextSession(week, '2025-09-03');
    expect(result.next?.date).toBe('2025-09-03');
  });

  it('går vidare till nästa dag när dagens pass är avklarat', () => {
    const result = selectNextSession(week, '2025-09-01', new Set(['2025-09-01']));
    expect(result.todayCompleted).toBe(true);
    expect(result.next?.date).toBe('2025-09-03');
  });

  it('ger inget nästa pass när veckan är slut', () => {
    expect(selectNextSession(week, '2025-09-05').next).toBeNull();
  });

  it('ger inget nästa pass när ingen dag har ett', () => {
    const empty = [day('2025-09-01', null, restToday)];
    expect(selectNextSession(empty, '2025-09-01').next).toBeNull();
  });

  it('klarar att idag ligger utanför den planerade veckan', () => {
    const result = selectNextSession(week, '2025-08-31');
    expect(result.today).toBeNull();
    expect(result.next?.date).toBe('2025-09-01');
  });

  it('markerar inte en vilodag som avklarad', () => {
    const result = selectNextSession(week, '2025-09-02', new Set(['2025-09-02']));
    expect(result.todayCompleted).toBe(false);
  });
});
