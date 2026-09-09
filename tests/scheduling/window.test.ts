import { describe, expect, it } from 'vitest';
import type { FreeGap } from '../../src/scheduling/commitments';
import { hhmm, toHhmm } from '../../src/scheduling/time';
import { findWindow } from '../../src/scheduling/window';
import { basePreferences, gymAllWeek } from './fixtures';

const MONDAY = 1;

/** Hela dygnet ledigt. */
const emptyDay: FreeGap[] = [{ start: 0, end: 1440, prevNeedsMealAfter: false }];

/** Kvällen efter skolan — man går direkt till gymmet, ingen mattid behövs. */
const afterSchool: FreeGap[] = [{ start: hhmm('15:30'), end: 1440, prevNeedsMealAfter: false }];

/** Kvällen efter ett arbetspass — man måste hinna äta först. */
const afterWork: FreeGap[] = [{ start: hhmm('16:00'), end: 1440, prevNeedsMealAfter: true }];

function ok(result: ReturnType<typeof findWindow>) {
  if (!result.ok) throw new Error(`Förväntade ett pass, fick: ${JSON.stringify(result.reason)}`);
  return result.placement;
}

function failed(result: ReturnType<typeof findWindow>) {
  if (result.ok) throw new Error(`Förväntade inget pass, fick: ${JSON.stringify(result.placement)}`);
  return result.reason;
}

describe('efter skolan räcker restiden', () => {
  const p = ok(findWindow(afterSchool, basePreferences(), MONDAY));

  it('lägger passet så tidigt som restiden tillåter', () => {
    // Skolan slutar 15:30, 20 min till gymmet.
    expect(toHhmm(p.start)).toBe('15:50');
    expect(toHhmm(p.end)).toBe('17:20');
  });

  it('räknar ut när man går hemifrån och när man är hemma igen', () => {
    expect(toHhmm(p.leaveHome)).toBe('15:30');
    expect(toHhmm(p.homeAgain)).toBe('17:40');
  });

  it('lägger ingen mattid, för man kommer inte från ett arbetspass', () => {
    expect(p.meal).toBeNull();
  });
});

describe('efter ett arbetspass behövs mattid plus restid', () => {
  const p = ok(findWindow(afterWork, basePreferences(), MONDAY));

  it('skjuter passet med både mattid och restid', () => {
    // Jobbet slutar 16:00, 45 min mat, 20 min restid.
    expect(toHhmm(p.start)).toBe('17:05');
    expect(toHhmm(p.end)).toBe('18:35');
  });

  it('lägger maten direkt efter jobbet, före hemgång', () => {
    expect(p.meal).not.toBeNull();
    expect(toHhmm(p.meal!.start)).toBe('16:00');
    expect(toHhmm(p.meal!.end)).toBe('16:45');
    expect(toHhmm(p.leaveHome)).toBe('16:45');
  });

  it('hoppar över mattiden när mattider är avstängda som helhet', () => {
    const q = ok(findWindow(afterWork, basePreferences({ meal: { enabled: false, duration: 45 } }), MONDAY));
    expect(toHhmm(q.start)).toBe('16:20');
    expect(q.meal).toBeNull();
  });
});

describe('en dag utan åtaganden', () => {
  it('lägger passet vid tidigaste tid användaren vill träna', () => {
    const p = ok(findWindow(emptyDay, basePreferences(), MONDAY));
    expect(toHhmm(p.start)).toBe('06:00');
    expect(toHhmm(p.leaveHome)).toBe('05:40');
  });

  it('respekterar en senare tidigast-önskad tid', () => {
    const p = ok(findWindow(emptyDay, basePreferences({ earliestStart: hhmm('16:00') }), MONDAY));
    expect(toHhmm(p.start)).toBe('16:00');
  });

  it('börjar aldrig innan gymmet öppnar', () => {
    const prefs = basePreferences({
      earliestStart: hhmm('05:00'),
      gymHours: gymAllWeek('09:00', '22:00'),
    });
    expect(toHhmm(ok(findWindow(emptyDay, prefs, MONDAY)).start)).toBe('09:00');
  });
});

describe('flera luckor på samma dag', () => {
  it('väljer den tidigaste luckan som faktiskt fungerar', () => {
    // Morgonen är ledig och gymmet är öppet — då tränar man på morgonen.
    const gaps: FreeGap[] = [
      { start: 0, end: hhmm('08:00'), prevNeedsMealAfter: false },
      { start: hhmm('16:00'), end: 1440, prevNeedsMealAfter: true },
    ];
    expect(toHhmm(ok(findWindow(gaps, basePreferences(), MONDAY)).start)).toBe('06:00');
  });

  it('hoppar över en lucka som är för kort och tar nästa', () => {
    const gaps: FreeGap[] = [
      { start: hhmm('06:00'), end: hhmm('07:00'), prevNeedsMealAfter: false },
      { start: hhmm('15:30'), end: 1440, prevNeedsMealAfter: false },
    ];
    expect(toHhmm(ok(findWindow(gaps, basePreferences(), MONDAY)).start)).toBe('15:50');
  });
});

