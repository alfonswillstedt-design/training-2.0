import { useMemo, useState } from 'react';
import { clock, Screen, ScreenHeader } from '../../design';
import type { Commitment, IsoDate, Minutes, PlannedDay } from '../../scheduling/types';
import { strings } from '../../strings';
import { newCommitment } from '../commitments/commitmentActions';
import { DaySheet } from './DaySheet';
import { nextSessionAfter, type DayWithSession } from './weekSummary';
import {
  dayTrack,
  dragInterval,
  minutesAt,
  weekRange,
  type TimeRange,
  type TrackSegment,
} from './weekTrack';

interface Drag {
  id: string;
  date: IsoDate;
  anchor: Minutes;
  current: Minutes;
}

/**
 * Flik 2 — veckan.
 *
 * Sju dagar med sina block, på ett gemensamt tidsspann så att raderna går att
 * jämföra med ögat. Går ett pass inte att placera visas dagen med en
 * förklaring, aldrig ett tomt hål.
 *
 * Signaturinteraktionen bor här: dra på en dag för att markera upptagen tid,
 * och se träningsblocket flytta sig medan fingret rör sig. Draget matas genom
 * samma motor som allt annat, så blocket som flyttar sig är ett riktigt
 * resultat — inte en animation som låtsas. Ingenting skrivs förrän man
 * släpper.
 *
 * Draget är ett komplement, aldrig enda vägen: samma sak går att göra genom
 * att trycka på dagen och lägga till ett åtagande.
 */
export function WeekView({
  days,
  today,
  commitments,
  onChange,
  onPreview,
}: {
  days: PlannedDay[];
  today: IsoDate;
  commitments: Commitment[];
  onChange: (next: Commitment[]) => void;
  /** Visar en vecka som ännu inte är sparad, medan fingret är nere. */
  onPreview: (next: Commitment[] | null) => void;
}) {
  const [openDate, setOpenDate] = useState<IsoDate | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const range = useMemo(() => weekRange(days), [days]);
  const open = days.find((day) => day.date === openDate) ?? null;

  /** Åtagandena plus den markering som håller på att dras. */
  function withDraft(current: Drag): Commitment[] {
    const span = dragInterval(current.anchor, current.current);
    if (!span) return commitments;

    return [
      ...commitments,
      {
        id: current.id,
        label: strings.week.markedBusy,
        // Ingen fast veckodag: markeringen gäller bara den här dagen.
        weekdays: [],
        start: 0,
        end: 0,
        needsMealAfter: false,
        exceptions: [{ date: current.date, kind: 'extra', ...span }],
      },
    ];
  }

  function start(date: IsoDate, fraction: number) {
    const at = minutesAt(fraction, range);
    setDrag({ id: newCommitment().id, date, anchor: at, current: at });
  }

  function move(date: IsoDate, fraction: number) {
    if (!drag || drag.date !== date) return;
    const next = { ...drag, current: minutesAt(fraction, range) };
    setDrag(next);
    onPreview(withDraft(next));
  }

  function end() {
    if (!drag) return;
    const next = withDraft(drag);
    setDrag(null);
    onPreview(null);
    if (next.length !== commitments.length) onChange(next);
  }

  function cancel() {
    setDrag(null);
    onPreview(null);
  }

  return (
    <>
      <Screen>
        <ScreenHeader title={strings.week.title} lead={strings.week.lead} />

        <ol className="flex flex-col gap-2.5">
          {days.map((day) => (
            <li key={day.date}>
              <DayRow
                day={day}
                isToday={day.date === today}
                nextAfter={day.session === null ? nextSessionAfter(days, day.date) : null}
                segments={dayTrack(day, range)}
                dragging={drag?.date === day.date}
                onOpen={() => setOpenDate(day.date)}
                onDragStart={(fraction) => start(day.date, fraction)}
                onDragMove={(fraction) => move(day.date, fraction)}
                onDragEnd={end}
                onDragCancel={cancel}
              />
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
  nextAfter,
  segments,
  dragging,
  onOpen,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: {
  day: PlannedDay;
  isToday: boolean;
  /** Nästa dag med ett pass, när den här dagen inte fick något. */
  nextAfter: DayWithSession | null;
  segments: TrackSegment[];
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (fraction: number) => void;
  onDragMove: (fraction: number) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
}) {
  const fractionOf = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return box.width === 0 ? 0 : (event.clientX - box.left) / box.width;
  };

  return (
    <div
      className={`overflow-hidden rounded-soft border bg-raised ${
        isToday ? 'border-ink' : 'border-line'
      }`}
    >
      <button type="button" onClick={onOpen} className="w-full px-4 pt-3.5 text-left">
        <span className="flex items-baseline justify-between gap-3">
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
        </span>

        <span className="mt-1 block text-[14px] leading-snug text-ink-soft">
          {day.session
            ? day.session.sessionName
            : day.reason
              ? strings.reason(day.reason)
              : strings.week.free}
        </span>

        {/* En vilodag utan besked om vart träningen tog vägen är ett halvt svar. */}
        {nextAfter && (
          <span className="mt-1 block text-[13px] leading-snug text-ink-faint">
            {strings.week.nextIs(
              strings.dayLabel(nextAfter.date),
              clock(nextAfter.session.start),
            )}
          </span>
        )}
      </button>

      {/* touch-pan-y låter sidan scrolla vertikalt medan draget äger x-led. */}
      <div
        role="slider"
        tabIndex={-1}
        aria-label={strings.week.trackLabel(strings.dayLabel(day.date))}
        aria-valuetext={day.session ? clock(day.session.start) : strings.week.free}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          onDragStart(fractionOf(event));
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 0) onDragMove(fractionOf(event));
        }}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragCancel}
        className={`relative mx-4 mt-3 mb-4 h-8 touch-pan-y overflow-hidden rounded-tight ${
          dragging ? 'bg-accent-wash' : 'bg-paper'
        }`}
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={
              segment.kind === 'session'
                ? // Den enda animationen i appen: passet glider till sin nya tid
                  // medan fingret drar, i stället för att hoppa.
                  'absolute inset-y-0 bg-accent transition-[left,width] duration-200 ease-out'
                : 'absolute inset-y-0 bg-line'
            }
            style={{ left: `${segment.offset * 100}%`, width: `${segment.width * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
