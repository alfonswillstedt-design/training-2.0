import type { TrainingPlan, TrainingSession, Weekday } from '../../scheduling/types';

/**
 * Rena tillståndsövergångar för träningsupplägget.
 *
 * Bindningarna i veckobundet läge säger vilket pass som hör till en dag —
 * aldrig om användaren hinner träna den dagen. Tiden räknar motorn ut ändå.
 */

let counter = 0;

function nextId(name: string): string {
  counter += 1;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'pass'}-${counter.toString(36)}`;
}

/** Byter läge utan att tappa passen. Bindningar finns bara i veckobundet. */
export function setMode(plan: TrainingPlan, mode: TrainingPlan['mode']): TrainingPlan {
  if (plan.mode === mode) return plan;
  return mode === 'rolling'
    ? { mode: 'rolling', sessions: plan.sessions }
    : { mode: 'weekly', sessions: plan.sessions, bindings: [] };
}

function withSessions(plan: TrainingPlan, sessions: TrainingSession[]): TrainingPlan {
  if (plan.mode === 'rolling') return { mode: 'rolling', sessions };
  return {
    mode: 'weekly',
    sessions,
    // En bindning till ett pass som inte finns kvar är ingen bindning.
    bindings: plan.bindings.filter((binding) =>
      sessions.some((session) => session.id === binding.sessionId),
    ),
  };
}

export function addSession(plan: TrainingPlan, name: string): TrainingPlan {
  const trimmed = name.trim();
  if (trimmed === '') return plan;
  return withSessions(plan, [...plan.sessions, { id: nextId(trimmed), name: trimmed }]);
}

export function renameSession(plan: TrainingPlan, id: string, name: string): TrainingPlan {
  return withSessions(
    plan,
    plan.sessions.map((session) => (session.id === id ? { ...session, name } : session)),
  );
}

export function removeSession(plan: TrainingPlan, id: string): TrainingPlan {
  return withSessions(
    plan,
    plan.sessions.filter((session) => session.id !== id),
  );
}

/** Flyttar ett pass i ordningen. Ordningen *är* rotationen. */
export function moveSession(plan: TrainingPlan, id: string, delta: number): TrainingPlan {
  const from = plan.sessions.findIndex((session) => session.id === id);
  if (from === -1) return plan;

  const to = from + delta;
  if (to < 0 || to >= plan.sessions.length) return plan;

  const sessions = [...plan.sessions];
  const [moved] = sessions.splice(from, 1);
  sessions.splice(to, 0, moved!);
  return withSessions(plan, sessions);
}

/** Binder ett pass till en veckodag, eller lossar det med `null`. */
export function bindWeekday(
  plan: TrainingPlan,
  weekday: Weekday,
  sessionId: string | null,
): TrainingPlan {
  if (plan.mode !== 'weekly') return plan;

  const others = plan.bindings.filter((binding) => binding.weekday !== weekday);
  return {
    ...plan,
    bindings:
      sessionId === null
        ? others
        : [...others, { weekday, sessionId }].sort((a, b) => a.weekday - b.weekday),
  };
}

export function sessionForWeekday(plan: TrainingPlan, weekday: Weekday): string | null {
  if (plan.mode !== 'weekly') return null;
  return plan.bindings.find((binding) => binding.weekday === weekday)?.sessionId ?? null;
}

/** Ett upplägg utan pass kan motorn inte planera något med. */
export function isPlanUsable(plan: TrainingPlan): boolean {
  return plan.sessions.length > 0;
}
