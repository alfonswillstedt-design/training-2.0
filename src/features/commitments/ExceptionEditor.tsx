import { useMemo, useState } from 'react';
import { Button, ChipGroup, Field, Sheet, TimeRange, WeekdayPicker } from '../../design';
import { weekdayOf } from '../../scheduling/date';
import { hhmm } from '../../scheduling/time';
import type { Commitment, CommitmentException, IsoDate, Weekday } from '../../scheduling/types';
import { strings } from '../../strings';
import { recurringDatesInWeek, type ExceptionKind } from './commitmentActions';

/**
 * Lägger till ett undantag för den här veckan.
 *
 * Undantaget överskrider den återkommande regeln utan att ändra den. Att
 * ställa in eller flytta en dag som åtagandet ändå inte ligger på betyder
 * ingenting, så de dagarna går inte att välja.
 */
export function ExceptionEditor({
  commitments,
  dates,
  onCreate,
  onClose,
}: {
  commitments: Commitment[];
  dates: IsoDate[];
  onCreate: (commitmentId: string, exception: CommitmentException) => void;
  onClose: () => void;
}) {
  const [commitmentId, setCommitmentId] = useState(commitments[0]!.id);
  const [kind, setKind] = useState<ExceptionKind>('off');
  const [date, setDate] = useState<IsoDate | null>(null);
  const [time, setTime] = useState({ start: hhmm('16:00'), end: hhmm('18:00') });

  const commitment = commitments.find((item) => item.id === commitmentId) ?? commitments[0]!;

  // Ett extrapass kan läggas vilken dag som helst. Att ställa in eller flytta
  // förutsätter att åtagandet faktiskt återkommer den dagen.
  const allowedDates = useMemo(
    () => (kind === 'extra' ? dates : recurringDatesInWeek(commitment, dates)),
    [kind, commitment, dates],
  );

  const chosen = date !== null && allowedDates.includes(date) ? date : null;
  const needsTime = kind !== 'off';
  const endBeforeStart = time.end <= time.start;
  const canCreate = chosen !== null && (!needsTime || !endBeforeStart);

  return (
    <Sheet
      title={strings.exceptionEditor.title}
      closeLabel={strings.commitmentEditor.cancel}
      onClose={onClose}
      footer={
        <Button
          onClick={() => {
            if (chosen === null) return;
            onCreate(
              commitment.id,
              kind === 'off'
                ? { date: chosen, kind: 'off' }
                : { date: chosen, kind, start: time.start, end: time.end },
            );
          }}
          disabled={!canCreate}
        >
          {strings.exceptionEditor.create}
        </Button>
      }
    >
      <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
        {strings.exceptionEditor.lead}
      </p>

      <Field label={strings.exceptionEditor.whichLabel}>
        <ChipGroup
          value={commitmentId}
          onChange={setCommitmentId}
          options={commitments.map((item) => ({ value: item.id, label: item.label }))}
        />
      </Field>

      <Field label={strings.exceptionEditor.kindLabel}>
        <ChipGroup<ExceptionKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'off', label: strings.exceptionEditor.off },
            { value: 'moved', label: strings.exceptionEditor.moved },
            { value: 'extra', label: strings.exceptionEditor.extra },
          ]}
        />
      </Field>

      <Field label={strings.exceptionEditor.dayLabel}>
        {allowedDates.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {strings.exceptionEditor.noDaysForKind}
          </p>
        ) : (
          <WeekdayPicker
            selected={chosen === null ? [] : [weekdayOf(chosen)]}
            enabled={allowedDates.map(weekdayOf)}
            onToggle={(weekday: Weekday) =>
              setDate(dates.find((candidate) => weekdayOf(candidate) === weekday) ?? null)
            }
          />
        )}
      </Field>

      {needsTime && (
        <Field label={strings.exceptionEditor.timeLabel}>
          <TimeRange
            start={time.start}
            end={time.end}
            onChange={setTime}
            error={endBeforeStart ? strings.commitmentEditor.endBeforeStart : undefined}
          />
        </Field>
      )}
    </Sheet>
  );
}
