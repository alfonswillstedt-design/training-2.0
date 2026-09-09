import { describe, expect, it } from 'vitest';
import { startOfWeek, weekDates } from '../../src/scheduling/date';

describe('startOfWeek', () => {
  it('ger måndagen i samma vecka', () => {
    expect(startOfWeek('2025-09-03')).toBe('2025-09-01'); // onsdag
    expect(startOfWeek('2025-09-01')).toBe('2025-09-01'); // måndag
    expect(startOfWeek('2025-09-07')).toBe('2025-09-01'); // söndag
  });

  it('backar över ett månadsskifte', () => {
    expect(startOfWeek('2025-10-01')).toBe('2025-09-29');
  });

  it('backar över ett årsskifte', () => {
    expect(startOfWeek('2026-01-01')).toBe('2025-12-29');
  });
});

describe('weekDates', () => {
  it('ger sju datum i följd', () => {
    expect(weekDates('2025-09-01')).toEqual([
      '2025-09-01',
      '2025-09-02',
      '2025-09-03',
      '2025-09-04',
      '2025-09-05',
      '2025-09-06',
      '2025-09-07',
    ]);
  });

  it('klarar veckan då klockan ställs om', () => {
    // Sista söndagen i mars: den lokala dagen är bara 23 timmar lång.
    expect(weekDates('2025-03-24')[6]).toBe('2025-03-30');
  });
});
