import { clock, clockRange, duration } from '../design/time';
import { addDays, weekdayOf } from '../scheduling/date';
import type { IsoDate, NoSessionReason } from '../scheduling/types';

/**
 * Allt synligt språk på ett ställe.
 *
 * Ingen komponent innehåller en enda mening. Vill man lägga till engelska
 * skriver man en modul till som uppfyller `Strings` — inga komponenter behöver
 * röras.
 */

const weekdayNames = [
  'måndag',
  'tisdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lördag',
  'söndag',
] as const;

export const sv = {
  nextSession: {
    eyebrow: 'Nästa pass',
    endsAt: (end: number) => `Slutar ${clock(end)}`,
    complete: 'Klar med passet',
  },

  holdPoints: {
    meal: 'Ät',
    leaveHome: 'Gå hemifrån',
    pwoBefore: 'Ta PWO',
    pwoDuring: 'PWO under passet',
    homeAgain: 'Hemma igen',
  },

  today: {
    /** Etiketten framför dagens besked, oavsett vad beskedet är. */
    label: 'Idag',
    completed: 'Passet är avklarat. Snyggt.',
  },

  empty: {
    noPlan: {
      title: 'Du har inget upplägg än',
      body: 'Berätta vilka pass du kör, så räknar appen ut när de får plats i veckan.',
      action: 'Välj upplägg',
    },
    noSessionThisWeek: {
      title: 'Inget pass får plats den här veckan',
      body: 'Ändra ett åtagande, passlängden eller tiderna du vill träna mellan, så räknar appen om direkt.',
    },
  },

  /** "Idag", "Imorgon", annars veckodagen. */
  relativeDay(date: IsoDate, today: IsoDate): string {
    if (date === today) return 'Idag';
    if (date === addDays(today, 1)) return 'Imorgon';
    return weekdayNames[weekdayOf(date) - 1]!;
  },

  /**
   * Motorns strukturerade skäl blir en mening med riktiga siffror. Appen
   * flyttar aldrig ett pass tyst — det här är hur den säger ifrån.
   */
  reason(reason: NoSessionReason): string {
    switch (reason.kind) {
      case 'no-plan':
        return 'Du har inget upplägg än.';

      case 'no-session-for-weekday':
        return 'Inget pass ligger på den här dagen.';

      case 'gym-closed':
        return 'Gymmet är stängt.';

      case 'rest-day':
        return reason.because === 'rest-rule'
          ? 'Vilodag — du behöver minst en i veckan.'
          : 'Vilodag — annars blir det samma pass två dagar i rad.';

      case 'no-window':
        if (reason.bestGapLength === 0) {
          return `Dagen är helt upptagen. Du behöver ${duration(reason.needed)}.`;
        }
        return (
          `Största luckan är ${clockRange(reason.bestGapStart, reason.bestGapEnd)}, ` +
          `${duration(reason.bestGapLength)}. Du behöver ${duration(reason.needed)}.`
        );

      case 'too-late': {
        const start = clock(reason.earliestPossibleStart);
        const end = clock(reason.wouldEnd);
        const limit = clock(reason.limit);
        return reason.limitedBy === 'gym-closing'
          ? `Du kan tidigast börja ${start} och skulle sluta ${end}. Gymmet stänger ${limit}.`
          : `Du kan tidigast börja ${start} och skulle sluta ${end}. Du vill vara klar ${limit}.`;
      }
    }
  },
};

export type Strings = typeof sv;
