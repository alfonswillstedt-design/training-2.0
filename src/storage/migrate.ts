/**
 * Migreringar mellan schemaversioner.
 *
 * Listan är tom idag, men maskineriet finns från dag ett. Utan det blir den
 * enkla utvägen vid en framtida ändring att radera användarens data, och det
 * är den ena saken lagringen aldrig får göra.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Nyckeln är versionen man migrerar *från*. */
export const migrations: Record<number, Migration> = {
  // 1 → 2: `onboarded` tillkom när de första frågorna byggdes. Den som redan
  // har sparad data har uppenbart använt appen, så frågorna ska inte ställas.
  1: (data) => ({ ...data, onboarded: true }),
};

export type MigrationFailure = 'unreadable' | 'newer-version' | 'missing-migration';

export type MigrationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: MigrationFailure };

/**
 * Lyfter rådata upp till målversionen, ett steg i taget.
 *
 * Data från en *nyare* version avvisas hellre än gissas på — en nyare app kan
 * ha fält vi inte känner till, och att tolka dem fel vore att tyst förvanska
 * användarens schema.
 */
export function runMigrations(
  raw: unknown,
  target: number,
  steps: Record<number, Migration> = migrations,
): MigrationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'unreadable' };
  }

  let data = raw as Record<string, unknown>;
  const version = data['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'unreadable' };
  }
  if (version > target) return { ok: false, reason: 'newer-version' };

  for (let from = version; from < target; from += 1) {
    const step = steps[from];
    if (!step) return { ok: false, reason: 'missing-migration' };
    data = step(data);
  }

  return { ok: true, data: { ...data, schemaVersion: target } };
}
