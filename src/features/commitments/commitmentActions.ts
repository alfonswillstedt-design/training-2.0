import { weekdayOf } from '../../scheduling/date';
import { hhmm } from '../../scheduling/time';
import type { Commitment, CommitmentException, IsoDate, Weekday } from '../../scheduling/types';

/**
 * Rena tillståndsövergångar för åtaganden.
 *
 * Ingen av funktionerna muterar sin indata och ingen av dem känner till React.
 * Vyn gör inga listoperationer själv — den anropar de här, och allt räknas om
 * direkt. Det finns ingen spara-knapp någonstans.
 */

export type ExceptionKind = CommitmentException['kind'];

let counter = 0;

/** Id behöver bara vara unikt i användarens egen data. */
function nextId(): string {
  counter += 1;
  return `c${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Ett nytt, tomt åtagande. Namnet fylls i av användaren. */
export function newCommitment(): Commitment {
  return {
    id: nextId(),
    label: '',
    weekdays: [],
    start: hhmm('08:00'),
    end: hhmm('16:00'),
    needsMealAfter: false,
    exceptions: [],
  };
}

export function addCommitment(list: Commitment[], commitment: Commitment): Commitment[] {
  return [...list, commitment];
}

export function updateCommitment(
  list: Commitment[],
  id: string,
  patch: Partial<Omit<Commitment, 'id'>>,
): Commitment[] {
  return list.map((commitment) =>
    commitment.id === id ? { ...commitment, ...patch } : commitment,
  );
}

export function removeCommitment(list: Commitment[], id: string): Commitment[] {
  return list.filter((commitment) => commitment.id !== id);
}

export function toggleWeekday(weekdays: Weekday[], weekday: Weekday): Weekday[] {
  return weekdays.includes(weekday)
    ? weekdays.filter((day) => day !== weekday)
    : [...weekdays, weekday].sort((a, b) => a - b);
}

export function addException(
  list: Commitment[],
  commitmentId: string,
  exception: CommitmentException,
): Commitment[] {
  return list.map((commitment) =>
    commitment.id === commitmentId
      ? { ...commitment, exceptions: [...commitment.exceptions, exception] }
      : commitment,
  );
}

export function removeExceptionAt(
  list: Commitment[],
  commitmentId: string,
  index: number,
): Commitment[] {
  return list.map((commitment) =>
    commitment.id === commitmentId
      ? { ...commitment, exceptions: commitment.exceptions.filter((_, at) => at !== index) }
      : commitment,
  );
}

/** Ett undantag tillsammans med åtagandet det hör till, för listan. */
export interface WeekException {
  commitmentId: string;
  label: string;
  index: number;
  exception: CommitmentException;
}

/**
 * Undantagen som faller inom de angivna datumen, sorterade på datum. Undantag
 * för andra veckor lämnas orörda — de bara syns inte här.
 */
export function exceptionsInWeek(list: Commitment[], dates: IsoDate[]): WeekException[] {
  const inWeek = new Set(dates);
  const found: WeekException[] = [];

  for (const commitment of list) {
    commitment.exceptions.forEach((exception, index) => {
      if (inWeek.has(exception.date)) {
        found.push({
          commitmentId: commitment.id,
          label: commitment.label,
          index,
          exception,
        });
      }
    });
  }

  return found.sort(
    (a, b) => a.exception.date.localeCompare(b.exception.date) || a.label.localeCompare(b.label),
  );
}

/**
 * Datumen i veckan där åtagandet faktiskt återkommer. Att ställa in eller
 * flytta en dag som åtagandet ändå inte ligger på betyder ingenting, så de
 * dagarna ska inte gå att välja.
 */
export function recurringDatesInWeek(commitment: Commitment, dates: IsoDate[]): IsoDate[] {
  return dates.filter((date) => commitment.weekdays.includes(weekdayOf(date)));
}

/** Ett åtagande utan namn och utan dagar är ofullständigt och sparas inte. */
export function isUsable(commitment: Commitment): boolean {
  return commitment.label.trim() !== '' && commitment.weekdays.length > 0;
}
