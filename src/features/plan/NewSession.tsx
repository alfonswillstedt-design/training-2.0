import { TextField } from '../../design';
import { strings } from '../../strings';

/** Namnge ett pass och lägg till det. Samma kontroll i uppläggsfliken som i frågorna. */
export function NewSession({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <TextField
        value={value}
        onChange={onChange}
        label={strings.plan.addSession}
        placeholder={strings.plan.sessionPlaceholder}
        onSubmit={onAdd}
      />
      <IconButton
        label={strings.plan.addSession}
        symbol="+"
        disabled={value.trim() === ''}
        onClick={onAdd}
      />
    </div>
  );
}

export function IconButton({
  label,
  symbol,
  disabled,
  onClick,
}: {
  label: string;
  symbol: string;
  disabled?: boolean | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`size-11 shrink-0 rounded-tight border border-line text-[16px] ${
        disabled ? 'text-ink-faint opacity-40' : 'text-ink-soft'
      }`}
    >
      {symbol}
    </button>
  );
}
