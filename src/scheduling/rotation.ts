import type { CompletedSession, RotationState, TrainingSession } from './types';

/**
 * Rotationsläget är alltid en funktion av loggade pass — aldrig en egen räknare
 * vid sidan av. Det gör att ångra och redigera historiken bara fungerar.
 */
export function deriveRotationState(completed: CompletedSession[]): RotationState {
  let latest: CompletedSession | null = null;
  for (const session of completed) {
    // >= gör att det sist tillagda vinner när två pass loggats samma dag.
    if (latest === null || session.date >= latest.date) latest = session;
  }
  return { lastCompletedSessionId: latest?.sessionId ?? null };
}

/** Nästa pass i rotationen. Börjar om från början om det förra passet är borta. */
export function nextSessionId(sessions: TrainingSession[], lastId: string | null): string | null {
  const first = sessions[0];
  if (!first) return null;

  const index = lastId === null ? -1 : sessions.findIndex((session) => session.id === lastId);
  if (index === -1) return first.id;

  return sessions[(index + 1) % sessions.length]!.id;
}
