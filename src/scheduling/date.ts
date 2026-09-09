import type { IsoDate, Weekday } from './types';

/**
 * Datumhjälp utan datumbibliotek och utan sommartidsfällor.
 *
 * All aritmetik görs i UTC på ett datum utan klockslag. Ett dygn är då alltid
 * exakt 24 timmar, även veckan då klockan ställs om — till skillnad från
 * lokal tid, där 30 mars bara är 23 timmar lång i Sverige.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(iso: IsoDate): { year: number; month: number; day: number } {
  const match = ISO.exec(iso);
  if (!match) throw new Error(`Ogiltigt datum: ${iso}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function format(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Läser ett Date-objekts *lokala* datumdelar. Det här är den enda punkten där
 * motorn rör ett Date, och den kastar bort klockslaget direkt.
 */
export function toIsoDate(date: Date): IsoDate {
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const { year, month, day } = parse(iso);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000);
  return format(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** ISO-veckodag: 1 = måndag ... 7 = söndag. */
export function weekdayOf(iso: IsoDate): Weekday {
  const { year, month, day } = parse(iso);
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (sundayFirst === 0 ? 7 : sundayFirst) as Weekday;
}
