import { describe, expect, it } from 'vitest';
import { addDays, toIsoDate, weekdayOf } from '../../src/scheduling/date';
import { hhmm, toHhmm } from '../../src/scheduling/time';

describe('toIsoDate', () => {
  it('läser lokala datumdelar, inte UTC', () => {
    // 23:30 lokal tid ska ge dagens datum, inte morgondagens.
    expect(toIsoDate(new Date(2025, 8, 1, 23, 30))).toBe('2025-09-01');
    expect(toIsoDate(new Date(2025, 0, 1, 0, 15))).toBe('2025-01-01');
  });
});

describe('addDays', () => {
  it('stegar över månads- och årsskifte', () => {
    expect(addDays('2025-09-30', 1)).toBe('2025-10-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // skottår
  });

  it('påverkas inte av sommartidsövergången', () => {
    // Sverige ställer om natten till söndag 30 mars 2025 (klockan hoppar 02→03).
    // En dag efter lördag ska vara söndag, inte "lördag igen" eller måndag.
    expect(addDays('2025-03-29', 1)).toBe('2025-03-30');
    expect(addDays('2025-03-30', 1)).toBe('2025-03-31');
    // Och tillbaka på hösten, när klockan ställs tillbaka.
    expect(addDays('2025-10-25', 1)).toBe('2025-10-26');
    expect(addDays('2025-10-26', 1)).toBe('2025-10-27');
  });

  it('en hel vecka från en måndag landar på nästa måndag', () => {
    expect(addDays('2025-03-24', 7)).toBe('2025-03-31');
    expect(weekdayOf('2025-03-31')).toBe(1);
  });
});

describe('weekdayOf', () => {
  it('använder ISO-numrering med måndag som 1 och söndag som 7', () => {
    expect(weekdayOf('2025-09-01')).toBe(1); // måndag
    expect(weekdayOf('2025-09-06')).toBe(6); // lördag
    expect(weekdayOf('2025-09-07')).toBe(7); // söndag
  });
});

describe('minuter från midnatt', () => {
  it('tolkar och formaterar klockslag', () => {
    expect(hhmm('00:00')).toBe(0);
    expect(hhmm('15:30')).toBe(930);
    expect(hhmm('24:00')).toBe(1440);
    expect(toHhmm(930)).toBe('15:30');
    expect(toHhmm(0)).toBe('00:00');
  });
});
