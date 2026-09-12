import { hhmm } from '../../scheduling/time';
import type { Minutes, PlannedDay } from '../../scheduling/types';

/**
 * Lägger ut en dags block som andelar av ett spår.
 *
 * Ren geometri, ingen React. Dagen är spatial i stället för en textlista: en
 * rad går att jämföra med de andra sex på en blick.
 */

export interface TimeRange {
  from: Minutes;
  to: Minutes;
}

export interface TrackSegment {
  key: string;
  kind: 'busy' | 'session';
  label: string;
  start: Minutes;
  end: Minutes;
  /** Andel av spårets bredd, 0–1. */
  offset: number;
  width: number;
}

/** Utan åtaganden visas en vanlig vaken dag. */
const DEFAULT_RANGE: TimeRange = { from: hhmm('06:00'), to: hhmm('22:00') };

/**
 * Tidsspannet som visas. Gemensamt för alla sju dagar — annars går raderna
 * inte att jämföra med ögat, och veckovyn är just en jämförelse.
 */
export function weekRange(days: PlannedDay[]): TimeRange {
  let { from, to } = DEFAULT_RANGE;

  for (const day of days) {
    for (const block of day.commitments) {
      from = Math.min(from, block.start);
      to = Math.max(to, block.end);
    }
    if (day.session) {
      from = Math.min(from, day.session.start);
      to = Math.max(to, day.session.end);
    }
  }

  return { from, to };
}

/** Dagens block som segment, klippta mot spannet och sorterade på starttid. */
export function dayTrack(day: PlannedDay, range: TimeRange): TrackSegment[] {
  const span = range.to - range.from;
  if (span <= 0) return [];

  const segments: TrackSegment[] = [];

  const place = (
    key: string,
    kind: TrackSegment['kind'],
    label: string,
    start: Minutes,
    end: Minutes,
  ) => {
    const clippedStart = Math.max(start, range.from);
    const clippedEnd = Math.min(end, range.to);
    if (clippedEnd <= clippedStart) return;

    segments.push({
      key,
      kind,
      label,
      start,
      end,
      offset: (clippedStart - range.from) / span,
      width: (clippedEnd - clippedStart) / span,
    });
  };

  day.commitments.forEach((block, index) => {
    place(`${block.commitmentId}-${index}`, 'busy', block.label, block.start, block.end);
  });

  if (day.session) {
    place('session', 'session', day.session.sessionName, day.session.start, day.session.end);
  }

  // Passet ritas sist så det ligger överst när det tangerar ett åtagande.
  return segments.sort((a, b) => a.offset - b.offset || (a.kind === 'session' ? 1 : -1));
}
