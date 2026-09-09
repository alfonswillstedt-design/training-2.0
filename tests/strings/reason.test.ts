import { describe, expect, it } from 'vitest';
import { hhmm } from '../../src/scheduling/time';
import { strings } from '../../src/strings';

/**
 * Motorn levererar siffror, språkmodulen levererar meningen. Går ett pass inte
 * att placera ska användaren få veta exakt varför — inte ett tomt hål.
 */
describe('skäl blir en mening med riktiga siffror', () => {
  it('säger hur stor den största luckan är och hur mycket som behövs', () => {
    expect(
      strings.reason({
        kind: 'no-window',
        needed: 130,
        bestGapStart: hhmm('15:30'),
        bestGapEnd: hhmm('16:00'),
        bestGapLength: 30,
      }),
    ).toBe('Största luckan är 15:30–16:00, 30 min. Du behöver 2 h 10 min.');
  });

  it('säger rakt ut när dagen är helt upptagen', () => {
    expect(
      strings.reason({
        kind: 'no-window',
        needed: 130,
        bestGapStart: 0,
        bestGapEnd: 0,
        bestGapLength: 0,
      }),
    ).toBe('Dagen är helt upptagen. Du behöver 2 h 10 min.');
  });

  it('namnger gymmets stängning som gränsen', () => {
    expect(
      strings.reason({
        kind: 'too-late',
        earliestPossibleStart: hhmm('15:50'),
        wouldEnd: hhmm('17:20'),
        limit: hhmm('17:00'),
        limitedBy: 'gym-closing',
      }),
    ).toBe('Du kan tidigast börja 15:50 och skulle sluta 17:20. Gymmet stänger 17:00.');
  });

  it('namnger användarens egen sluttid som gränsen', () => {
    expect(
      strings.reason({
        kind: 'too-late',
        earliestPossibleStart: hhmm('19:05'),
        wouldEnd: hhmm('20:35'),
        limit: hhmm('20:00'),
        limitedBy: 'latest-end',
      }),
    ).toBe('Du kan tidigast börja 19:05 och skulle sluta 20:35. Du vill vara klar 20:00.');
  });

  it('skiljer på de två sorternas vilodag', () => {
    expect(strings.reason({ kind: 'rest-day', because: 'rest-rule' })).toBe(
      'Vilodag — du behöver minst en i veckan.',
    );
    expect(strings.reason({ kind: 'rest-day', because: 'no-same-session-back-to-back' })).toBe(
      'Vilodag — annars blir det samma pass två dagar i rad.',
    );
  });

  it('täcker de enkla skälen', () => {
    expect(strings.reason({ kind: 'gym-closed' })).toBe('Gymmet är stängt.');
    expect(strings.reason({ kind: 'no-plan' })).toBe('Du har inget upplägg än.');
    expect(strings.reason({ kind: 'no-session-for-weekday' })).toBe(
      'Inget pass ligger på den här dagen.',
    );
  });
});

describe('relativa dagnamn', () => {
  it('säger Idag och Imorgon', () => {
    expect(strings.relativeDay('2025-09-01', '2025-09-01')).toBe('Idag');
    expect(strings.relativeDay('2025-09-02', '2025-09-01')).toBe('Imorgon');
  });

  it('säger veckodagen längre fram', () => {
    expect(strings.relativeDay('2025-09-04', '2025-09-01')).toBe('torsdag');
    expect(strings.relativeDay('2025-09-07', '2025-09-01')).toBe('söndag');
  });

  it('klarar månadsskifte', () => {
    expect(strings.relativeDay('2025-10-01', '2025-09-30')).toBe('Imorgon');
  });
});

describe('veckodagar i text', () => {
  const format = strings.weekdays.format;

  it('slår ihop tre eller fler dagar i följd till ett spann', () => {
    expect(format([1, 2, 3, 4, 5])).toBe('mån–fre');
    expect(format([3, 4, 5])).toBe('ons–fre');
  });

  it('räknar upp två dagar i följd i stället för att spänna över dem', () => {
    expect(format([6, 7])).toBe('lör, sön');
  });

  it('räknar upp dagar som inte hänger ihop', () => {
    expect(format([1, 3, 5])).toBe('mån, ons, fre');
  });

  it('blandar spann och lösa dagar', () => {
    expect(format([1, 2, 3, 7])).toBe('mån–ons, sön');
  });

  it('sorterar och tar bort dubbletter', () => {
    expect(format([5, 1, 1, 3])).toBe('mån, ons, fre');
  });

  it('har egna ord för ytterlägena', () => {
    expect(format([1, 2, 3, 4, 5, 6, 7])).toBe('varje dag');
    expect(format([])).toBe('inga fasta dagar');
  });
});
