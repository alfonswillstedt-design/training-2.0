import { useState } from 'react';
import {
  Button,
  ChipGroup,
  Field,
  Sheet,
  TextField,
  TimeRange,
  Toggle,
  WeekdayPicker,
} from '../../design';
import { weekdayOf } from '../../scheduling/date';
import type { Commitment, IsoDate, Minutes, Weekday } from '../../scheduling/types';
import { strings } from '../../strings';
import { asOneOff, isUsable, oneOffDate, toggleWeekday } from './commitmentActions';

type Repeat = 'weekly' | 'once';

/**
 * Redigerar ett åtagande.
 *
 * Ett befintligt åtagande ändras direkt — varje tryck räknar om veckan och
 * det finns ingen spara-knapp. Ett nytt åtagande måste däremot bekräftas, så
 * att ett halvfärdigt utkast aldrig hamnar i listan.
 *
 * Två sorter ryms här: något som återkommer varje vecka, och något som händer
 * en enda gång. Utan det andra fanns ingen rak väg att lägga in "plugga
 * tisdag 19–20" — man tvingades antingen upprepa det varje vecka eller hänga
 * det som undantag på ett åtagande det inte hörde till.
 */
export function CommitmentEditor({
  commitment,
  isNew,
  dates,
  onChange,
  onCreate,
  onRemove,
  onClose,
}: {
  commitment: Commitment;
  isNew: boolean;
  /** Veckans datum, för att kunna välja dag när något händer en gång. */
  dates: IsoDate[];
  onChange: (patch: Partial<Omit<Commitment, 'id'>>) => void;
  onCreate: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const chosenDate = oneOffDate(commitment);

  const [repeat, setRepeat] = useState<Repeat>(() =>
    chosenDate !== null || (!isNew && commitment.weekdays.length === 0) ? 'once' : 'weekly',
  );

  const endBeforeStart = commitment.end <= commitment.start;
  const canCreate = isUsable(commitment) && !endBeforeStart;

  function setTimes(next: { start: Minutes; end: Minutes }) {
    // En engångshändelse bär sina tider på undantaget, inte på åtagandet, så
    // båda måste skrivas om tillsammans.
    onChange(repeat === 'once' ? asOneOff(commitment, chosenDate, next.start, next.end) : next);
  }

  function switchRepeat(next: Repeat) {
    setRepeat(next);
    // Dagarna betyder olika saker i de två lägena. Att bära över dem hade gjort
    // en engångshändelse till något veckovis, eller tvärtom.
    onChange({ weekdays: [], exceptions: [] });
  }

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

      <Field label={strings.commitmentEditor.whenLabel}>
        <ChipGroup<Repeat>
          value={repeat}
          onChange={switchRepeat}
          options={[
            { value: 'weekly', label: strings.commitmentEditor.repeats },
            { value: 'once', label: strings.commitmentEditor.once },
          ]}
        />
      </Field>

      {repeat === 'weekly' ? (
        <Field label={strings.commitmentEditor.daysLabel}>
          <WeekdayPicker
            selected={commitment.weekdays}
            onToggle={(weekday: Weekday) =>
              onChange({ weekdays: toggleWeekday(commitment.weekdays, weekday) })
            }
          />
        </Field>
      ) : (
        <Field label={strings.commitmentEditor.dateLabel}>
          <WeekdayPicker
            selected={chosenDate === null ? [] : [weekdayOf(chosenDate)]}
            onToggle={(weekday: Weekday) =>
              onChange(
                asOneOff(
                  commitment,
                  dates.find((date) => weekdayOf(date) === weekday) ?? null,
                  commitment.start,
                  commitment.end,
                ),
              )
            }
          />
          <p className="mt-2 text-[14px] leading-snug text-ink-soft">
            {strings.commitmentEditor.onceHelp}
          </p>
        </Field>
      )}

      <Field label={strings.commitmentEditor.timeLabel}>
        <TimeRange
          start={commitment.start}
          end={commitment.end}
          onChange={setTimes}
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
