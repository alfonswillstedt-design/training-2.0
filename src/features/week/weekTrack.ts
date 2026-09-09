import { hhmm } from '../../scheduling/time';
import type { Minutes, PlannedDay } from '../../scheduling/types';

/**
 * Lägger ut en dags block som andelar av ett spår.
 *
 * Ren geometri, ingen React. Steg 7 lägger signaturinteraktionen ovanpå exakt
 * de här andelarna, så dagen är spatial från början i stället för en textlista
 * som måste rivas.
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

/** Minsta längd på ett draget block. Kortare än så var det nog ett tryck. */
export const MIN_DRAG = 15;

/** Steget markeringen fäster mot — samma fem minuter som tidsväljaren. */
export const DRAG_STEP = 5;

/**
 * Klockslaget för en andel av spårets bredd, fäst mot närmaste steg.
 * Andelen klipps till spåret, så ett finger som glider utanför kanten inte
 * ger tider utanför dygnet.
 */
export function minutesAt(fraction: number, range: TimeRange, step: Minutes = DRAG_STEP): Minutes {
  const clamped = Math.min(1, Math.max(0, fraction));
  const raw = range.from + clamped * (range.to - range.from);
  return Math.min(range.to, Math.max(range.from, Math.round(raw / step) * step));
}

/**
 * Två punkter blir ett intervall, oavsett vilket håll man drog åt. Ett för
 * kort drag ger null — då ska ingenting skapas.
 */
export function dragInterval(
  a: Minutes,
  b: Minutes,
  minimum: Minutes = MIN_DRAG,
): { start: Minutes; end: Minutes } | null {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  return end - start < minimum ? null : { start, end };
}
