/**
 * Kärntyperna för schemaläggningsmotorn.
 *
 * Modulen har noll beroenden — inte React, inget datumbibliotek, ingenting.
 * All tid räknas i minuter från midnatt, aldrig i Date-objekt, så att
 * sommartid och tidszoner inte kan förstöra en uträkning.
 */

/** Minuter från midnatt, lokal väggklocka. 0 = 00:00, 1440 = 24:00. */
export type Minutes = number;

/** ISO-8601-veckodag: 1 = måndag ... 7 = söndag. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Datum som 'ÅÅÅÅ-MM-DD'. Motorn hanterar aldrig ett Date-objekt internt. */
export type IsoDate = string;

// ---------------------------------------------------------------------------
// Åtaganden — det som tar upp tid
// ---------------------------------------------------------------------------

/**
 * Ett undantag för ett enskilt datum. Överskrider den återkommande regeln
 * utan att ändra den.
 *
 * - `off`   — "Ledig fredag". Den återkommande förekomsten uteblir.
 * - `moved` — samma åtagande, annan tid just den dagen.
 * - `extra` — "Jobbar onsdag 16–18". En förekomst utöver den återkommande
 *             regeln, som ärver åtagandets `needsMealAfter`.
 */
export type CommitmentException =
  | { date: IsoDate; kind: 'off' }
  | { date: IsoDate; kind: 'moved'; start: Minutes; end: Minutes }
  | { date: IsoDate; kind: 'extra'; start: Minutes; end: Minutes };

export interface Commitment {
  id: string;
  /** Vad användaren kallar det: "Skola", "Jobb", "Hämta Elsa". */
  label: string;
  /** Den återkommande regeln. Tom lista = åtagandet finns bara som undantag. */
  weekdays: Weekday[];
  start: Minutes;
  end: Minutes;
  /**
   * Sant när användaren måste hinna äta efter det här åtagandet innan hen kan
   * träna — typiskt ett arbetspass. Falskt när hen kan gå direkt till gymmet —
   * typiskt skola.
   *
   * Det här är skillnaden mellan motorns två uträkningar: krävd lucka efter
   * åtagandet är antingen mattid + restid, eller bara restid. Det är alltså
   * inte en flagga på en gemensam uträkning, utan det som väljer uträkning.
   */
  needsMealAfter: boolean;
  exceptions: CommitmentException[];
}

// ---------------------------------------------------------------------------
// Upplägg — vilka pass som finns och i vilken ordning
// ---------------------------------------------------------------------------

export interface TrainingSession {
  id: string;
  /** Användarens eget namn på passet: "Framsida", "Push", "Ben". */
  name: string;
}

export interface WeekdayBinding {
  weekday: Weekday;
  sessionId: string;
}

/**
 * `rolling`  — passen roterar i ordning oavsett veckodag.
 * `weekly`   — bestämda pass på bestämda veckodagar. Bindningen säger vilket
 *              pass som hör till dagen, aldrig om användaren hinner träna den
 *              dagen. Tiden räknar motorn ut ändå.
 */
export type TrainingPlan =
  | { mode: 'rolling'; sessions: TrainingSession[] }
  | { mode: 'weekly'; sessions: TrainingSession[]; bindings: WeekdayBinding[] };

/**
 * Rotationsläget härleds alltid ur loggade pass — se `deriveRotationState`.
 * Räkna aldrig rotationen separat vid sidan av `CompletedSession`.
 */
export interface CompletedSession {
  date: IsoDate;
  sessionId: string;
}

export interface RotationState {
  lastCompletedSessionId: string | null;
}

// ---------------------------------------------------------------------------
// Inställningar
// ---------------------------------------------------------------------------

export type TravelMode = 'walk' | 'bike' | 'transit' | 'car';

/**
 * Hur användaren tar sin PWO — ett val, inte ett antagande.
 *
 * - `off`    — ingen PWO. Ingen hållpunkt visas, ingen tid krävs.
 * - `before` — tas `margin` minuter före passet. Tiden måste vara ledig, så
 *              ett tajt fönster kan falla på just PWO-tiden.
 * - `during` — dricks under passet. Hållpunkten är passets start och den
 *              kräver ingen extra tid.
 */
export type PwoMode = 'off' | 'before' | 'during';

