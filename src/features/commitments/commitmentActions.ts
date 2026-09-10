import { weekdayOf } from '../../scheduling/date';
import { hhmm } from '../../scheduling/time';
import type {
  Commitment,
  CommitmentException,
  IsoDate,
  Minutes,
  Weekday,
} from '../../scheduling/types';

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
  return list
    .map((commitment) =>
      commitment.id === commitmentId
        ? { ...commitment, exceptions: commitment.exceptions.filter((_, at) => at !== index) }
        : commitment,
    )
    // Ett åtagande utan fasta dagar och utan undantag tar inte upp någon tid
    // och syns ingenstans. Det ska inte ligga kvar som osynligt skräp.
    .filter((commitment) => commitment.weekdays.length > 0 || commitment.exceptions.length > 0);
}

/**
 * Åtagandena som faktiskt återkommer.
 *
 * Ett åtagande utan fasta veckodagar är inte återkommande — det finns bara som
 * undantag för enskilda datum, vilket är formen en markering i veckovyn tar.
 * Att lista det under "Återkommande" påstår något som inte är sant, och gör
 * att samma sak dyker upp två gånger på samma skärm.
 */
export function recurringCommitments(list: Commitment[]): Commitment[] {
  return list.filter((commitment) => commitment.weekdays.length > 0);
}

/** Ett undantag tillsammans med åtagandet det hör till, för listan. */
export interface WeekException {
  commitmentId: string;
  label: string;
  index: number;
  exception: CommitmentException;
  /** Falskt när åtagandet bara är en engångshändelse, inte något återkommande. */
  recurring: boolean;
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
          recurring: commitment.weekdays.length > 0,
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

/**
 * Ett åtagande duger när det har ett namn och tar upp tid någonstans — antingen
 * på fasta veckodagar eller vid ett enskilt datum. En engångshändelse har inga
 * fasta dagar, bara ett datum, och är lika giltig för det.
 */
export function isUsable(commitment: Commitment): boolean {
  if (commitment.label.trim() === '') return false;
  return commitment.weekdays.length > 0 || commitment.exceptions.length > 0;
}

/** Datumet för en engångshändelse, om åtagandet är en sådan. */
export function oneOffDate(commitment: Commitment): IsoDate | null {
  if (commitment.weekdays.length > 0) return null;
  return commitment.exceptions.find((exception) => exception.kind === 'extra')?.date ?? null;
}

/** Ett åtagande som bara händer en gång, vid ett datum. */
export function asOneOff(
  commitment: Commitment,
  date: IsoDate | null,
  start: Minutes,
  end: Minutes,
): Partial<Omit<Commitment, 'id'>> {
  return {
    weekdays: [],
    start,
    end,
    exceptions: date === null ? [] : [{ date, kind: 'extra', start, end }],
  };
}
