import type { ReactNode } from 'react';
import { hhmm, toHhmm } from '../scheduling/time';
import type { Minutes, Weekday } from '../scheduling/types';
import { strings } from '../strings';

/**
 * Formulärkontroller i appens eget designspråk.
 *
 * Alla träffytor är minst 44 px. Ingenting här kommer från ett
 * komponentbibliotek — appen har inga tunga beroenden.
 */

const FIELD =
  'w-full rounded-tight border border-line bg-raised px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'quiet' | 'danger' | undefined;
  disabled?: boolean | undefined;
}) {
  const look = {
    primary: 'bg-accent text-accent-ink font-semibold disabled:opacity-40',
    quiet: 'border border-line text-ink font-medium',
    danger: 'border border-line text-accent font-medium',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-tight px-5 py-4 text-[16px] ${look} ${
        disabled ? '' : 'active:scale-[0.99]'
      }`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[12px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  autoFocus?: boolean | undefined;
  /** Anropas på Enter. Att skriva ett namn och trycka retur ska räcka. */
  onSubmit?: (() => void) | undefined;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onSubmit) onSubmit();
      }}
      className={FIELD}
    />
  );
}

/**
 * Ett klockslag som timme och minut.
 *
 * Inte `<input type="time">`: den renderar AM/PM efter webbläsarens språk, och
 * det gör den oanvändbar i en app som visar 24-timmarsklocka överallt annars.
 * Två `select` ger dessutom telefonens egen hjulväljare utan något beroende.
 */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_STEP = 5;

export function TimeField({
  value,
  onChange,
  label,
}: {
  value: Minutes;
  onChange: (value: Minutes) => void;
  label: string;
}) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;

  // Ett värde som inte ligger på stegen ska ändå gå att visa och behålla.
  const minutes = [...new Set([...Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP), minute])].sort(
    (a, b) => a - b,
  );

  const unit = 'appearance-none py-3 text-center text-[16px] tabular-nums';

  return (
    <div className="flex flex-1 items-center justify-center rounded-tight border border-line bg-raised px-1">
      <select
        aria-label={`${label}, ${strings.timeField.hour}`}
        value={hour}
        onChange={(event) => onChange(Number(event.target.value) * 60 + minute)}
        className={`${unit} pl-3`}
      >
        {HOURS.map((option) => (
          <option key={option} value={option}>
            {String(option).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="text-ink-faint">
        :
      </span>
      <select
        aria-label={`${label}, ${strings.timeField.minute}`}
        value={minute}
        onChange={(event) => onChange(hour * 60 + Number(event.target.value))}
        className={`${unit} pr-3`}
      >
        {minutes.map((option) => (
          <option key={option} value={option}>
            {String(option).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TimeRange({
  start,
  end,
  onChange,
  error,
}: {
  start: Minutes;
  end: Minutes;
  onChange: (next: { start: Minutes; end: Minutes }) => void;
  error?: string | undefined;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <TimeField value={start} label={strings.timeField.from} onChange={(next) => onChange({ start: next, end })} />
        <span className="text-ink-faint">–</span>
        <TimeField value={end} label={strings.timeField.to} onChange={(next) => onChange({ start, end: next })} />
      </div>
      {error && <p className="mt-2 text-[13px] text-accent">{error}</p>}
    </>
  );
}

export function WeekdayPicker({
  selected,
  onToggle,
  enabled,
}: {
  selected: Weekday[];
  onToggle: (weekday: Weekday) => void;
  /** Om satt går bara de här dagarna att välja. */
  enabled?: Weekday[] | undefined;
}) {
  const days: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex gap-1.5">
      {days.map((day) => {
        const on = selected.includes(day);
        const disabled = enabled !== undefined && !enabled.includes(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onToggle(day)}
            className={`h-11 flex-1 rounded-tight text-[14px] font-medium ${
              on
                ? 'bg-accent text-accent-ink'
                : disabled
                  ? 'border border-line text-ink-faint opacity-40'
                  : 'border border-line text-ink-soft'
            }`}
          >
            {strings.weekdays.initials[day - 1]}
          </button>
        );
      })}
    </div>
  );
}

/** Ett val ur en kort lista. Chips, inte en rullgardin. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-tight px-4 text-[15px] ${
            option.value === value
              ? 'bg-accent text-accent-ink font-semibold'
              : 'border border-line text-ink-soft'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-tight border border-line bg-raised p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-accent"
      />
      <span>
        <span className="block text-[15px] leading-snug">{label}</span>
        {help && <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{help}</span>}
      </span>
    </label>
  );
}

/** Ett tal man stegar i stället för att skriva. Snabbare med en tumme. */
export function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  format,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  format: (value: number) => string;
  label: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="flex items-center justify-between gap-3 rounded-tight border border-line bg-raised px-3 py-2">
      <StepButton label={`${label}, mindre`} sign="−" disabled={value <= min} onClick={() => onChange(clamp(value - step))} />
      <span className="text-[16px] font-medium tabular-nums">{format(value)}</span>
      <StepButton label={`${label}, mer`} sign="+" disabled={value >= max} onClick={() => onChange(clamp(value + step))} />
    </div>
  );
}

function StepButton({
  label,
  sign,
  disabled,
  onClick,
}: {
  label: string;
  sign: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`size-11 shrink-0 rounded-tight text-[20px] leading-none ${
        disabled ? 'text-ink-faint opacity-40' : 'text-ink'
      }`}
    >
      {sign}
    </button>
  );
}
