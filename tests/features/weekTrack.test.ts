import { describe, expect, it } from 'vitest';
import {
  dayTrack,
  weekRange,
} from '../../src/features/week/weekTrack';
import { weekdayOf } from '../../src/scheduling/date';
import { hhmm } from '../../src/scheduling/time';
import type { BusyBlock, IsoDate, PlannedDay, Weekday } from '../../src/scheduling/types';

function busy(label: string, start: string, end: string): BusyBlock {
  return {
    commitmentId: label.toLowerCase(),
    label,
    start: hhmm(start),
    end: hhmm(end),
    needsMealAfter: false,
  };
}

function day(
  date: IsoDate,
  commitments: BusyBlock[] = [],
  session: { start: string; end: string } | null = null,
): PlannedDay {
  return {
    date,
    weekday: weekdayOf(date) as Weekday,
    commitments,
    session: session
      ? {
          sessionId: 'framsida',
          sessionName: 'Framsida',
          start: hhmm(session.start),
          end: hhmm(session.end),
          leaveHome: hhmm(session.start) - 20,
          homeAgain: hhmm(session.end) + 20,
          meal: null,
          pwo: null,
          slack: 0,
        }
      : null,
    reason: session ? null : { kind: 'rest-day', because: 'rest-rule' },
  };
}

describe('weekRange', () => {
  it('visar en vanlig vaken dag när veckan är tom', () => {
    expect(weekRange([day('2025-09-01')])).toEqual({ from: hhmm('06:00'), to: hhmm('22:00') });
  });

  it('vidgas för ett åtagande som börjar tidigare', () => {
    const days = [day('2025-09-01', [busy('Tidigt skift', '04:30', '12:00')])];
    expect(weekRange(days).from).toBe(hhmm('04:30'));
  });

  it('vidgas för ett pass som slutar senare', () => {
    const days = [day('2025-09-01', [], { start: '21:30', end: '23:00' })];
    expect(weekRange(days).to).toBe(hhmm('23:00'));
  });

  it('spänner över hela veckan, inte bara en dag', () => {
    const days = [
      day('2025-09-01', [busy('Natt', '02:00', '06:00')]),
      day('2025-09-02', [busy('Sent', '20:00', '23:30')]),
    ];
    expect(weekRange(days)).toEqual({ from: hhmm('02:00'), to: hhmm('23:30') });
  });
});

describe('dayTrack', () => {
  const range = { from: hhmm('06:00'), to: hhmm('22:00') };

  it('lägger ett block på rätt andel av spåret', () => {
    // 06:00–22:00 är 960 minuter. 14:00 ligger 480 in, alltså halvvägs.
    const [segment] = dayTrack(day('2025-09-01', [busy('Jobb', '14:00', '18:00')]), range);
    expect(segment!.offset).toBeCloseTo(0.5);
    expect(segment!.width).toBeCloseTo(0.25);
  });

  it('klipper ett block som börjar före spannet', () => {
    const [segment] = dayTrack(day('2025-09-01', [busy('Natt', '02:00', '08:00')]), range);
    expect(segment!.offset).toBe(0);
    expect(segment!.width).toBeCloseTo(120 / 960);
    // Den riktiga tiden finns kvar, det är bara ritningen som klipps.
    expect(segment!.start).toBe(hhmm('02:00'));
  });

  it('utelämnar block som ligger helt utanför spannet', () => {
    expect(dayTrack(day('2025-09-01', [busy('Natt', '01:00', '05:00')]), range)).toEqual([]);
  });

  it('markerar passet som eget slag', () => {
    const segments = dayTrack(day('2025-09-01', [busy('Skola', '08:15', '15:30')], {
      start: '15:50',
      end: '17:20',
    }), range);
    expect(segments.map((s) => s.kind)).toEqual(['busy', 'session']);
    expect(segments[1]!.label).toBe('Framsida');
  });

  it('sorterar på starttid', () => {
    const segments = dayTrack(
      day('2025-09-01', [busy('Sent', '18:00', '20:00'), busy('Tidigt', '08:00', '10:00')]),
      range,
    );
    expect(segments.map((s) => s.label)).toEqual(['Tidigt', 'Sent']);
  });

  it('ritar passet överst när det börjar samtidigt som ett åtagande', () => {
    const segments = dayTrack(
      day('2025-09-01', [busy('Krock', '15:50', '17:20')], { start: '15:50', end: '17:20' }),
      range,
    );
    expect(segments[segments.length - 1]!.kind).toBe('session');
  });

  it('ger inga segment när spannet är tomt', () => {
    expect(dayTrack(day('2025-09-01', [busy('Jobb', '08:00', '16:00')]), { from: 600, to: 600 })).toEqual([]);
  });
});
