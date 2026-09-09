import type { Minutes } from './types';

export const MINUTES_PER_DAY = 1440;

/** Tolkar 'HH:MM' som minuter från midnatt. '24:00' är dygnets slut. */
export function hhmm(text: string): Minutes {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) throw new Error(`Ogiltigt klockslag: ${text}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24) throw new Error(`Ogiltigt klockslag: ${text}`);
  const total = hours * 60 + minutes;
  if (total > MINUTES_PER_DAY) throw new Error(`Ogiltigt klockslag: ${text}`);
  return total;
}

/** Formaterar minuter från midnatt som 'HH:MM'. */
export function toHhmm(minutes: Minutes): string {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
