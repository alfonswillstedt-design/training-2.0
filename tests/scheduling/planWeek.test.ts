import { describe, expect, it } from 'vitest';
import { planWeek } from '../../src/scheduling/planWeek';
import { hhmm, toHhmm } from '../../src/scheduling/time';
import type {
  Commitment,
  CompletedSession,
  PlannedDay,
  Preferences,
  TrainingPlan,
} from '../../src/scheduling/types';
import { MONDAY, basePreferences, frontBackPlan, gymAllWeek, school, work } from './fixtures';

/**
 * Målgruppen tränar inte 06:00 före skolan. Med tidigast 09:00 handlar
 * testerna om de intressanta fallen i stället för om morgonpass.
 */
function prefs(overrides: Partial<Preferences> = {}): Preferences {
  return basePreferences({ earliestStart: hhmm('09:00'), ...overrides });
}

function plan(
  commitments: Commitment[],
  preferences: Preferences,
  trainingPlan: TrainingPlan = frontBackPlan,
  completedSessions: CompletedSession[] = [],
): PlannedDay[] {
  return planWeek({
    commitments,
    preferences,
    plan: trainingPlan,
    completedSessions,
    weekStarting: MONDAY,
  });
}

/** Kompakt sammanfattning: passets namn och starttid, eller varför det saknas. */
function summary(days: PlannedDay[]): string[] {
  return days.map((d) =>
    d.session ? `${d.session.sessionName} ${toHhmm(d.session.start)}` : `— ${d.reason?.kind}`,
  );
}

describe('en vecka helt utan åtaganden', () => {
  const days = plan([], prefs());

  it('ger sju dagar med rätt datum', () => {
    expect(days.map((d) => d.date)).toEqual([
      '2025-09-01',
      '2025-09-02',
      '2025-09-03',
      '2025-09-04',
      '2025-09-05',
      '2025-09-06',
      '2025-09-07',
    ]);
  });

  it('fyller varje dag utom den vilodag regeln kräver', () => {
    expect(summary(days)).toEqual([
      'Framsida 09:00',
      'Baksida 09:00',
      'Framsida 09:00',
      'Baksida 09:00',
      'Framsida 09:00',
      'Baksida 09:00',
      '— rest-day',
    ]);
  });

  it('lägger vilodagen sist när alla dagar är lika bra', () => {
    expect(days[6]?.reason).toEqual({ kind: 'rest-day', because: 'rest-rule' });
  });
});

describe('en vanlig skolvecka med ett jobbpass', () => {
  const days = plan([school, work], prefs({ rest: { minRestDays: 0, noSameSessionBackToBack: false } }));

  it('lägger måndagens pass direkt efter skolan, utan mattid', () => {
    const monday = days[0]!;
    expect(toHhmm(monday.session!.start)).toBe('15:50');
    expect(toHhmm(monday.session!.leaveHome)).toBe('15:30');
    expect(monday.session!.meal).toBeNull();
  });

  it('skjuter tisdagens pass för att hinna äta efter jobbet', () => {
    const tuesday = days[1]!;
    expect(toHhmm(tuesday.session!.start)).toBe('17:05');
    expect(toHhmm(tuesday.session!.meal!.start)).toBe('16:00');
    expect(toHhmm(tuesday.session!.meal!.end)).toBe('16:45');
  });

  it('lägger helgens pass vid tidigaste önskade tid', () => {
    expect(toHhmm(days[5]!.session!.start)).toBe('09:00');
    expect(toHhmm(days[6]!.session!.start)).toBe('09:00');
  });

  it('visar dagens åtaganden på varje dag', () => {
    expect(days[1]!.commitments.map((c) => c.label)).toEqual(['Jobb', 'Skola']);
    expect(days[5]!.commitments).toEqual([]);
  });

  it('kortar aldrig ett pass', () => {
    for (const day of days) {
      if (day.session) expect(day.session.end - day.session.start).toBe(90);
    }
  });
});

