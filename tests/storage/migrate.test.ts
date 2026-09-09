import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../../src/scheduling/defaults';
import { runMigrations, type Migration } from '../../src/storage/migrate';
import { parseAppData, SCHEMA_VERSION } from '../../src/storage/schema';

const steps: Record<number, Migration> = {
  1: (data) => ({ ...data, tillagd: 'i två' }),
  2: (data) => ({ ...data, tillagd: `${String(data['tillagd'])} och i tre` }),
};

describe('runMigrations', () => {
  it('rör inte data som redan är på målversionen', () => {
    const result = runMigrations({ schemaVersion: 3, x: 1 }, 3, steps);
    expect(result).toEqual({ ok: true, data: { schemaVersion: 3, x: 1 } });
  });

  it('kör stegen i ordning och sätter målversionen', () => {
    const result = runMigrations({ schemaVersion: 1 }, 3, steps);
    expect(result).toEqual({
      ok: true,
      data: { schemaVersion: 3, tillagd: 'i två och i tre' },
    });
  });

  it('avvisar data från en nyare version i stället för att gissa', () => {
    expect(runMigrations({ schemaVersion: 9 }, 3, steps)).toEqual({
      ok: false,
      reason: 'newer-version',
    });
  });

  it('avvisar när ett steg saknas i kedjan', () => {
    expect(runMigrations({ schemaVersion: 1 }, 3, { 1: steps[1]! })).toEqual({
      ok: false,
      reason: 'missing-migration',
    });
  });

  it('avvisar det som inte är ett objekt med en version', () => {
    expect(runMigrations(null, 1, steps).ok).toBe(false);
    expect(runMigrations([], 1, steps).ok).toBe(false);
    expect(runMigrations({}, 1, steps).ok).toBe(false);
    expect(runMigrations({ schemaVersion: '1' }, 1, steps).ok).toBe(false);
    expect(runMigrations({ schemaVersion: 0 }, 1, steps).ok).toBe(false);
  });

  it('muterar inte indata', () => {
    const input = { schemaVersion: 1 };
    runMigrations(input, 3, steps);
    expect(input).toEqual({ schemaVersion: 1 });
  });
});

describe('de riktiga migreringarna', () => {
  it('lyfter version 1 till nuvarande schema', () => {
    const v1 = {
      schemaVersion: 1,
      commitments: [],
      plan: { mode: 'rolling', sessions: [] },
      preferences: defaultPreferences(),
      completedSessions: [],
    };

    const result = runMigrations(v1, SCHEMA_VERSION);
    expect(result.ok).toBe(true);
    expect(parseAppData(result.ok ? result.data : null)).not.toBeNull();
  });

  it('antar att den som redan har sparad data har använt appen', () => {
    const result = runMigrations({ schemaVersion: 1 }, 2);
    expect(result.ok && result.data['onboarded']).toBe(true);
  });

  it('lämnar ny data i fred', () => {
    const result = runMigrations({ schemaVersion: 2, onboarded: false }, 2);
    expect(result.ok && result.data['onboarded']).toBe(false);
  });
});