export interface OpeningHours {
  open: Minutes;
  close: Minutes;
}

export interface Preferences {
  sessionLength: Minutes;
  travelToGym: Minutes;
  travelFromGym: Minutes;
  travelMode: TravelMode;
  /** Per veckodag. `null` = gymmet är stängt den dagen. */
  gymHours: Record<Weekday, OpeningHours | null>;
  /** Tidigast användaren vill börja träna. */
  earliestStart: Minutes;
  /** Senast användaren vill vara klar med passet. */
  latestEnd: Minutes;
  meal: {
    /** Av/på för mattider som helhet. Av = `needsMealAfter` ignoreras. */
    enabled: boolean;
    duration: Minutes;
  };
  pwo: {
    mode: PwoMode;
    /** Minuter före passet, används bara i läge `before`. */
    margin: Minutes;
  };
  rest: {
    /** Minst så här många dagar i veckan utan pass. */
    minRestDays: number;
    /** Hindra samma pass två kalenderdagar i rad. */
    noSameSessionBackToBack: boolean;
  };
}

// ---------------------------------------------------------------------------
// Resultat
// ---------------------------------------------------------------------------

/** Ett upptaget block på en enskild dag, efter att undantag lösts upp. */
export interface BusyBlock {
  commitmentId: string;
  label: string;
  start: Minutes;
  end: Minutes;
  needsMealAfter: boolean;
}

export interface PlannedSession {
  sessionId: string;
  sessionName: string;
  start: Minutes;
  end: Minutes;
  /** När användaren måste gå hemifrån. */
  leaveHome: Minutes;
  /** När hen är tillbaka igen. */
  homeAgain: Minutes;
  /** När hen ska äta, om mattid krävs den här dagen. */
  meal: { start: Minutes; end: Minutes } | null;
  /** När hen tar PWO. Passets start i läge `during`, null i läge `off`. */
  pwo: Minutes | null;
  /**
   * Hur många minuter senare passet hade kunnat läggas och ändå fungera.
   * 0 betyder att dagen precis gick ihop. Används för att välja vilodag.
   */
  slack: Minutes;
}

/**
 * Varför en dag saknar pass — i strukturerad form, med riktiga siffror, så att
 * UI:t kan formulera om det till en mening. Ett pass flyttas aldrig tyst och
 * kortas aldrig; går det inte ihop säger motorn varför.
 */
export type NoSessionReason =
  /** Upplägget har inga pass alls ännu. */
  | { kind: 'no-plan' }
  /** Veckobundet läge, men inget pass är bundet till den här veckodagen. */
  | { kind: 'no-session-for-weekday' }
  /** Gymmet har stängt hela dagen. */
  | { kind: 'gym-closed' }
  /** Dagen lämnades medvetet fri. */
  | { kind: 'rest-day'; because: 'rest-rule' | 'no-same-session-back-to-back' }
  /**
   * Ingen ledig lucka är lång nog. `needed` är hela kedjan: eventuell mattid,
   * restid dit, passet, och restid hem.
   */
  | {
      kind: 'no-window';
      needed: Minutes;
      bestGapStart: Minutes;
      bestGapEnd: Minutes;
      bestGapLength: Minutes;
    }
  /**
   * Det finns gott om ledig tid, men den ligger för sent: passet skulle sluta
   * efter att gymmet stänger, eller efter senaste tid användaren vill träna.
   */
  | {
      kind: 'too-late';
      earliestPossibleStart: Minutes;
      wouldEnd: Minutes;
      limit: Minutes;
      limitedBy: 'gym-closing' | 'latest-end';
    };

export interface PlannedDay {
  date: IsoDate;
  weekday: Weekday;
  /** Dagens åtaganden efter att undantag lösts upp, sorterade på starttid. */
  commitments: BusyBlock[];
  session: PlannedSession | null;
  /** Alltid satt när `session` är null, alltid null när passet finns. */
  reason: NoSessionReason | null;
}

export interface PlanWeekInput {
  commitments: Commitment[];
  preferences: Preferences;
  plan: TrainingPlan;
  rotationState: RotationState;
  /** Veckans första dag. Tolkas som lokal väggklocka, aldrig som UTC. */
  weekStarting: Date;
}
