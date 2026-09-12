import { useMemo, useState } from 'react';
import { Button, clock, Screen, ScreenHeader } from '../../design';
import type { Commitment, IsoDate, PlannedDay } from '../../scheduling/types';
import { strings } from '../../strings';
import { addCommitment, deviatingDates, newOneOff } from '../commitments/commitmentActions';
import { CommitmentEditor } from '../commitments/CommitmentEditor';
import { DaySheet } from './DaySheet';
import { nextSessionAfter, type DayWithSession } from './weekSummary';
import { dayTrack, weekRange, type TrackSegment } from './weekTrack';

/**
 * Flik 2 — veckan.
 *
 * Sju dagar med sina block, på ett gemensamt tidsspann så att raderna går att
 * jämföra med ögat. Går ett pass inte att placera visas dagen med en
 * förklaring, aldrig ett tomt hål.
 *
 * Här fanns tidigare ett drag: markera upptagen tid med fingret och se passet
 * flytta sig medan man drog. Det såg bra ut och var fel verktyg för uppgiften
 * — en tillfällig händelse har ett namn och ett klockslag man vet, och att
 * sikta fram dem med fingret på en rad som är sexton timmar bred var långsamt
 * och oprecist. Ett plus per dag går rakt på inmatningen i stället.
 *
 * Återkopplingen är inte borta med draget: motorn räknar om vid varje ändring,
 * så passet flyttar sig direkt när tiden ställs.
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
  const [draft, setDraft] = useState<Commitment | null>(null);

  const range = useMemo(() => weekRange(days), [days]);
  const open = days.find((day) => day.date === openDate) ?? null;

  // En dag som inte följer det vanliga ska synas i veckan. Annars är den enda
  // vägen tillbaka att minnas vad man ändrade.
  const deviating = deviatingDates(
    commitments,
    days.map((day) => day.date),
  );

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
                changed={deviating.has(day.date)}
                nextAfter={day.session === null ? nextSessionAfter(days, day.date) : null}
                segments={dayTrack(day, range)}
                onOpen={() => setOpenDate(day.date)}
                onAdd={() => setDraft(newOneOff(day.date))}
              />
            </li>
          ))}
        </ol>
      </Screen>

      {open && (
        <DaySheet
          day={open}
          dates={days.map((day) => day.date)}
          commitments={commitments}
          onChange={onChange}
          onClose={() => setOpenDate(null)}
        />
      )}

      {draft && (
        <CommitmentEditor
          commitment={draft}
          isNew
          dates={days.map((day) => day.date)}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
          onCreate={() => {
            onChange(addCommitment(commitments, { ...draft, label: draft.label.trim() }));
            setDraft(null);
          }}
          onRemove={() => setDraft(null)}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
}

function DayRow({
  day,
  isToday,
  changed,
  nextAfter,
  segments,
  onOpen,
  onAdd,
}: {
  day: PlannedDay;
  isToday: boolean;
  /** Dagen avviker från det som återkommer — ändrad, inställd eller extra. */
  changed: boolean;
  /** Nästa dag med ett pass, när den här dagen inte fick något. */
  nextAfter: DayWithSession | null;
  segments: TrackSegment[];
  onOpen: () => void;
  onAdd: () => void;
}) {
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
            {changed && (
              <span className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
                {strings.week.deviates}
              </span>
            )}
          </span>
          {day.session && (
            <span className="text-[16px] font-semibold text-accent-text tabular-nums">
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

      <div className="mx-4 mt-3 mb-4 flex items-center gap-3">
        <div
          aria-label={strings.week.trackLabel(strings.dayLabel(day.date))}
          className="relative h-11 flex-1 overflow-hidden rounded-tight bg-paper"
        >
          {segments.map((segment) => (
            <span
              key={segment.key}
              className={
                segment.kind === 'session'
                  ? 'absolute inset-y-0 bg-accent'
                  : 'absolute inset-y-0 bg-line'
              }
              style={{ left: `${segment.offset * 100}%`, width: `${segment.width * 100}%` }}
            />
          ))}
        </div>

        {/* Plus står intill dagens tider, inte i en meny: det man lägger till
            är tid på just den dagen. */}
        <button
          type="button"
          onClick={onAdd}
          aria-label={strings.week.addOn(strings.dayLabel(day.date))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tight border border-line text-ink-soft"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M9 3.5v11M3.5 9h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