describe('vilodagsregeln', () => {
  it('offrar den dag där passet fick minst marginal', () => {
    const days = plan([school, work], prefs());
    // Tisdagen är trängst — jobbet till 16:00 plus mattid ger minst luft.
    expect(days[1]!.session).toBeNull();
    expect(days[1]!.reason).toEqual({ kind: 'rest-day', because: 'rest-rule' });
    expect(days.filter((d) => d.session).length).toBe(6);
  });

  it('tar bort ytterligare en dag när två vilodagar krävs', () => {
    const days = plan(
      [school, work],
      prefs({ rest: { minRestDays: 2, noSameSessionBackToBack: false } }),
    );
    expect(summary(days)).toEqual([
      'Framsida 15:50',
      '— rest-day',
      'Baksida 15:50',
      'Framsida 15:50',
      '— rest-day',
      'Baksida 09:00',
      'Framsida 09:00',
    ]);
  });

  it('tvingar ingen vilodag när dagarna redan räcker till', () => {
    // Bara tre dagar har fönster, så regeln behöver inte offra något.
    const heltUpptagen: Commitment = {
      id: 'skift',
      label: 'Skift',
      weekdays: [1, 2, 4, 5],
      start: 0,
      end: 1440,
      needsMealAfter: true,
      exceptions: [],
    };
    const days = plan([heltUpptagen], prefs());
    expect(days.filter((d) => d.session).length).toBe(3);
    expect(days[0]!.reason?.kind).toBe('no-window');
  });
});

describe('dagar som inte går ihop förklaras med riktiga siffror', () => {
  it('säger vilken lucka som var störst och hur mycket som behövdes', () => {
    const kvallsjobb: Commitment = {
      id: 'kvallsjobb',
      label: 'Kvällsjobb',
      weekdays: [3],
      start: hhmm('16:00'),
      end: hhmm('23:00'),
      needsMealAfter: true,
      exceptions: [],
    };
    const days = plan([school, kvallsjobb], prefs());
    expect(days[2]!.session).toBeNull();
    expect(days[2]!.reason).toEqual({
      kind: 'no-window',
      needed: 130,
      bestGapStart: hhmm('15:30'),
      bestGapEnd: hhmm('16:00'),
      bestGapLength: 30,
    });
  });

  it('säger rakt ut när gymmet stänger innan passet hinner sluta', () => {
    const gymHours = gymAllWeek('06:00', '22:00');
    gymHours[4] = { open: hhmm('06:00'), close: hhmm('17:00') };
    const days = plan([school], prefs({ gymHours }));
    expect(days[3]!.reason).toEqual({
      kind: 'too-late',
      earliestPossibleStart: hhmm('15:50'),
      wouldEnd: hhmm('17:20'),
      limit: hhmm('17:00'),
      limitedBy: 'gym-closing',
    });
  });

  it('säger när gymmet är stängt hela dagen', () => {
    const gymHours = gymAllWeek('06:00', '22:00');
    gymHours[7] = null;
    expect(plan([], prefs({ gymHours }))[6]!.reason).toEqual({ kind: 'gym-closed' });
  });

  it('säger att upplägget är tomt i stället för att gissa ett pass', () => {
    const days = plan([], prefs(), { mode: 'rolling', sessions: [] });
    expect(days.every((d) => d.session === null)).toBe(true);
    expect(days[0]!.reason).toEqual({ kind: 'no-plan' });
  });
});

