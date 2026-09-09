import { weekdayOf } from './date';
import { MINUTES_PER_DAY } from './time';
import type { BusyBlock, Commitment, IsoDate, Minutes } from './types';

/** Sammanslagen upptagen tid. `needsMealAfter` gäller den som slutar sist. */
export interface BusyInterval {
  start: Minutes;
  end: Minutes;
  needsMealAfter: boolean;
}

/** En ledig lucka, och vad man kommer ifrån när den börjar. */
export interface FreeGap {
  start: Minutes;
  end: Minutes;
  /** Sant om åtagandet precis före luckan kräver att man hinner äta. */
  prevNeedsMealAfter: boolean;
}

/**
 * Löser upp de återkommande reglerna och undantagen till konkreta block för
 * ett enskilt datum.
 */
export function resolveDay(commitments: Commitment[], date: IsoDate): BusyBlock[] {
  const weekday = weekdayOf(date);
  const blocks: BusyBlock[] = [];

  for (const commitment of commitments) {
    const today = commitment.exceptions.filter((exception) => exception.date === date);
    const cancelled = today.some((exception) => exception.kind === 'off');
    const moved = today.find((exception) => exception.kind === 'moved');

    if (!cancelled) {
      if (moved) {
        blocks.push(toBlock(commitment, moved.start, moved.end));
      } else if (commitment.weekdays.includes(weekday)) {
        blocks.push(toBlock(commitment, commitment.start, commitment.end));
      }
    }

    // Ett extrapass gäller oavsett om den återkommande förekomsten ställts in.
    for (const exception of today) {
      if (exception.kind === 'extra') {
        blocks.push(toBlock(commitment, exception.start, exception.end));
      }
    }
  }

  return blocks
    .filter((block) => block.end > block.start)
    .sort(
      (a, b) =>
        a.start - b.start || a.end - b.end || a.commitmentId.localeCompare(b.commitmentId),
    );
}

function toBlock(commitment: Commitment, start: Minutes, end: Minutes): BusyBlock {
  return {
    commitmentId: commitment.id,
    label: commitment.label,
    start: Math.max(0, start),
    end: Math.min(MINUTES_PER_DAY, end),
    needsMealAfter: commitment.needsMealAfter,
  };
}

/**
 * Slår ihop överlappande och kant-i-kant-liggande block.
 *
 * Mattidskravet följer med från det block som slutar sist — det är därifrån
 * man kommer när luckan börjar. Slutar flera block samtidigt räcker det att
 * ett av dem kräver mat: motorn tar hellre till för mycket tid än för lite,
 * eftersom en tid som inte fungerar är värre än ett pass som inte får plats.
 */
export function mergeBusy(blocks: BusyBlock[]): BusyInterval[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: BusyInterval[] = [];

  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (last && block.start <= last.end) {
      if (block.end > last.end) {
        last.end = block.end;
        last.needsMealAfter = block.needsMealAfter;
      } else if (block.end === last.end) {
        last.needsMealAfter = last.needsMealAfter || block.needsMealAfter;
      }
    } else {
      merged.push({ start: block.start, end: block.end, needsMealAfter: block.needsMealAfter });
    }
  }

  return merged;
}

/** Vänder upptagen tid till lediga luckor över dygnet. */
export function freeGaps(busy: BusyInterval[]): FreeGap[] {
  const gaps: FreeGap[] = [];
  let cursor = 0;
  // Dagens första lucka föregås inte av något åtagande, så ingen mattid krävs.
  let prevNeedsMealAfter = false;

  for (const interval of busy) {
    if (interval.start > cursor) {
      gaps.push({ start: cursor, end: interval.start, prevNeedsMealAfter });
    }
    cursor = Math.max(cursor, interval.end);
    prevNeedsMealAfter = interval.needsMealAfter;
  }

  if (cursor < MINUTES_PER_DAY) {
    gaps.push({ start: cursor, end: MINUTES_PER_DAY, prevNeedsMealAfter });
  }

  return gaps;
}
