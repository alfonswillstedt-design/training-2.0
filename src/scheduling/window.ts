import type { FreeGap } from './commitments';
import type { Minutes, NoSessionReason, PlannedSession, Preferences, Weekday } from './types';

/** Ett placerat pass, innan det vet vilket pass det är. */
export type Placement = Omit<PlannedSession, 'sessionId' | 'sessionName'>;

export type WindowResult =
  | { ok: true; placement: Placement }
  | { ok: false; reason: NoSessionReason };

/** En utvärderad lucka — bevaras även när den misslyckas, för att kunna förklara varför. */
interface Attempt {
  gap: FreeGap;
  mealDuration: Minutes;
  /** Tidigast passet kan börja i den här luckan. */
  earliest: Minutes;
  /** Senast passet kan börja och ändå hinna klart. */
  latestStart: Minutes;
  /** Senast passet får sluta, och vad som satte den gränsen. */
  capEnd: Minutes;
  cappedBy: 'gap' | 'gym-closing' | 'latest-end';
  /** Hela kedjan luckan måste rymma: mat, restid dit, passet, restid hem. */
  needed: Minutes;
}

/**
 * Hittar dagens träningsfönster, eller förklarar varför det inte finns något.
 *
 * Passet läggs så tidigt som allt tillåter. Det kortas aldrig och flyttas
 * aldrig till en tid som inte fungerar — går det inte ihop säger motorn det.
 */
export function findWindow(gaps: FreeGap[], prefs: Preferences, weekday: Weekday): WindowResult {
  const hours = prefs.gymHours[weekday];
  if (!hours) return { ok: false, reason: { kind: 'gym-closed' } };

  // PWO kräver bara egen tid när den tas före passet.
  const pwoLead = prefs.pwo.mode === 'before' ? prefs.pwo.margin : 0;
  let closest: Attempt | null = null;

  for (const gap of gaps) {
    // Här skiljer sig uträkningarna åt: efter ett arbetspass ska man hinna
    // äta och resa, direkt från skolan räcker restiden.
    const mealDuration = prefs.meal.enabled && gap.prevNeedsMealAfter ? prefs.meal.duration : 0;
    const prep = Math.max(mealDuration + prefs.travelToGym, pwoLead);

    const earliest = Math.max(gap.start + prep, hours.open, prefs.earliestStart);

    // Passet måste sluta i tid för att man ska hinna hem innan nästa åtagande,
    // innan gymmet stänger, och innan man vill vara klar för dagen.
    const homeCap = gap.end - prefs.travelFromGym;
    const capEnd = Math.min(homeCap, hours.close, prefs.latestEnd);
    const cappedBy: Attempt['cappedBy'] =
      capEnd === hours.close ? 'gym-closing' : capEnd === prefs.latestEnd ? 'latest-end' : 'gap';

    const attempt: Attempt = {
      gap,
      mealDuration,
      earliest,
      latestStart: capEnd - prefs.sessionLength,
      capEnd,
      cappedBy,
      needed: prep + prefs.sessionLength + prefs.travelFromGym,
    };

    // Luckorna kommer i tidsordning, så den första som fungerar ger också den
    // tidigaste möjliga starten på hela dagen.
    if (attempt.earliest <= attempt.latestStart) {
      return { ok: true, placement: place(attempt, prefs) };
    }

    if (closest === null || shortfall(attempt) > shortfall(closest)) {
      closest = attempt;
    }
  }

  return { ok: false, reason: explain(closest, prefs) };
}

/** Hur nära luckan var att fungera. Alltid negativt för en lucka som föll. */
function shortfall(attempt: Attempt): Minutes {
  return attempt.latestStart - attempt.earliest;
}

function place(attempt: Attempt, prefs: Preferences): Placement {
  const start = attempt.earliest;
  const end = start + prefs.sessionLength;
  const leaveHome = start - prefs.travelToGym;

  return {
    start,
    end,
    leaveHome,
    homeAgain: end + prefs.travelFromGym,
    meal: attempt.mealDuration > 0 ? { start: leaveHome - attempt.mealDuration, end: leaveHome } : null,
    pwo:
      prefs.pwo.mode === 'off'
        ? null
        : prefs.pwo.mode === 'during'
          ? start
          : start - prefs.pwo.margin,
    slack: attempt.latestStart - start,
  };
}

/** Formulerar varför dagen inte gick ihop, med luckan som var närmast att fungera. */
function explain(closest: Attempt | null, prefs: Preferences): NoSessionReason {
  if (closest === null) {
    // Dygnet är helt upptaget — det finns ingen lucka att ens mäta.
    return {
      kind: 'no-window',
      needed: prefs.travelToGym + prefs.sessionLength + prefs.travelFromGym,
      bestGapStart: 0,
      bestGapEnd: 0,
      bestGapLength: 0,
    };
  }

  if (closest.cappedBy !== 'gap') {
    // Det finns gott om tid, den ligger bara för sent på dygnet.
    return {
      kind: 'too-late',
      earliestPossibleStart: closest.earliest,
      wouldEnd: closest.earliest + prefs.sessionLength,
      limit: closest.capEnd,
      limitedBy: closest.cappedBy,
    };
  }

  return {
    kind: 'no-window',
    needed: closest.needed,
    bestGapStart: closest.gap.start,
    bestGapEnd: closest.gap.end,
    bestGapLength: closest.gap.end - closest.gap.start,
  };
}