describe('undantag för enskilda veckor', () => {
  it('"Ledig fredag" öppnar hela dagen utan att ändra den återkommande regeln', () => {
    const ledigFredag: Commitment = {
      ...school,
      exceptions: [{ date: '2025-09-05', kind: 'off' }],
    };
    const days = plan([ledigFredag], prefs({ rest: { minRestDays: 0, noSameSessionBackToBack: false } }));
    expect(toHhmm(days[4]!.session!.start)).toBe('09:00');
    expect(toHhmm(days[0]!.session!.start)).toBe('15:50'); // måndagen är oförändrad
  });

  it('"Jobbar onsdag 16–18" skjuter onsdagens pass och lägger till mattid', () => {
    const extraPass: Commitment = {
      ...work,
      exceptions: [{ date: '2025-09-03', kind: 'extra', start: hhmm('16:00'), end: hhmm('18:00') }],
    };
    const days = plan(
      [school, extraPass],
      prefs({ rest: { minRestDays: 0, noSameSessionBackToBack: false } }),
    );
    const wednesday = days[2]!;
    expect(toHhmm(wednesday.session!.start)).toBe('19:05');
    expect(toHhmm(wednesday.session!.meal!.start)).toBe('18:00');
  });
});

describe('veckobundet upplägg', () => {
  const weeklyPlan: TrainingPlan = {
    mode: 'weekly',
    sessions: [
      { id: 'ben', name: 'Ben' },
      { id: 'push', name: 'Push' },
    ],
    bindings: [
      { weekday: 1, sessionId: 'ben' },
      { weekday: 3, sessionId: 'push' },
    ],
  };

  it('lägger passen på sina veckodagar och räknar ut tiden själv', () => {
    const days = plan([school], prefs(), weeklyPlan);
    expect(summary(days)).toEqual([
      'Ben 15:50',
      '— no-session-for-weekday',
      'Push 15:50',
      '— no-session-for-weekday',
      '— no-session-for-weekday',
      '— no-session-for-weekday',
      '— no-session-for-weekday',
    ]);
  });

  it('säger ifrån när den bundna dagen saknar fönster i stället för att flytta passet', () => {
    const gymHours = gymAllWeek('06:00', '22:00');
    gymHours[1] = { open: hhmm('06:00'), close: hhmm('17:00') };
    const days = plan([school], prefs({ gymHours }), weeklyPlan);
    expect(days[0]!.session).toBeNull();
    expect(days[0]!.reason?.kind).toBe('too-late');
    // Passet dyker inte upp på någon annan dag.
    expect(days.filter((d) => d.session?.sessionId === 'ben')).toHaveLength(0);
  });
});

describe('rotationen', () => {
  it('fortsätter från det senast loggade passet', () => {
    // Söndagen före veckan, alltså 2025-08-31.
    const days = plan([], prefs(), frontBackPlan, [
      { date: '2025-08-31', sessionId: 'framsida' },
    ]);
    expect(days[0]!.session!.sessionName).toBe('Baksida');
    expect(days[1]!.session!.sessionName).toBe('Framsida');
  });

  it('stegar bara på dagar som faktiskt får ett pass', () => {
    const days = plan([school, work], prefs());
    // Tisdagen blir vilodag, så onsdagen tar nästa pass i rotationen.
    expect(summary(days)).toEqual([
      'Framsida 15:50',
      '— rest-day',
      'Baksida 15:50',
      'Framsida 15:50',
      'Baksida 15:50',
      'Framsida 09:00',
      'Baksida 09:00',
    ]);
  });

  it('kan hålla samma pass borta från två dagar i rad', () => {
    const helkropp: TrainingPlan = { mode: 'rolling', sessions: [{ id: 'helkropp', name: 'Helkropp' }] };
    const days = plan(
      [],
      prefs({ rest: { minRestDays: 0, noSameSessionBackToBack: true } }),
      helkropp,
    );
    expect(summary(days)).toEqual([
      'Helkropp 09:00',
      '— rest-day',
      'Helkropp 09:00',
      '— rest-day',
      'Helkropp 09:00',
      '— rest-day',
      'Helkropp 09:00',
    ]);
    expect(days[1]!.reason).toEqual({
      kind: 'rest-day',
      because: 'no-same-session-back-to-back',
    });
  });
});

