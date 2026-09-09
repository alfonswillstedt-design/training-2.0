import { describe, expect, it } from 'vitest';
import { hhmm } from '../../src/scheduling/time';
import { emptyData, SCHEMA_VERSION, type AppData } from '../../src/storage/schema';
import {
  exportJson,
  importJson,
  load,
  QUARANTINE_KEY,
  save,
  STORAGE_KEY,
} from '../../src/storage/storage';
import { MemoryStorage } from './memoryStorage';

function sample(): AppData {
  return {
    ...emptyData(),
    commitments: [
      {
        id: 'skola',
        label: 'Skola',
        weekdays: [1, 2, 3, 4, 5],
        start: hhmm('08:15'),
        end: hhmm('15:30'),
        needsMealAfter: false,
        exceptions: [{ date: '2025-09-05', kind: 'off' }],
      },
    ],
    plan: { mode: 'rolling', sessions: [{ id: 'framsida', name: 'Framsida' }] },
    completedSessions: [{ date: '2025-09-01', sessionId: 'framsida' }],
  };
}

describe('load och save', () => {
  it('ger tomt utgångsläge när inget är sparat', () => {
    const result = load(new MemoryStorage());
    expect(result.status).toBe('empty');
    expect(result.data).toEqual(emptyData());
  });

  it('sparar och läser tillbaka exakt samma data', () => {
    const storage = new MemoryStorage();
    const data = sample();

    expect(save(storage, data)).toBe(true);
    expect(load(storage)).toEqual({ status: 'ok', data });
  });

  it('lägger allt under en enda nyckel', () => {
    const storage = new MemoryStorage();
    save(storage, sample());
    expect(storage.length).toBe(1);
    expect(storage.key(0)).toBe(STORAGE_KEY);
  });

  it('säger ifrån när lagringen vägrar spara', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    expect(save(storage, sample())).toBe(false);
  });

  it('fungerar när lagringen är helt avstängd', () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    expect(load(storage).status).toBe('empty');
  });
});

describe('data som inte går att läsa', () => {
  it('raderas aldrig, utan läggs i karantän', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, 'inte json alls');

    const result = load(storage);
    expect(result.status).toBe('unreadable');
    expect(storage.getItem(QUARANTINE_KEY)).toBe('inte json alls');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('gäller även data från en nyare version av appen', () => {
    const storage = new MemoryStorage();
    const fromFuture = JSON.stringify({ ...sample(), schemaVersion: SCHEMA_VERSION + 1 });
    storage.setItem(STORAGE_KEY, fromFuture);

    expect(load(storage).status).toBe('unreadable');
    expect(storage.getItem(QUARANTINE_KEY)).toBe(fromFuture);
  });

  it('gäller data med rätt version men trasigt innehåll', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, commitments: 5 }));
    expect(load(storage).status).toBe('unreadable');
  });

  it('överlever att appen sparar nytt efteråt', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{trasig');
    load(storage);
    save(storage, sample());

    expect(storage.getItem(QUARANTINE_KEY)).toBe('{trasig');
    expect(load(storage).status).toBe('ok');
  });
});

describe('export och import', () => {
  it('går runt utan att tappa något', () => {
    const data = sample();
    const result = importJson(exportJson(data));
    expect(result).toEqual({ ok: true, data });
  });

  it('skriver läsbar JSON, inte en enda rad', () => {
    expect(exportJson(sample())).toContain('\n');
  });

  it('avvisar något som inte är JSON', () => {
    expect(importJson('hej')).toEqual({ ok: false, reason: 'invalid-json' });
  });

  it('avvisar en fil från en nyare version', () => {
    const text = JSON.stringify({ ...sample(), schemaVersion: SCHEMA_VERSION + 1 });
    expect(importJson(text)).toEqual({ ok: false, reason: 'newer-version' });
  });

  it('avvisar en fil med rätt version men fel innehåll', () => {
    const text = JSON.stringify({ schemaVersion: SCHEMA_VERSION, commitments: [{ id: 5 }] });
    expect(importJson(text)).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('avvisar hellre hela filen än att importera halva', () => {
    const broken = sample();
    const text = JSON.stringify({
      ...broken,
      commitments: [broken.commitments[0], { id: 'trasig' }],
    });
    expect(importJson(text).ok).toBe(false);
  });
});
