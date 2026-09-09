import { useState } from 'react';
import { Button, ChipGroup, Field, Screen, Stepper, TimeField } from '../../design';
import type { Preferences, TrainingPlan, TravelMode } from '../../scheduling/types';
import { strings } from '../../strings';
import { IconButton, NewSession } from './NewSession';
import { addSession, isPlanUsable, removeSession } from './planActions';
import { StarterPicker } from './StarterPicker';

/**
 * Första besöket.
 *
 * Ingen karusell och inga punkter — frågorna ställs i appens riktiga UI, med
 * samma kontroller som finns i inställningarna. Fyra frågor, sedan är
 * användaren inne.
 *
 * Den fjärde frågan finns för att appen annars måste anta när på dygnet någon
 * vill träna, och varje antagande där blir fel för någon.
 */
export function Onboarding({
  plan,
  preferences,
  onChangePreferences,
  onChangePlan,
  onDone,
}: {
  plan: TrainingPlan;
  preferences: Preferences;
  onChangePreferences: (patch: Partial<Preferences>) => void;
  onChangePlan: (plan: TrainingPlan) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [own, setOwn] = useState(false);
  const [newName, setNewName] = useState('');
  const minutes = strings.settings.minutes;
  const last = step === 3;

  function addOwn() {
    const next = addSession(plan, newName);
    if (next !== plan) {
      onChangePlan(next);
      setNewName('');
    }
  }

  // Första steget har ingen knapp när man väljer ur listan — valet går vidare
  // av sig självt. Skriver man in eget behövs den för att gå vidare.
  const showNext = step > 0 || (own && isPlanUsable(plan));

  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-center pb-4">
        <h1 className="mb-8 text-[30px] leading-[1.1] font-semibold tracking-[-0.025em]">
          {[
            strings.onboarding.questions.plan,
            strings.onboarding.questions.length,
            strings.onboarding.questions.travel,
            strings.onboarding.questions.window,
          ][step]}
        </h1>

        {step === 0 &&
          (own ? (
            <div className="flex flex-col gap-4">
              <NewSession value={newName} onChange={setNewName} onAdd={addOwn} />

              {plan.sessions.length > 0 && (
                <ul className="overflow-hidden rounded-soft border border-line bg-raised">
                  {plan.sessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center justify-between gap-2 border-b border-line py-2 pr-2 pl-4 last:border-b-0"
                    >
                      <span className="text-[16px] font-medium">{session.name}</span>
                      <IconButton
                        label={strings.plan.removeSession}
                        symbol="✕"
                        onClick={() => onChangePlan(removeSession(plan, session.id))}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <Button variant="quiet" onClick={() => setOwn(false)}>
                {strings.onboarding.pickReady}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <StarterPicker
                onPick={(picked) => {
                  onChangePlan(picked);
                  setStep(1);
                }}
              />
              <Button variant="quiet" onClick={() => setOwn(true)}>
                {strings.onboarding.ownPlan}
              </Button>
            </div>
          ))}

        {step === 1 && (
          <Stepper
            value={preferences.sessionLength}
            onChange={(sessionLength) => onChangePreferences({ sessionLength })}
            step={15}
            min={15}
            max={240}
            format={minutes}
            label={strings.settings.sessionLength}
          />
        )}

        {step === 2 && (
          <>
            <ChipGroup<TravelMode>
              value={preferences.travelMode}
              onChange={(travelMode) => onChangePreferences({ travelMode })}
              options={(['walk', 'bike', 'transit', 'car'] as TravelMode[]).map((mode) => ({
                value: mode,
                label: strings.settings.travelModes[mode],
              }))}
            />
            <div className="mt-4">
              <Stepper
                value={preferences.travelToGym}
                onChange={(travel) =>
                  onChangePreferences({ travelToGym: travel, travelFromGym: travel })
                }
                step={5}
                min={0}
                max={120}
                format={minutes}
                label={strings.settings.travelTo}
              />
            </div>
            <p className="mt-3 text-[14px] leading-snug text-ink-soft">
              {strings.onboarding.help.travel}
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <Field label={strings.settings.windowLabel}>
              <div className="flex items-center gap-3">
                <TimeField
                  value={preferences.earliestStart}
                  label={strings.settings.earliest}
                  onChange={(earliestStart) => onChangePreferences({ earliestStart })}
                />
                <span className="text-ink-faint">–</span>
                <TimeField
                  value={preferences.latestEnd}
                  label={strings.settings.latest}
                  onChange={(latestEnd) => onChangePreferences({ latestEnd })}
                />
              </div>
            </Field>
            <p className="text-[14px] leading-snug text-ink-soft">
              {strings.onboarding.help.window}
            </p>
          </>
        )}
      </div>

      {showNext && (
        <Button onClick={() => (last ? onDone() : setStep(step + 1))}>
          {last ? strings.onboarding.start : strings.onboarding.next}
        </Button>
      )}
    </Screen>
  );
}
