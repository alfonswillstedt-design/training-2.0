import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../../src/scheduling/defaults';
import { emptyData, parseAppData, SCHEMA_VERSION } from '../../src/storage/schema';

function withCommitment(overrides: Record<string, unknown>) {
  return parseAppData({
    ...emptyData(),
    commitments: [
      {
        id: 'skola',
        label: 'Skola',
        weekdays: [1, 2],
        start: 495,
        end: 930,
        needsMealAfter: false,
        exceptions: [],
        ...overrides,
      },
    ],
  });
}

describe('parseAppData', () => {
  it('godtar ett tomt utgångsläge', () => {
    expect(parseAppData(emptyData())).toEqual(emptyData());
  });

  it('avvisar det som inte är ett objekt med schemaVersion', () => {
    expect(parseAppData(null)).toBeNull();
    expect(parseAppData([])).toBeNull();
    expect(parseAppData({})).toBeNull();
  });

  it('kastar fält den inte känner igen', () => {
    const parsed = parseAppData({ ...emptyData(), skräp: 'ska bort' });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('skräp');
  });
});

describe('åtaganden i sparad data', () => {
  it('sorterar och avdubblerar veckodagar', () => {
    const parsed = withCommitment({ weekdays: [5, 1, 1, 3] });
    expect(parsed!.commitments[0]!.weekdays).toEqual([1, 3, 5]);
  });

  it('avvisar veckodagar utanför 1–7', () => {
    expect(withCommitment({ weekdays: [0] })).toBeNull();
    expect(withCommitment({ weekdays: [8] })).toBeNull();
    expect(withCommitment({ weekdays: ['måndag'] })).toBeNull();
  });

  it('avvisar tider utanför dygnet', () => {
    expect(withCommitment({ start: -1 })).toBeNull();
    expect(withCommitment({ end: 1441 })).toBeNull();
    expect(withCommitment({ start: 8.5 })).toBeNull();
  });

  it('avvisar ett saknat eller fel skrivet mat-fält', () => {
    expect(withCommitment({ needsMealAfter: 'ja' })).toBeNull();
    expect(withCommitment({ needsMealAfter: undefined })).toBeNull();
  });

  it('godtar undantagens tre former', () => {
    const parsed = withCommitment({
      exceptions: [
        { date: '2025-09-05', kind: 'off' },
        { date: '2025-09-03', kind: 'moved', start: 960, end: 1080 },
        { date: '2025-09-04', kind: 'extra', start: 960, end: 1080 },
      ],
    });
    expect(parsed!.commitments[0]!.exceptions).toHaveLength(3);
  });

  it('avvisar undantag med fel datumformat eller okänd sort', () => {
    expect(withCommitment({ exceptions: [{ date: '5 sep', kind: 'off' }] })).toBeNull();
    expect(withCommitment({ exceptions: [{ date: '2025-09-05', kind: 'kanske' }] })).toBeNull();
    expect(withCommitment({ exceptions: [{ date: '2025-09-05', kind: 'moved' }] })).toBeNull();
  });
});

describe('inställningar i sparad data', () => {
  function withPreferences(overrides: Record<string, unknown>) {
    return parseAppData({
      ...emptyData(),
      preferences: { ...defaultPreferences(), ...overrides },
    });
  }

  it('avvisar ett okänt färdsätt eller PWO-läge', () => {
    expect(withPreferences({ travelMode: 'helikopter' })).toBeNull();
    expect(withPreferences({ pwo: { mode: 'efter', margin: 20 } })).toBeNull();
  });

  it('avvisar negativa längder', () => {
    expect(withPreferences({ sessionLength: -60 })).toBeNull();
    expect(withPreferences({ travelToGym: -1 })).toBeNull();
  });

  it('godtar att gymmet är stängt en dag', () => {
    const parsed = withPreferences({
      gymHours: { ...defaultPreferences().gymHours, 7: null },
    });
    expect(parsed!.preferences.gymHours[7]).toBeNull();
  });

  it('avvisar öppettider som saknar en av tiderna', () => {
    expect(
      withPreferences({ gymHours: { ...defaultPreferences().gymHours, 1: { open: 360 } } }),
    ).toBeNull();
  });

  it('avvisar en dag som saknas helt i öppettiderna', () => {
    const { 4: _borttagen, ...utan } = defaultPreferences().gymHours;
    expect(withPreferences({ gymHours: utan })).toBeNull();
  });
});

describe('loggade pass i sparad data', () => {
  it('avvisar poster utan giltigt datum eller pass', () => {
    const bad = (completedSessions: unknown[]) =>
      parseAppData({ ...emptyData(), schemaVersion: SCHEMA_VERSION, completedSessions });

    expect(bad([{ date: '2025-09-01' }])).toBeNull();
    expect(bad([{ sessionId: 'framsida' }])).toBeNull();
    expect(bad([{ date: 'igår', sessionId: 'framsida' }])).toBeNull();
  });
});
