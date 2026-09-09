import { useMemo, useState } from 'react';
import { clock, Screen, ScreenHeader } from '../../design';
import type { Commitment, IsoDate, PlannedDay } from '../../scheduling/types';
import { strings } from '../../strings';
import { DaySheet } from './DaySheet';
import { dayTrack, weekRange, type TrackSegment } from './weekTrack';

/**
 * Flik 2 — veckan.
 *
 * Sju dagar med sina block, på ett gemensamt tidsspann så att raderna går att
 * jämföra med ögat. Går ett pass inte att placera visas dagen med en
 * förklaring, aldrig ett tomt hål.
 *
 * Signaturinteraktionen — att markera upptagen tid direkt på dagen och se
 * passet flytta sig live — läggs ovanpå de här spåren i steg 7.
 */
export function WeekView({
  days,
  today,
  commitments,
  onChange,
}: {
  days: PlannedDay[];
  today: IsoDate;
  commitments: Commitment[];
  onChange: (next: Commitment[]) => void;
}) {
  const [openDate, setOpenDate] = useState<IsoDate | null>(null);

  const range = useMemo(() => weekRange(days), [days]);
  const open = days.find((day) => day.date === openDate) ?? null;

  return (
    <>
      <Screen>
        <ScreenHeader title={strings.week.title} lead={strings.week.lead} />

        <ol className="flex flex-col gap-2.5">
          {days.map((day) => (
            <li key={day.date}>
              <DayRow day={day} isToday={day.date === today} segments={dayTrack(day, range)} onOpen={() => setOpenDate(day.date)} />
            </li>
          ))}
        </ol>
      </Screen>

      {open && (
        <DaySheet
          day={open}
          commitments={commitments}
          onChange={onChange}
          onClose={() => setOpenDate(null)}
        />
      )}
    </>
  );
}

function DayRow({
  day,
  isToday,
  segments,
  onOpen,
}: {
  day: PlannedDay;
  isToday: boolean;
  segments: TrackSegment[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-soft border bg-raised px-4 py-3.5 text-left ${
        isToday ? 'border-ink' : 'border-line'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        {/* Accentfärgen betyder träning och ingenting annat. Idag markeras med
            ram och ord, annars läses en dag utan pass som ett fel. */}
        <span className="flex items-baseline gap-2 text-[16px] font-semibold">
          {strings.dayLabel(day.date)}
          {isToday && (
            <span className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
              {strings.today.label}
            </span>
          )}
        </span>
        {day.session && (
          <span className="text-[16px] font-semibold text-accent tabular-nums">
            {clock(day.session.start)}
          </span>
        )}
      </div>

      <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-tight bg-paper">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`absolute inset-y-0 ${segment.kind === 'session' ? 'bg-accent' : 'bg-line'}`}
            style={{ left: `${segment.offset * 100}%`, width: `${segment.width * 100}%` }}
          />
        ))}
      </div>

      <p className="mt-2 text-[14px] leading-snug text-ink-soft">
        {day.session
          ? day.session.sessionName
          : day.reason
            ? strings.reason(day.reason)
            : strings.week.free}
      </p>
    </button>
  );
}