describe('motorn är deterministisk', () => {
  it('ger identiskt resultat för identisk indata', () => {
    expect(plan([school, work], prefs())).toEqual(plan([school, work], prefs()));
  });

  it('påverkas inte av ordningen på åtagandena', () => {
    expect(plan([work, school], prefs())).toEqual(plan([school, work], prefs()));
  });

  it('ger samma resultat över en sommartidsövergång', () => {
    // Veckan då klockan ställs fram i Sverige (söndag 30 mars 2025).
    const dstWeek = planWeek({
      commitments: [school],
      preferences: prefs(),
      plan: frontBackPlan,
      completedSessions: [],
      weekStarting: new Date(2025, 2, 24),
    });
    expect(dstWeek.map((d) => d.date)).toEqual([
      '2025-03-24',
      '2025-03-25',
      '2025-03-26',
      '2025-03-27',
      '2025-03-28',
      '2025-03-29',
      '2025-03-30',
    ]);
    expect(toHhmm(dstWeek[0]!.session!.start)).toBe('15:50');
    expect(toHhmm(dstWeek[6]!.session!.start)).toBe('09:00');
  });
});

describe('loggade pass', () => {
  const monday: CompletedSession = { date: '2025-09-01', sessionId: 'framsida' };

  it('ändrar inte dagen som loggades', () => {
    const before = plan([school], prefs());
    const after = plan([school], prefs(), frontBackPlan, [monday]);

    expect(after[0]!.session!.sessionName).toBe(before[0]!.session!.sessionName);
    expect(after[0]!.session!.sessionName).toBe('Framsida');
  });

  it('för rotationen framåt för dagarna efter', () => {
    const days = plan([school], prefs(), frontBackPlan, [monday]);
    expect(days[1]!.session!.sessionName).toBe('Baksida');
  });

  it('kastar inte om resten av veckan när en dag loggas', () => {
    const before = summary(plan([school], prefs()));
    const after = summary(plan([school], prefs(), frontBackPlan, [monday]));
    expect(after).toEqual(before);
  });

  it('behåller det loggade passet även om upplägget roterat vidare', () => {
    // Loggat "Baksida" på en dag där rotationen annars gett "Framsida".
    const days = plan([school], prefs(), frontBackPlan, [
      { date: '2025-09-01', sessionId: 'baksida' },
    ]);
    expect(days[0]!.session!.sessionName).toBe('Baksida');
    expect(days[1]!.session!.sessionName).toBe('Framsida');
  });

  it('gör aldrig en genomförd dag till vilodag i efterhand', () => {
    // Utan loggning offras söndagen som vilodag.
    const untouched = plan([], prefs());
    expect(untouched[6]!.reason?.kind).toBe('rest-day');

    const days = plan([], prefs(), frontBackPlan, [{ date: '2025-09-07', sessionId: 'framsida' }]);
    expect(days[6]!.session).not.toBeNull();
    expect(days.filter((day) => day.reason?.kind === 'rest-day')).toHaveLength(1);
  });

  it('låter inte regeln om samma pass två dagar i rad ogöra ett loggat pass', () => {
    const days = plan(
      [],
      prefs({ rest: { minRestDays: 0, noSameSessionBackToBack: true } }),
      { mode: 'rolling', sessions: [{ id: 'helkropp', name: 'Helkropp' }] },
      [{ date: '2025-09-02', sessionId: 'helkropp' }],
    );
    expect(days[1]!.session!.sessionId).toBe('helkropp');
  });

  it('bortser från loggade pass som inte längre finns i upplägget', () => {
    const days = plan([school], prefs(), frontBackPlan, [
      { date: '2025-09-01', sessionId: 'borttaget' },
    ]);
    expect(summary(days)).toEqual(summary(plan([school], prefs())));
  });

  it('påverkas inte av pass loggade efter veckan', () => {
    const days = plan([school], prefs(), frontBackPlan, [
      { date: '2025-09-20', sessionId: 'baksida' },
    ]);
    expect(summary(days)).toEqual(summary(plan([school], prefs())));
  });

  it('är fortfarande deterministisk', () => {
    expect(plan([school], prefs(), frontBackPlan, [monday])).toEqual(
      plan([school], prefs(), frontBackPlan, [monday]),
    );
  });
});
