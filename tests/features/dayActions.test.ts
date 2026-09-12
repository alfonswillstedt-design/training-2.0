import { describe, expect, it } from 'vitest';
import {
  clearDay,
  newOneOff,
  deviatingDates,
  exceptionOn,
  makeWeeklyFromDay,
  repeatOnDate,
  setDayOff,
  setDayTimes,
} from '../../src/features/commitments/commitmentActions';
import { hhmm } from '../../src/scheduling/time';
import type { Commitment } from '../../src/scheduling/types';

/** Skola måndag–fredag, 08:15–15:30. Onsdagen i veckan är den 9:e. */
function skola(exceptions: Commitment['exceptions'] = []): Commitment {
  return {
    id: 'skola',
    label: 'Skola',
    weekdays: [1, 2, 3, 4, 5],
    start: hhmm('08:15'),
    end: hhmm('15:30'),
    needsMealAfter: false,
    exceptions,
  };
}

const ONSDAG = '2026-09-09';
const TORSDAG = '2026-09-10';
const VECKAN = [
  '2026-09-07',
  '2026-09-08',
  ONSDAG,
  TORSDAG,
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
] as const;

describe('setDayTimes', () => {
  it('ändrar bara den dagen och lämnar regeln orörd', () => {
    const next = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));

    const kvar = next[0]!;
    expect(kvar.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(kvar.start).toBe(hhmm('08:15'));
    expect(kvar.end).toBe(hhmm('15:30'));
    expect(kvar.exceptions).toEqual([
      { date: ONSDAG, kind: 'moved', start: hhmm('08:15'), end: hhmm('12:00') },
    ]);
  });

  it('skriver om dagens undantag i stället för att lägga ett till', () => {
    const first = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));
    const second = setDayTimes(first, 'skola', ONSDAG, hhmm('09:00'), hhmm('13:00'));

    expect(second[0]!.exceptions).toEqual([
      { date: ONSDAG, kind: 'moved', start: hhmm('09:00'), end: hhmm('13:00') },
    ]);
  });

  it('rör inte andra dagars undantag', () => {
    const med = skola([{ date: TORSDAG, kind: 'off' }]);
    const next = setDayTimes([med], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));

    expect(next[0]!.exceptions).toContainEqual({ date: TORSDAG, kind: 'off' });
    expect(next[0]!.exceptions).toHaveLength(2);
  });

  it('flyttar en engångshändelse genom att skriva om dess egna tider', () => {
    const plugg: Commitment = {
      id: 'plugg',
      label: 'Plugga',
      weekdays: [],
      start: hhmm('19:00'),
      end: hhmm('20:00'),
      needsMealAfter: false,
      exceptions: [{ date: ONSDAG, kind: 'extra', start: hhmm('19:00'), end: hhmm('20:00') }],
    };

    const next = setDayTimes([plugg], 'plugg', ONSDAG, hhmm('18:00'), hhmm('19:30'));

    expect(next[0]!.exceptions).toEqual([
      { date: ONSDAG, kind: 'extra', start: hhmm('18:00'), end: hhmm('19:30') },
    ]);
  });
});

describe('setDayOff', () => {
  it('ställer in dagen utan att röra regeln', () => {
    const next = setDayOff([skola()], 'skola', ONSDAG);

    expect(next[0]!.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(next[0]!.exceptions).toEqual([{ date: ONSDAG, kind: 'off' }]);
  });

  it('ersätter en ändrad tid samma dag', () => {
    const flyttad = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));

    expect(setDayOff(flyttad, 'skola', ONSDAG)[0]!.exceptions).toEqual([
      { date: ONSDAG, kind: 'off' },
    ]);
  });

  it('tar bort en engångshändelse helt i stället för att ställa in den', () => {
    const plugg: Commitment = {
      id: 'plugg',
      label: 'Plugga',
      weekdays: [],
      start: hhmm('19:00'),
      end: hhmm('20:00'),
      needsMealAfter: false,
      exceptions: [{ date: ONSDAG, kind: 'extra', start: hhmm('19:00'), end: hhmm('20:00') }],
    };

    expect(setDayOff([plugg], 'plugg', ONSDAG)).toEqual([]);
  });
});