describe('restiden hem måste rymmas före nästa åtagande', () => {
  it('godtar en lucka där man är hemma på minuten', () => {
    // 15:30–17:40. Passet 15:50–17:20 plus 20 min hem = exakt 17:40.
    const gaps: FreeGap[] = [{ start: hhmm('15:30'), end: hhmm('17:40'), prevNeedsMealAfter: false }];
    const p = ok(findWindow(gaps, basePreferences(), MONDAY));
    expect(toHhmm(p.homeAgain)).toBe('17:40');
    expect(p.slack).toBe(0);
  });

  it('avvisar en lucka där man inte hinner hem', () => {
    const gaps: FreeGap[] = [{ start: hhmm('15:30'), end: hhmm('17:30'), prevNeedsMealAfter: false }];
    const reason = failed(findWindow(gaps, basePreferences(), MONDAY));
    expect(reason).toEqual({
      kind: 'no-window',
      needed: 130, // 20 dit + 90 pass + 20 hem
      bestGapStart: hhmm('15:30'),
      bestGapEnd: hhmm('17:30'),
      bestGapLength: 120,
    });
  });
});

describe('dagar som inte går ihop', () => {
  it('säger ifrån när dygnet är helt upptaget', () => {
    const reason = failed(findWindow([], basePreferences(), MONDAY));
    expect(reason).toMatchObject({ kind: 'no-window', bestGapLength: 0 });
  });

  it('säger ifrån när gymmet stänger innan passet hinner sluta', () => {
    const prefs = basePreferences({ gymHours: gymAllWeek('06:00', '18:00') });
    const reason = failed(findWindow(afterWork, prefs, MONDAY));
    expect(reason).toEqual({
      kind: 'too-late',
      earliestPossibleStart: hhmm('17:05'),
      wouldEnd: hhmm('18:35'),
      limit: hhmm('18:00'),
      limitedBy: 'gym-closing',
    });
  });

  it('säger ifrån när passet skulle sluta efter senaste tid man vill träna', () => {
    const prefs = basePreferences({ latestEnd: hhmm('18:00') });
    const reason = failed(findWindow(afterWork, prefs, MONDAY));
    expect(reason).toEqual({
      kind: 'too-late',
      earliestPossibleStart: hhmm('17:05'),
      wouldEnd: hhmm('18:35'),
      limit: hhmm('18:00'),
      limitedBy: 'latest-end',
    });
  });

  it('säger ifrån när gymmet är stängt hela dagen', () => {
    const prefs = basePreferences();
    prefs.gymHours[MONDAY] = null;
    expect(failed(findWindow(emptyDay, prefs, MONDAY))).toEqual({ kind: 'gym-closed' });
  });

  it('rapporterar den lucka som var närmast att fungera', () => {
    const gaps: FreeGap[] = [
      { start: hhmm('06:00'), end: hhmm('07:00'), prevNeedsMealAfter: false }, // 60 min, långt ifrån
      { start: hhmm('15:30'), end: hhmm('17:30'), prevNeedsMealAfter: false }, // 120 min, nära
    ];
    expect(failed(findWindow(gaps, basePreferences(), MONDAY))).toMatchObject({
      kind: 'no-window',
      bestGapStart: hhmm('15:30'),
    });
  });
});

describe('PWO är ett val, inte ett antagande', () => {
  it('läge "off" ger ingen hållpunkt och kräver ingen tid', () => {
    const p = ok(findWindow(afterSchool, basePreferences(), MONDAY));
    expect(p.pwo).toBeNull();
    expect(toHhmm(p.start)).toBe('15:50');
  });

  it('läge "during" lägger hållpunkten på passets start utan att kräva tid', () => {
    const prefs = basePreferences({ pwo: { mode: 'during', margin: 60 } });
    const p = ok(findWindow(afterSchool, prefs, MONDAY));
    expect(toHhmm(p.start)).toBe('15:50');
    expect(p.pwo).toBe(p.start);
  });

  it('läge "before" kräver egen ledig tid före passet', () => {
    const prefs = basePreferences({ pwo: { mode: 'before', margin: 60 } });
    const p = ok(findWindow(afterSchool, prefs, MONDAY));
    // 60 min PWO-marginal är längre än 20 min restid, så passet skjuts fram.
    expect(toHhmm(p.start)).toBe('16:30');
    expect(toHhmm(p.pwo!)).toBe('15:30');
  });

  it('läge "before" med kort marginal ryms inom restiden', () => {
    const prefs = basePreferences({ pwo: { mode: 'before', margin: 10 } });
    const p = ok(findWindow(afterSchool, prefs, MONDAY));
    expect(toHhmm(p.start)).toBe('15:50');
    expect(toHhmm(p.pwo!)).toBe('15:40');
  });
});
