import { describe, expect, it } from 'vitest';
import { nextSessionAfter } from '../../src/features/week/weekSummary';
import { weekdayOf } from '../../src/scheduling/date';
import { hhmm } from '../../src/scheduling/time';
import type { IsoDate, PlannedDay, Weekday } from '../../src/scheduling/types';

function day(date: IsoDate, start: string | null): PlannedDay {
  return {
    date,
    weekday: weekdayOf(date) as Weekday,
    commitments: [],
    session: start
      ? {
          sessionId: 'framsida',
          sessionName: 'Framsida',
          start: hhmm(start),
          end: hhmm(start) + 90,
          leaveHome: hhmm(start) - 20,
          homeAgain: hhmm(start) + 110,
          meal: null,
          pwo: null,
          slack: 0,
        }
      : null,
    reason: start ? null : { kind: 'rest-day', because: 'rest-rule' },
  };
}

const week = [
  day('2025-09-01', null),
  day('2025-09-02', null),
  day('2025-09-03', '15:50'),
  day('2025-09-04', '15:50'),
];

describe('nextSessionAfter', () => {
  it('hittar nästa dag med ett pass', () => {
    expect(nextSessionAfter(week, '2025-09-01')?.date).toBe('2025-09-03');
  });

  it('räknar inte dagen själv', () => {
    expect(nextSessionAfter(week, '2025-09-03')?.date).toBe('2025-09-04');
  });

  it('ger null när veckan är slut', () => {
    expect(nextSessionAfter(week, '2025-09-04')).toBeNull();
  });

  it('ger null när ingen dag har ett pass', () => {
    expect(nextSessionAfter([day('2025-09-01', null)], '2025-08-31')).toBeNull();
  });
});