describe('clearDay', () => {
  it('återställer dagen till den vanliga regeln', () => {
    const flyttad = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));

    expect(clearDay(flyttad, 'skola', ONSDAG)[0]!.exceptions).toEqual([]);
  });

  it('lämnar andra dagar ifred', () => {
    const bada = setDayOff(
      setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00')),
      'skola',
      TORSDAG,
    );

    expect(clearDay(bada, 'skola', ONSDAG)[0]!.exceptions).toEqual([{ date: TORSDAG, kind: 'off' }]);
  });
});

describe('makeWeeklyFromDay', () => {
  it('delar åtagandet så att onsdagen blir sin egen rad', () => {
    const flyttad = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));
    const next = makeWeeklyFromDay(flyttad, 'skola', ONSDAG);

    expect(next).toHaveLength(2);
    const [original, delad] = next as [Commitment, Commitment];

    expect(original.weekdays).toEqual([1, 2, 4, 5]);
    expect(original.end).toBe(hhmm('15:30'));
    expect(original.exceptions).toEqual([]);

    expect(delad.label).toBe('Skola');
    expect(delad.weekdays).toEqual([3]);
    expect(delad.start).toBe(hhmm('08:15'));
    expect(delad.end).toBe(hhmm('12:00'));
    expect(delad.exceptions).toEqual([]);
    expect(delad.id).not.toBe(original.id);
  });

  it('ärver mattiden, eftersom det är samma sak som händer', () => {
    const jobb: Commitment = {
      id: 'jobb',
      label: 'Jobb',
      weekdays: [3, 4],
      start: hhmm('16:00'),
      end: hhmm('20:00'),
      needsMealAfter: true,
      exceptions: [],
    };
    const flyttat = setDayTimes([jobb], 'jobb', ONSDAG, hhmm('15:00'), hhmm('19:00'));

    expect(makeWeeklyFromDay(flyttat, 'jobb', ONSDAG)[1]!.needsMealAfter).toBe(true);
  });

  it('skriver om regeln i stället för att dela när dagen är den enda som finns', () => {
    const jobb: Commitment = {
      id: 'jobb',
      label: 'Jobb',
      weekdays: [3],
      start: hhmm('16:00'),
      end: hhmm('20:00'),
      needsMealAfter: true,
      exceptions: [],
    };
    const flyttat = setDayTimes([jobb], 'jobb', ONSDAG, hhmm('15:00'), hhmm('19:00'));
    const next = makeWeeklyFromDay(flyttat, 'jobb', ONSDAG);

    expect(next).toHaveLength(1);
    expect(next[0]!.id).toBe('jobb');
    expect(next[0]!.weekdays).toEqual([3]);
    expect(next[0]!.start).toBe(hhmm('15:00'));
    expect(next[0]!.exceptions).toEqual([]);
  });

  it('gör en inställd dag till att åtagandet inte längre finns den dagen', () => {
    const instald = setDayOff([skola()], 'skola', ONSDAG);
    const next = makeWeeklyFromDay(instald, 'skola', ONSDAG);

    expect(next).toHaveLength(1);
    expect(next[0]!.weekdays).toEqual([1, 2, 4, 5]);
    expect(next[0]!.exceptions).toEqual([]);
  });

  it('gör en engångshändelse återkommande på sin veckodag', () => {
    const plugg: Commitment = {
      id: 'plugg',
      label: 'Plugga',
      weekdays: [],
      start: hhmm('19:00'),
      end: hhmm('20:00'),
      needsMealAfter: false,
      exceptions: [{ date: ONSDAG, kind: 'extra', start: hhmm('19:00'), end: hhmm('20:00') }],
    };
    const next = makeWeeklyFromDay([plugg], 'plugg', ONSDAG);

    expect(next).toHaveLength(1);
    expect(next[0]!.weekdays).toEqual([3]);
    expect(next[0]!.start).toBe(hhmm('19:00'));
    expect(next[0]!.end).toBe(hhmm('20:00'));
    expect(next[0]!.exceptions).toEqual([]);
  });

  it('gör ingenting när dagen inte avviker', () => {
    const list = [skola()];
    expect(makeWeeklyFromDay(list, 'skola', ONSDAG)).toEqual(list);
  });
});

