import type { ReactNode } from 'react';
import { ChipGroup, Field, Sheet, Stepper, TimeField, Toggle } from '../../design';
import { ALL_WEEKDAYS } from '../../scheduling/defaults';
import type { Preferences, TravelMode, Weekday } from '../../scheduling/types';
import { strings } from '../../strings';

/**
 * Inställningarna. Nås från Upplägg, inte som en egen flik — det finns bara
 * fyra flikar och en inställningsflik hade varit den femte.
 *
 * Ingen spara-knapp: varje ändring räknar om veckan direkt.
 */
export function SettingsSheet({
  preferences,
  onChange,
  onClose,
  footer,
}: {
  preferences: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
  onClose: () => void;
  footer?: ReactNode | undefined;
}) {
  const minutes = strings.settings.minutes;

  return (
    <Sheet title={strings.settings.title} closeLabel={strings.settings.done} onClose={onClose}>
      <Field label={strings.settings.sessionLength}>
        <Stepper
          value={preferences.sessionLength}
          onChange={(sessionLength) => onChange({ sessionLength })}
          step={15}
          min={15}
          max={240}
          format={minutes}
          label={strings.settings.sessionLength}
        />
      </Field>

      <Field label={strings.settings.travelMode}>
        <ChipGroup<TravelMode>
          value={preferences.travelMode}
          onChange={(travelMode) => onChange({ travelMode })}
          options={(['walk', 'bike', 'transit', 'car'] as TravelMode[]).map((mode) => ({
            value: mode,
            label: strings.settings.travelModes[mode],
          }))}
        />
      </Field>

      <Field label={strings.settings.travelTo}>
        <Stepper
          value={preferences.travelToGym}
          onChange={(travelToGym) => onChange({ travelToGym })}
          step={5}
          min={0}
          max={120}
          format={minutes}
          label={strings.settings.travelTo}
        />
      </Field>

      <Field label={strings.settings.travelFrom}>
        <Stepper
          value={preferences.travelFromGym}
          onChange={(travelFromGym) => onChange({ travelFromGym })}
          step={5}
          min={0}
          max={120}
          format={minutes}
          label={strings.settings.travelFrom}
        />
      </Field>

      <Field label={strings.settings.windowLabel}>
        <div className="flex items-center gap-3">
          <TimeField
            value={preferences.earliestStart}
            label={strings.settings.earliest}
            onChange={(earliestStart) => onChange({ earliestStart })}
          />
          <span className="text-ink-faint">–</span>
          <TimeField
            value={preferences.latestEnd}
            label={strings.settings.latest}
            onChange={(latestEnd) => onChange({ latestEnd })}
          />
        </div>
      </Field>

      <Field label={strings.settings.gymLabel}>
        <ul className="overflow-hidden rounded-tight border border-line bg-raised">
          {ALL_WEEKDAYS.map((weekday: Weekday) => {
            const hours = preferences.gymHours[weekday];
            return (
              <li
                key={weekday}
                className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0"
              >
                <span className="w-[3ch] shrink-0 text-[14px] font-medium text-ink-soft">
                  {strings.weekdays.initials[weekday - 1]}
                </span>

                {hours ? (
                  <span className="flex flex-1 items-center gap-2">
                    <CompactTime
                      value={hours.open}
                      label={strings.timeField.from}
                      onChange={(open) =>
                        onChange({
                          gymHours: { ...preferences.gymHours, [weekday]: { ...hours, open } },
                        })
                      }
                    />
                    <span className="text-ink-faint">–</span>
                    <CompactTime
                      value={hours.close}
                      label={strings.timeField.to}
                      onChange={(close) =>
                        onChange({
                          gymHours: { ...preferences.gymHours, [weekday]: { ...hours, close } },
                        })
                      }
                    />
                  </span>
                ) : (
                  <span className="flex-1 text-[15px] text-ink-faint">
                    {strings.settings.closed}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      gymHours: {
                        ...preferences.gymHours,
                        [weekday]: hours ? null : { open: 360, close: 1320 },
                      },
                    })
                  }
                  className="min-h-11 shrink-0 px-2 text-[13px] font-medium text-accent"
                >
                  {hours ? strings.settings.markClosed : strings.settings.markOpen}
                </button>
              </li>
            );
          })}
        </ul>
      </Field>

      <Field label={strings.settings.mealLabel}>
        <Toggle
          label={strings.settings.mealOn}
          help={strings.settings.mealHelp}
          checked={preferences.meal.enabled}
          onChange={(enabled) => onChange({ meal: { ...preferences.meal, enabled } })}
        />
        {preferences.meal.enabled && (
          <div className="mt-2">
            <Stepper
              value={preferences.meal.duration}
              onChange={(duration) => onChange({ meal: { ...preferences.meal, duration } })}
              step={5}
              min={0}
              max={180}
              format={minutes}
              label={strings.settings.mealDuration}
            />
          </div>
        )}
      </Field>

      <Field label={strings.settings.pwoLabel}>
        <ChipGroup<Preferences['pwo']['mode']>
          value={preferences.pwo.mode}
          onChange={(mode) => onChange({ pwo: { ...preferences.pwo, mode } })}
          options={(['off', 'before', 'during'] as const).map((mode) => ({
            value: mode,
            label: strings.settings.pwoModes[mode],
          }))}
        />
        {preferences.pwo.mode === 'before' && (
          <div className="mt-2">
            <Stepper
              value={preferences.pwo.margin}
              onChange={(margin) => onChange({ pwo: { ...preferences.pwo, margin } })}
              step={5}
              min={0}
              max={120}
              format={minutes}
              label={strings.settings.pwoMargin}
            />
          </div>
        )}
      </Field>

      <Field label={strings.settings.restLabel}>
        <Stepper
          value={preferences.rest.minRestDays}
          onChange={(minRestDays) => onChange({ rest: { ...preferences.rest, minRestDays } })}
          step={1}
          min={0}
          max={6}
          format={strings.settings.days}
          label={strings.settings.minRestDays}
        />
        <div className="mt-2">
          <Toggle
            label={strings.settings.noSameSessionBackToBack}
            checked={preferences.rest.noSameSessionBackToBack}
            onChange={(noSameSessionBackToBack) =>
              onChange({ rest: { ...preferences.rest, noSameSessionBackToBack } })
            }
          />
        </div>
      </Field>

      {footer}
    </Sheet>
  );
}

/** Smalare tidsväljare, för de sju raderna med öppettider. */
function CompactTime({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <span className="flex-1">
      <TimeField value={value} label={label} onChange={onChange} />
    </span>
  );
}
