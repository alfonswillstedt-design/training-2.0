import { describe, expect, it } from 'vitest';
import {
  asOneOff,
  isUsable,
  newCommitment,
  oneOffDate,
  recurringCommitments,
  removeCommitment,
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

describe('vad som räknas som återkommande', () => {
  it('tar bara med åtaganden som har fasta veckodagar', () => {
    const markering = commitment({ id: 'dragen', label: 'Upptaget', weekdays: [] });
    const skola = commitment({ id: 'skola' });
    expect(recurringCommitments([skola, markering]).map((item) => item.id)).toEqual(['skola']);
  });

  it('utelämnar en markering även när den har undantag', () => {
    const markering = commitment({
      id: 'dragen',
      weekdays: [],
      exceptions: [{ date: '2025-09-01', kind: 'extra', start: 600, end: 700 }],
    });
    expect(recurringCommitments([markering])).toEqual([]);
  });
});

describe('engångshändelser', () => {
  it('duger med namn och datum, utan fasta veckodagar', () => {
    const engång = commitment({
      weekdays: [],
      exceptions: [{ date: '2025-09-02', kind: 'extra', start: 1140, end: 1200 }],
    });
    expect(isUsable(engång)).toBe(true);
  });

  it('duger inte utan vare sig dagar eller datum', () => {
    expect(isUsable(commitment({ weekdays: [], exceptions: [] }))).toBe(false);
  });

  it('duger inte utan namn, hur den än är lagd', () => {
    const engång = commitment({
      label: '  ',
      weekdays: [],
      exceptions: [{ date: '2025-09-02', kind: 'extra', start: 1140, end: 1200 }],
    });
    expect(isUsable(engång)).toBe(false);
  });

  it('känns igen på att den saknar fasta dagar men har ett datum', () => {
    const engång = commitment({
      weekdays: [],
      exceptions: [{ date: '2025-09-02', kind: 'extra', start: 1140, end: 1200 }],
    });
    expect(oneOffDate(engång)).toBe('2025-09-02');
  });

  it('är inte en engångshändelse när åtagandet också återkommer', () => {
    const extrapass = commitment({
      weekdays: [2],
      exceptions: [{ date: '2025-09-03', kind: 'extra', start: 960, end: 1080 }],
    });
    expect(oneOffDate(extrapass)).toBeNull();
  });

  it('skriver tiderna på både åtagandet och datumet', () => {
    const patch = asOneOff(commitment(), '2025-09-02', hhmm('19:00'), hhmm('20:00'));
    expect(patch.weekdays).toEqual([]);
    expect(patch.start).toBe(hhmm('19:00'));
    expect(patch.exceptions).toEqual([
      { date: '2025-09-02', kind: 'extra', start: hhmm('19:00'), end: hhmm('20:00') },
    ]);
  });

  it('lämnar undantagen tomma tills en dag är vald', () => {
    expect(asOneOff(commitment(), null, 600, 700).exceptions).toEqual([]);
  });
});
