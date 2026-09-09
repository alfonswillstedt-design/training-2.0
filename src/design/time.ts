import { toHhmm } from '../scheduling/time';
import type { Minutes } from '../scheduling/types';

/**
 * Tidsformatering för gränssnittet. Motorn räknar i minuter — det är först
 * här de blir något en människa läser.
 */

/** Ett klockslag: "15:50". */
export function clock(minutes: Minutes): string {
  return toHhmm(minutes);
}

/** Ett intervall: "15:50–17:20". Tankstreck, inte bindestreck. */
export function clockRange(start: Minutes, end: Minutes): string {
  return `${clock(start)}–${clock(end)}`;
}

/** En längd: "45 min", "1 h", "1 h 30 min". */
export function duration(minutes: Minutes): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
