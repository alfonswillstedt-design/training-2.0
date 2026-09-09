import { Button, Field, Sheet, TextField, TimeRange, Toggle, WeekdayPicker } from '../../design';
import type { Commitment, Weekday } from '../../scheduling/types';
import { strings } from '../../strings';
import { isUsable, toggleWeekday } from './commitmentActions';

/**
 * Redigerar ett åtagande.
 *
 * Ett befintligt åtagande ändras direkt — varje tryck räknar om veckan och
 * det finns ingen spara-knapp. Ett nytt åtagande måste däremot bekräftas, så
 * att ett halvfärdigt utkast aldrig hamnar i listan.
 */
export function CommitmentEditor({
  commitment,
  isNew,
  onChange,
  onCreate,
  onRemove,
  onClose,
}: {
  commitment: Commitment;
  isNew: boolean;
  onChange: (patch: Partial<Omit<Commitment, 'id'>>) => void;
  onCreate: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const endBeforeStart = commitment.end <= commitment.start;
  const canCreate = isUsable(commitment) && !endBeforeStart;

  return (
    <Sheet
      title={isNew ? strings.commitmentEditor.newTitle : strings.commitmentEditor.editTitle}
      closeLabel={isNew ? strings.commitmentEditor.cancel : strings.commitmentEditor.done}
      onClose={onClose}
      footer={
        isNew ? (
          <Button onClick={onCreate} disabled={!canCreate}>
            {strings.commitmentEditor.create}
          </Button>
        ) : (
          <Button variant="danger" onClick={onRemove}>
            {strings.commitmentEditor.remove}
          </Button>
        )
      }
    >
      <Field label={strings.commitmentEditor.nameLabel}>
        <TextField
          value={commitment.label}
          label={strings.commitmentEditor.nameLabel}
          onChange={(label) => onChange({ label })}
          placeholder={strings.commitmentEditor.namePlaceholder}
          autoFocus={isNew}
        />
      </Field>

      <Field label={strings.commitmentEditor.daysLabel}>
        <WeekdayPicker
          selected={commitment.weekdays}
          onToggle={(weekday: Weekday) =>
            onChange({ weekdays: toggleWeekday(commitment.weekdays, weekday) })
          }
        />
      </Field>

      <Field label={strings.commitmentEditor.timeLabel}>
        <TimeRange
          start={commitment.start}
          end={commitment.end}
          onChange={onChange}
          error={endBeforeStart ? strings.commitmentEditor.endBeforeStart : undefined}
        />
      </Field>

      <Toggle
        label={strings.commitmentEditor.mealLabel}
        help={strings.commitmentEditor.mealHelp}
        checked={commitment.needsMealAfter}
        onChange={(needsMealAfter) => onChange({ needsMealAfter })}
      />
    </Sheet>
  );
}
