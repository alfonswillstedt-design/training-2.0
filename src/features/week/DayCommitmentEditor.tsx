import { Button, Field, Sheet, TextField, TimeRange } from '../../design';
import { weekdayOf } from '../../scheduling/date';
import type { Commitment, IsoDate, Minutes } from '../../scheduling/types';
import { strings } from '../../strings';
import {
  clearDay,
  exceptionOn,
  makeWeeklyFromDay,
  removeCommitment,
  setDayOff,
  setDayTimes,
  updateCommitment,
} from '../commitments/commitmentActions';

/**
 * Ändrar ett åtagande på en enskild dag.
 *
 * Det här är appens vanligaste ändring: veckan blev inte som vanligt. Den görs
 * där man ser den, och den ändrar bara den dagen — tidigare öppnade samma
 * tryck regeln och skrev om alla veckor utan att säga det.
 *
 * Att ändra regeln finns kvar, men som ett eget val längre ner, med en mening
 * som säger vad som händer med de andra dagarna.
 */
export function DayCommitmentEditor({
  commitments,
  commitmentId,
  date,
  onChange,
  onClose,
}: {
  commitments: Commitment[];
  commitmentId: string;
  date: IsoDate;
  onChange: (next: Commitment[]) => void;
  onClose: () => void;
}) {
  const commitment = commitments.find((item) => item.id === commitmentId);
  if (!commitment) return null;

  const weekday = weekdayOf(date);
  const weekdayName = strings.weekdays.long[weekday - 1]!;
  const exception = exceptionOn(commitment, date);
  const isOff = exception?.kind === 'off';
  const recurring = commitment.weekdays.length > 0;

  const start = exception && 'start' in exception ? exception.start : commitment.start;
  const end = exception && 'end' in exception ? exception.end : commitment.end;
  const endBeforeStart = end <= start;

  // Vad "varje vecka framöver" faktiskt gör beror på hur åtagandet ser ut, och
  // det ska stå innan man trycker — inte upptäckas efteråt i listan.
  const rest = commitment.weekdays.filter((day) => day !== weekday);
  const weeklyHelp = isOff
    ? strings.dayEditor.offWeeklyHelp(commitment.label, weekdayName)
    : rest.length === 0
      ? strings.dayEditor.rewriteHelp(commitment.label, weekdayName)
      : strings.dayEditor.splitHelp(commitment.label, weekdayName, strings.weekdays.format(rest));

  const change = (next: Commitment[]) => onChange(next);

  return (
    <Sheet
      title={strings.dayEditor.title(commitment.label, weekdayName)}
      closeLabel={strings.dayEditor.done}
      onClose={onClose}
      footer={
        <>
          {/* Beskedet hör ihop med knappen och står därför intill den, inte
              längst upp på en skärm man redan scrollat förbi. */}
          <p className="mb-2 text-[14px] leading-snug text-ink-faint">
            {strings.dayEditor.removeHelp}
          </p>
          <Button
            variant="danger"
            onClick={() => {
              change(removeCommitment(commitments, commitmentId));
              onClose();
            }}
          >
            {strings.dayEditor.remove(commitment.label)}
          </Button>
        </>
      }
    >
      {/* Namnet hör till regeln, och regeln ändras inte härifrån. En
          engångshändelse har ingen regel — där *är* dagen hela åtagandet, så
          den går att döpa om utan att något annat följer med. */}
      {!recurring && (
        <Field label={strings.commitmentEditor.nameLabel}>
          <TextField
            value={commitment.label}
            label={strings.commitmentEditor.nameLabel}
            onChange={(label) => change(updateCommitment(commitments, commitmentId, { label }))}
            placeholder={strings.commitmentEditor.namePlaceholder}
          />
        </Field>
      )}

      {!isOff && (
        <Field label={strings.dayEditor.timeLabel}>
          <TimeRange
            start={start}
            end={end}
            onChange={(next: { start: Minutes; end: Minutes }) =>
              change(setDayTimes(commitments, commitmentId, date, next.start, next.end))
            }
            error={endBeforeStart ? strings.commitmentEditor.endBeforeStart : undefined}
          />
          <p className="mt-2 text-[14px] leading-snug text-ink-soft">
            {strings.dayEditor.onlyToday(weekdayName)}
          </p>
        </Field>
      )}

      <div className="mt-2 flex flex-col gap-2">
        {recurring &&
          (isOff ? (
            <Button
              variant="quiet"
              onClick={() => change(clearDay(commitments, commitmentId, date))}
            >
              {strings.dayEditor.offAgain}
            </Button>
          ) : (
            <Button
              variant="quiet"
              onClick={() => change(setDayOff(commitments, commitmentId, date))}
            >
              {strings.dayEditor.off}
            </Button>
          ))}

        {recurring && exception && !isOff && (
          <Button variant="quiet" onClick={() => change(clearDay(commitments, commitmentId, date))}>
            {strings.dayEditor.restore(weekdayName)}
          </Button>
        )}

        {exception && (
          <div>
            <Button
              variant="quiet"
              onClick={() => {
                change(makeWeeklyFromDay(commitments, commitmentId, date));
                onClose();
              }}
            >
              {strings.dayEditor.makeWeekly(weekdayName)}
            </Button>
            <p className="mt-2 text-[14px] leading-snug text-ink-soft">{weeklyHelp}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