describe('repeatOnDate', () => {
  it('lägger jobbet en extra dag utan att röra de vanliga dagarna', () => {
    const jobb: Commitment = {
      id: 'jobb',
      label: 'Jobb',
      weekdays: [4],
      start: hhmm('16:00'),
      end: hhmm('20:00'),
      needsMealAfter: true,
      exceptions: [],
    };

    const next = repeatOnDate([jobb], 'jobb', ONSDAG);

    expect(next[0]!.weekdays).toEqual([4]);
    expect(next[0]!.exceptions).toEqual([
      { date: ONSDAG, kind: 'extra', start: hhmm('16:00'), end: hhmm('20:00') },
    ]);
  });

  it('lägger inte ett extrapass på en dag åtagandet redan finns', () => {
    const list = [skola()];
    expect(repeatOnDate(list, 'skola', ONSDAG)).toEqual(list);
  });
});

describe('exceptionOn och deviatingDates', () => {
  it('hittar dagens undantag', () => {
    const flyttad = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));

    expect(exceptionOn(flyttad[0]!, ONSDAG)?.kind).toBe('moved');
    expect(exceptionOn(flyttad[0]!, TORSDAG)).toBeNull();
  });

  it('pekar ut veckans dagar som inte följer det vanliga', () => {
    const flyttad = setDayTimes([skola()], 'skola', ONSDAG, hhmm('08:15'), hhmm('12:00'));

    expect(deviatingDates(flyttad, [...VECKAN])).toEqual(new Set([ONSDAG]));
  });

  it('räknar inte en ren engångshändelse som en avvikelse', () => {
    // Den har inget vanligt att avvika från — den är hela sitt eget innehåll.
    const plugg: Commitment = {
      id: 'plugg',
      label: 'Plugga',
      weekdays: [],
      start: hhmm('19:00'),
      end: hhmm('20:00'),
      needsMealAfter: false,
      exceptions: [{ date: ONSDAG, kind: 'extra', start: hhmm('19:00'), end: hhmm('20:00') }],
    };

    expect(deviatingDates([plugg], [...VECKAN])).toEqual(new Set());
  });

  it('räknar ett extrapass på ett återkommande åtagande som en avvikelse', () => {
    const jobb: Commitment = {
      id: 'jobb',
      label: 'Jobb',
      weekdays: [4],
      start: hhmm('16:00'),
      end: hhmm('20:00'),
      needsMealAfter: true,
      exceptions: [],
    };

    expect(deviatingDates(repeatOnDate([jobb], 'jobb', ONSDAG), [...VECKAN])).toEqual(
      new Set([ONSDAG]),
    );
  });
});

describe('newOneOff', () => {
  it('ligger på dagen man tryckte plus på, utan fasta veckodagar', () => {
    const händelse = newOneOff(ONSDAG);

    expect(händelse.weekdays).toEqual([]);
    expect(händelse.exceptions).toEqual([
      { date: ONSDAG, kind: 'extra', start: händelse.start, end: händelse.end },
    ]);
  });

  it('börjar på kvällen, för det är dit man lägger något tillfälligt', () => {
    const händelse = newOneOff(ONSDAG);

    expect(händelse.start).toBe(hhmm('18:00'));
    expect(händelse.end).toBe(hhmm('19:00'));
  });

  it('har inget namn — det är det enda man måste skriva', () => {
    expect(newOneOff(ONSDAG).label).toBe('');
  });

  it('ger varje händelse ett eget id', () => {
    expect(newOneOff(ONSDAG).id).not.toBe(newOneOff(ONSDAG).id);
  });
});
