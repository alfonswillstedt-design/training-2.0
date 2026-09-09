import { describe, expect, it } from 'vitest';
import { freeGaps, mergeBusy, resolveDay } from '../../src/scheduling/commitments';
import { hhmm } from '../../src/scheduling/time';
import type { Commitment } from '../../src/scheduling/types';
import { school, work } from './fixtures';

const MONDAY = '2025-09-01';
const TUESDAY = '2025-09-02';
const WEDNESDAY = '2025-09-03';
const FRIDAY = '2025-09-05';
const SATURDAY = '2025-09-06';

describe('resolveDay', () => {
  it('tar med återkommande åtaganden på rätt veckodagar', () => {
    expect(resolveDay([school, work], MONDAY).map((b) => b.label)).toEqual(['Skola']);
    expect(resolveDay([school, work], TUESDAY).map((b) => b.label)).toEqual(['Jobb', 'Skola']);
    expect(resolveDay([school, work], SATURDAY)).toEqual([]);
  });

  it('sorterar dagens block på starttid', () => {
    const blocks = resolveDay([school, work], TUESDAY);
    expect(blocks.map((b) => b.start)).toEqual([hhmm('08:00'), hhmm('08:15')]);
  });

  it('bär med sig needsMealAfter per block', () => {
    const [jobb, skola] = resolveDay([school, work], TUESDAY);
    expect(jobb?.needsMealAfter).toBe(true);
    expect(skola?.needsMealAfter).toBe(false);
  });

  it('"Ledig fredag" tar bort den återkommande förekomsten utan att röra regeln', () => {
    const ledigFredag: Commitment = {
      ...school,
      exceptions: [{ date: FRIDAY, kind: 'off' }],
    };
    expect(resolveDay([ledigFredag], FRIDAY)).toEqual([]);
    // Regeln gäller fortfarande alla andra dagar.
    expect(resolveDay([ledigFredag], MONDAY)).toHaveLength(1);
  });

  it('"Jobbar onsdag 16–18" läggs till som extra och ärver mattidsflaggan', () => {
    const extraPass: Commitment = {
      ...work,
      exceptions: [{ date: WEDNESDAY, kind: 'extra', start: hhmm('16:00'), end: hhmm('18:00') }],
    };
    const blocks = resolveDay([extraPass], WEDNESDAY);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.start).toBe(hhmm('16:00'));
    expect(blocks[0]?.end).toBe(hhmm('18:00'));
    expect(blocks[0]?.needsMealAfter).toBe(true);
  });

  it('"moved" ersätter tiden just den dagen', () => {
    const kortDag: Commitment = {
      ...school,
      exceptions: [{ date: MONDAY, kind: 'moved', start: hhmm('08:15'), end: hhmm('12:00') }],
    };
    const blocks = resolveDay([kortDag], MONDAY);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.end).toBe(hhmm('12:00'));
  });

  it('ett åtagande utan veckodagar finns bara på sina undantagsdatum', () => {
    const enstaka: Commitment = {
      id: 'flytt',
      label: 'Hjälpa till med flytt',
      weekdays: [],
      start: hhmm('09:00'),
      end: hhmm('17:00'),
      needsMealAfter: true,
      exceptions: [{ date: SATURDAY, kind: 'extra', start: hhmm('09:00'), end: hhmm('17:00') }],
    };
    expect(resolveDay([enstaka], SATURDAY)).toHaveLength(1);
    expect(resolveDay([enstaka], MONDAY)).toEqual([]);
  });
});

describe('mergeBusy', () => {
  it('slår ihop överlappande block och behåller mattidsflaggan från det som slutar sist', () => {
    const merged = mergeBusy(resolveDay([school, work], TUESDAY));
    // Jobb 08:00–16:00 och skola 08:15–15:30 blir ett block som slutar 16:00,
    // och det är jobbet man kommer ifrån — alltså mattid.
    expect(merged).toEqual([{ start: hhmm('08:00'), end: hhmm('16:00'), needsMealAfter: true }]);
  });

  it('slår ihop block som ligger kant i kant', () => {
    const merged = mergeBusy([
      { commitmentId: 'a', label: 'A', start: 540, end: 600, needsMealAfter: false },
      { commitmentId: 'b', label: 'B', start: 600, end: 660, needsMealAfter: true },
    ]);
    expect(merged).toEqual([{ start: 540, end: 660, needsMealAfter: true }]);
  });

  it('kräver mattid om något av flera block som slutar samtidigt kräver det', () => {
    const merged = mergeBusy([
      { commitmentId: 'a', label: 'A', start: 540, end: 660, needsMealAfter: false },
      { commitmentId: 'b', label: 'B', start: 600, end: 660, needsMealAfter: true },
    ]);
    expect(merged[0]?.needsMealAfter).toBe(true);
  });

  it('håller isär block med luft emellan', () => {
    const merged = mergeBusy([
      { commitmentId: 'a', label: 'A', start: 540, end: 600, needsMealAfter: false },
      { commitmentId: 'b', label: 'B', start: 660, end: 720, needsMealAfter: false },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('freeGaps', () => {
  it('ger hela dygnet när dagen är tom', () => {
    expect(freeGaps([])).toEqual([{ start: 0, end: 1440, prevNeedsMealAfter: false }]);
  });

  it('luckan före dagens första åtagande kräver ingen mattid', () => {
    const gaps = freeGaps(mergeBusy(resolveDay([work], TUESDAY)));
    expect(gaps[0]).toEqual({ start: 0, end: hhmm('08:00'), prevNeedsMealAfter: false });
  });

  it('luckan efter ett arbetspass ärver kravet på mattid', () => {
    const gaps = freeGaps(mergeBusy(resolveDay([work], TUESDAY)));
    expect(gaps[1]).toEqual({ start: hhmm('16:00'), end: 1440, prevNeedsMealAfter: true });
  });

  it('luckan efter skolan kräver ingen mattid', () => {
    const gaps = freeGaps(mergeBusy(resolveDay([school], MONDAY)));
    expect(gaps[1]).toEqual({ start: hhmm('15:30'), end: 1440, prevNeedsMealAfter: false });
  });

  it('ger inga luckor när dygnet är helt upptaget', () => {
    expect(freeGaps([{ start: 0, end: 1440, needsMealAfter: false }])).toEqual([]);
  });
});
