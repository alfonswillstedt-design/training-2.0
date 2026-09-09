import { useState } from 'react';
import { Button, ChipGroup, EmptyState, Field, Screen, ScreenHeader, TextField } from '../../design';
import { ALL_WEEKDAYS } from '../../scheduling/defaults';
import type { TrainingPlan, Weekday } from '../../scheduling/types';
import { strings } from '../../strings';
import { IconButton, NewSession } from './NewSession';
import { StarterPicker } from './StarterPicker';
import {
  addSession,
  bindWeekday,
  moveSession,
  removeSession,
  renameSession,
  sessionForWeekday,
  setMode,
} from './planActions';

/**
 * Flik 4 — upplägget.
 *
 * Veckobundet läge är den enda platsen i appen där ett pass binds till en
 * veckodag, och det är ett val om *vilket* pass som hör till dagen — aldrig
 * om användaren hinner träna den. Tiden räknar motorn ut ändå.
 */
export function PlanView({
  plan,
  onChange,
  onOpenSettings,
}: {
  plan: TrainingPlan;
  onChange: (next: TrainingPlan) => void;
  onOpenSettings: () => void;
}) {
  const [newName, setNewName] = useState('');

  function add() {
    const next = addSession(plan, newName);
    if (next !== plan) {
      onChange(next);
      setNewName('');
    }
  }

  return (
    <Screen>
      {plan.sessions.length === 0 ? (
        <EmptyState title={strings.plan.empty.title} body={strings.plan.empty.body}>
          <div className="mt-7">
            <StarterPicker onPick={onChange} />
          </div>
          <div className="mt-5">
            <NewSession value={newName} onChange={setNewName} onAdd={add} />
          </div>
        </EmptyState>
      ) : (
        <>
          <ScreenHeader title={strings.plan.title} lead={strings.plan.lead} />

          <Field label={strings.plan.modeLabel}>
            <ChipGroup<TrainingPlan['mode']>
              value={plan.mode}
              onChange={(mode) => onChange(setMode(plan, mode))}
              options={[
                { value: 'rolling', label: strings.plan.rolling },
                { value: 'weekly', label: strings.plan.weekly },
              ]}
            />
            <p className="mt-2 text-[14px] leading-snug text-ink-soft">
              {plan.mode === 'rolling' ? strings.plan.rollingHelp : strings.plan.weeklyHelp}
            </p>
          </Field>

          <Field label={strings.plan.sessionsLabel}>
            <ul className="flex flex-col gap-2">
              {plan.sessions.map((session, index) => (
                <li key={session.id} className="flex items-center gap-2">
                  <TextField
                    value={session.name}
                    onChange={(name) => onChange(renameSession(plan, session.id, name))}
                  />
                  <IconButton
                    label={strings.plan.moveUp}
                    symbol="↑"
                    disabled={index === 0}
                    onClick={() => onChange(moveSession(plan, session.id, -1))}
                  />
                  <IconButton
                    label={strings.plan.moveDown}
                    symbol="↓"
                    disabled={index === plan.sessions.length - 1}
                    onClick={() => onChange(moveSession(plan, session.id, 1))}
                  />
                  <IconButton
                    label={strings.plan.removeSession}
                    symbol="✕"
                    onClick={() => onChange(removeSession(plan, session.id))}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <NewSession value={newName} onChange={setNewName} onAdd={add} />
            </div>
          </Field>

          {plan.mode === 'weekly' && (
            <Field label={strings.plan.bindingsLabel}>
              <ul className="overflow-hidden rounded-tight border border-line bg-raised">
                {ALL_WEEKDAYS.map((weekday: Weekday) => (
                  <li
                    key={weekday}
                    className="flex items-center gap-3 border-b border-line px-3 py-1.5 last:border-b-0"
                  >
                    <span className="w-[3ch] shrink-0 text-[14px] font-medium text-ink-soft">
                      {strings.weekdays.initials[weekday - 1]}
                    </span>
                    <select
                      aria-label={strings.weekdays.long[weekday - 1]}
                      value={sessionForWeekday(plan, weekday) ?? ''}
                      onChange={(event) =>
                        onChange(bindWeekday(plan, weekday, event.target.value || null))
                      }
                      className="min-h-11 flex-1 appearance-none bg-transparent text-[15px] text-ink"
                    >
                      <option value="">{strings.plan.unbound}</option>
                      {plan.sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </Field>
          )}

          <div className="mt-2">
            <Button variant="quiet" onClick={onOpenSettings}>
              {strings.plan.openSettings}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}
