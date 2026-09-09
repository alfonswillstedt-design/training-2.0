import { runMigrations, type MigrationFailure } from './migrate';
import { emptyData, parseAppData, SCHEMA_VERSION, type AppData } from './schema';

/** Allt ligger under en enda nyckel. */
export const STORAGE_KEY = 'traningsschemalaggare';

/** Data som inte gick att läsa flyttas hit i stället för att skrivas över. */
export const QUARANTINE_KEY = 'traningsschemalaggare.olasbar';

export type LoadStatus = 'empty' | 'ok' | 'unreadable';

export interface LoadResult {
  status: LoadStatus;
  data: AppData;
}

function read(raw: string): AppData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const migrated = runMigrations(parsed, SCHEMA_VERSION);
  return migrated.ok ? parseAppData(migrated.data) : null;
}

/**
 * Läser användarens data.
 *
 * Går den inte att läsa läggs den undan i karantän i stället för att skrivas
 * över — den kan vara det enda exemplaret. Appen startar tom, men säger ifrån.
 */
export function load(storage: Storage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    // Lagringen är avstängd. Appen fungerar, men inget sparas.
    return { status: 'empty', data: emptyData() };
  }

  if (raw === null) return { status: 'empty', data: emptyData() };

  const data = read(raw);
  if (data !== null) return { status: 'ok', data };

  try {
    storage.setItem(QUARANTINE_KEY, raw);
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Får den inte plats i karantän är den kvar där den är. Inget raderas.
  }
  return { status: 'unreadable', data: emptyData() };
}

/** Sparar. Falskt betyder att lagringen sa nej — full disk eller privat läge. */
export function save(storage: Storage, data: AppData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Export och import — hela backup-lösningen när det inte finns någon backend,
// och vägen in i en framtida native-app.
// ---------------------------------------------------------------------------

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export type ImportFailure = 'invalid-json' | MigrationFailure;

export type ImportResult = { ok: true; data: AppData } | { ok: false; reason: ImportFailure };

export function importJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  const migrated = runMigrations(parsed, SCHEMA_VERSION);
  if (!migrated.ok) return { ok: false, reason: migrated.reason };

  const data = parseAppData(migrated.data);
  return data === null ? { ok: false, reason: 'unreadable' } : { ok: true, data };
}
