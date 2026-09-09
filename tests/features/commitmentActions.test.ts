import { describe, expect, it } from 'vitest';
import {
  addException,
  exceptionsInWeek,
  isUsable,
  newCommitment,
  recurringDatesInWeek,
  removeCommitment,
  removeExceptionAt,
  toggleWeekday,
  updateCommitment,
} from '../../src/features/commitments/commitmentActions';
import { weekDates } from '../../src/scheduling/date';
import { hhmm } from '../../src/scheduling/time';
import type { Commitment } from '../../src/scheduling/types';

const week = weekDates('2025-09-01'); // måndag–söndag

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return { ...newCommitment(), label: 'Skola', weekdays: [1, 2, 3, 4, 5], ...overrides };
}

describe('toggleWeekday', () => {
  it('lägger till och håller listan sorterad', () => {
    expect(toggleWeekday([3, 1], 2)).toEqual([1, 2, 3]);
  });

  it('tar bort en dag som redan är vald', () => {
    expect(toggleWeekday([1, 2, 3], 2)).toEqual([1, 3]);
  });
});

describe('updateCommitment', () => {
  it('ändrar bara det angivna åtagandet', () => {
    const list = [commitment({ id: 'a' }), commitment({ id: 'b', label: 'Jobb' })];
    const updated = updateCommitment(list, 'b', { label: 'Extrajobb' });

    expect(updated[0]!.label).toBe('Skola');
    expect(updated[1]!.label).toBe('Extrajobb');
  });

  it('muterar inte indata', () => {
    const list = [commitment({ id: 'a' })];
    updateCommitment(list, 'a', { label: 'Ändrat' });
    expect(list[0]!.label).toBe('Skola');
  });
});

describe('removeCommitment', () => {
  it('tar bort rätt rad', () => {
    const list = [commitment({ id: 'a' }), commitment({ id: 'b' })];
    expect(removeCommitment(list, 'a').map((item) => item.id)).toEqual(['b']);
  });
});

describe('undantag', () => {
  it('läggs till utan att röra den återkommande regeln', () => {
    const list = [commitment({ id: 'skola' })];
    const updated = addException(list, 'skola', { date: '2025-09-05', kind: 'off' });

    expect(updated[0]!.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(updated[0]!.exceptions).toEqual([{ date: '2025-09-05', kind: 'off' }]);
  });

  it('samlas ihop för veckan, sorterade på datum', () => {
    const list = [
      commitment({
        id: 'skola',
        label: 'Skola',
        exceptions: [{ date: '2025-09-05', kind: 'off' }],
      }),
      commitment({
        id: 'jobb',
        label: 'Jobb',
        weekdays: [2],
        exceptions: [{ date: '2025-09-03', kind: 'extra', start: 960, end: 1080 }],
      }),
    ];

    const found = exceptionsInWeek(list, week);
    expect(found.map((item) => item.exception.date)).toEqual(['2025-09-03', '2025-09-05']);
    expect(found[0]!.label).toBe('Jobb');
  });

  it('tar inte med undantag som ligger utanför veckan', () => {
    const list = [commitment({ exceptions: [{ date: '2025-09-15', kind: 'off' }] })];
    expect(exceptionsInWeek(list, week)).toEqual([]);
  });

  it('tas bort på index, så två undantag samma dag inte förväxlas', () => {
    const list = [
      commitment({
        id: 'jobb',
        exceptions: [
          { date: '2025-09-03', kind: 'extra', start: 960, end: 1080 },
          { date: '2025-09-03', kind: 'extra', start: 1200, end: 1260 },
        ],
      }),
    ];

    const updated = removeExceptionAt(list, 'jobb', 0);
    expect(updated[0]!.exceptions).toEqual([
      { date: '2025-09-03', kind: 'extra', start: 1200, end: 1260 },
    ]);
  });
});

describe('recurringDatesInWeek', () => {
  it('ger bara de dagar åtagandet faktiskt ligger på', () => {
    expect(recurringDatesInWeek(commitment({ weekdays: [1, 5] }), week)).toEqual([
      '2025-09-01',
      '2025-09-05',
    ]);
  });

  it('ger inga dagar för ett åtagande utan fasta dagar', () => {
    expect(recurringDatesInWeek(commitment({ weekdays: [] }), week)).toEqual([]);
  });
});

describe('isUsable', () => {
  it('kräver både namn och minst en dag', () => {
    expect(isUsable(commitment())).toBe(true);
    expect(isUsable(commitment({ label: '   ' }))).toBe(false);
    expect(isUsable(commitment({ weekdays: [] }))).toBe(false);
  });
});

describe('newCommitment', () => {
  it('ger unika id', () => {
    expect(newCommitment().id).not.toBe(newCommitment().id);
  });

  it('börjar tomt men med rimliga tider', () => {
    const fresh = newCommitment();
    expect(fresh.label).toBe('');
    expect(fresh.weekdays).toEqual([]);
    expect(fresh.start).toBe(hhmm('08:00'));
    expect(fresh.end).toBe(hhmm('16:00'));
  });
});
