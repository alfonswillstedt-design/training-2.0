import { clock, clockRange, duration } from '../design/time';
import { addDays, dayOfMonth, weekdayOf } from '../scheduling/date';
import type { IsoDate, Minutes, NoSessionReason, Weekday } from '../scheduling/types';

/**
 * Allt synligt språk på ett ställe.
 *
 * Ingen komponent innehåller en enda mening. Vill man lägga till engelska
 * skriver man en modul till som uppfyller `Strings` — inga komponenter behöver
 * röras.
 */

/** "1 åtagande", "3 åtaganden". */
function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`;
}

const weekdayNames = [
  'måndag',
  'tisdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lördag',
  'söndag',
] as const;

const weekdayShort = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'] as const;

/** Två bokstäver räcker på en chip, en bokstav är tvetydig på svenska. */
const weekdayInitials = ['Må', 'Ti', 'On', 'To', 'Fr', 'Lö', 'Sö'] as const;

/** "mån–fre", "tis", "mån, ons, fre" — löpande dagar slås ihop. */
function formatWeekdays(weekdays: Weekday[]): string {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  if (sorted.length === 0) return 'inga fasta dagar';
  if (sorted.length === 7) return 'varje dag';

  const runs: Weekday[][] = [];
  for (const day of sorted) {
    const run = runs[runs.length - 1];
    if (run && day === run[run.length - 1]! + 1) run.push(day);
    else runs.push([day]);
  }

  return runs
    .map((run) =>
      run.length >= 3
        ? `${weekdayShort[run[0]! - 1]}–${weekdayShort[run[run.length - 1]! - 1]}`
        : run.map((day) => weekdayShort[day - 1]).join(', '),
    )
    .join(', ');
}

export const sv = {
  tabs: {
    next: 'Nästa pass',
    week: 'Veckan',
    commitments: 'Åtaganden',
    plan: 'Upplägg',
  },

  week: {
    title: 'Veckan',
    lead: 'Tryck på en dag för att ändra den. Plus lägger till något som bara händer den dagen.',
    /** Svarar på frågan en vilodag lämnar öppen: vart tog träningen vägen? */
    nextIs: (day: string, time: string) => `Nästa pass: ${day}, ${time}.`,
    trackLabel: (day: string) => `${day} — dagens tider`,
    /** Plusknappen på varje dagrad. Skärmläsaren ska höra vilken dag det gäller. */
    addOn: (day: string) => `Lägg till något på ${day}`,
    free: 'Hela dagen ledig.',
    commitmentsLabel: 'Den här dagen',
    noCommitments: 'Inget åtagande den här dagen.',
    add: 'Något annat',
    close: 'Klar',
    /** Snabbvägen för det som oftast händer: ett extrapass som inte står i schemat. */
    repeatLabel: (weekday: string) => `Händer också ${weekday}`,
    repeat: (label: string) => `${label} — en extra gång`,
    deviates: 'Ändrad',
  },

  dayEditor: {
    /** "Skola · onsdag" — vad du ändrar, och vilken dag. Aldrig bara ett klockslag. */
    title: (label: string, weekday: string) => `${label} · ${weekday}`,
    timeLabel: 'Tid den här dagen',
    onlyToday: (weekday: string) => `Gäller bara den här ${weekday}en. Resten av veckan står kvar.`,
    off: 'Händer inte den här dagen',
    offAgain: 'Händer ändå den här dagen',
    restore: (weekday: string) => `Återställ till vanliga ${weekday}en`,
    makeWeekly: (weekday: string) => `Gäller varje ${weekday} framöver`,
    /** Delningen sägs rakt ut innan den sker — en rad blir två. */
    splitHelp: (label: string, weekday: string, rest: string) =>
      `${label} delas i två: ${weekday} med den nya tiden, och ${rest} som förut.`,
    rewriteHelp: (label: string, weekday: string) =>
      `${label} ligger bara på ${weekday}, så tiden skrivs om. Ingen ny rad.`,
    offWeeklyHelp: (label: string, weekday: string) =>
      `${label} tas bort från ${weekday}. Övriga dagar står kvar.`,
    remove: (label: string) => `Ta bort ${label} helt`,
    removeHelp: 'Från alla dagar, alla veckor.',
    done: 'Klar',
  },

  nextSession: {
    eyebrow: 'Nästa pass',
    endsAt: (end: Minutes) => `Slutar ${clock(end)}`,
    complete: 'Klar med passet',
    /**
     * Namnger både dagen och passet. Ett klockslag ensamt räcker inte —
     * nästa pass ligger ofta på samma tid, och då går de inte att skilja åt.
     */
    missed: (name: string, start: Minutes) => `Tränade du ${name} ${clock(start)}?`,
    confirmMissed: 'Ja, jag tränade',
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

  storage: {
    unreadable:
      'Sparad data gick inte att läsa och har lagts åt sidan i stället för att raderas. Appen startade tom.',
    notSaving:
      'Det går inte att spara i den här webbläsaren, så ändringarna försvinner när du stänger appen. Exportera en fil om du vill behålla dem.',
  },

  backup: {
    title: 'Data',
    version: (byggd: string) => `Version ${byggd}`,
    lead: 'Allt ligger bara i den här webbläsaren. Exportera en fil om du vill kunna flytta datan eller få tillbaka den.',
    export: 'Exportera till fil',
    import: 'Läs in från fil',
    filename: (today: IsoDate) => `traningsschema-${today}.json`,
    confirmTitle: 'Ersätt allt du har nu?',
    confirmBody: (commitments: number, sessions: number) =>
      `Filen innehåller ${count(commitments, 'åtagande', 'åtaganden')} och ` +
      `${count(sessions, 'loggat pass', 'loggade pass')}. Det du har nu skrivs över.`,
    replace: 'Ersätt allt',
    cancel: 'Avbryt',
    reset: 'Börja om från början',
    resetTitle: 'Radera allt och börja om?',
    resetBody: (commitments: number, sessions: number) =>
      `${count(commitments, 'åtagande', 'åtaganden')}, ` +
      `${count(sessions, 'loggat pass', 'loggade pass')}, upplägget och inställningarna ` +
      'raderas. Appen startar om med de första frågorna. Exportera först om du vill kunna ' +
      'få tillbaka det här läget.',
    resetConfirm: 'Radera allt',
    resetFailed: 'Webbläsaren lät inte appen radera datan. Ingenting har ändrats.',
    failed: {
      'invalid-json': 'Filen är inte en giltig JSON-fil.',
      unreadable: 'Filen går inte att läsa som ett träningsschema. Ingenting har ändrats.',
      'newer-version': 'Filen kommer från en nyare version av appen. Uppdatera appen först.',
      'missing-migration':
        'Filen kommer från en version appen inte kan läsa. Ingenting har ändrats.',
    },
  },

  plan: {
    title: 'Upplägg',
    lead: 'Vilka pass du kör, och i vilken ordning.',
    modeLabel: 'Läge',
    rolling: 'Rullande',
    weekly: 'Veckobundet',
    rollingHelp: 'Passen roterar i ordning, oavsett veckodag.',
    weeklyHelp:
      'Bestämda pass på bestämda veckodagar. Du väljer vilket pass som hör till dagen — appen räknar fortfarande ut tiden själv, och säger ifrån om dagen saknar fönster.',
    sessionsLabel: 'Pass',
    addSession: 'Lägg till pass',
    sessionPlaceholder: 'Namn på passet',
    bindingsLabel: 'Vilket pass på vilken dag',
    unbound: 'Inget',
    starterLabel: 'Börja från ett färdigt upplägg',
    /** Etiketterna i väljaren. Passnamnen är utsäde och ligger i defaults. */
    starters: {
      helkropp: 'Helkropp',
      'push-pull': 'Push / pull',
      'over-under': 'Överkropp / underkropp',
      'framsida-baksida': 'Framsida / baksida',
      'push-pull-ben': 'Push / pull / ben',
      arnold: 'Arnold-split',
      fyrdelad: 'Fyrdelad',
      kroppsdelar: 'Kroppsdelsdelad',
    } as Record<string, string>,
    openSettings: 'Inställningar',
    moveUp: 'Flytta upp',
    moveDown: 'Flytta ner',
    removeSession: 'Ta bort passet',
    empty: {
      title: 'Vilka pass kör du?',
      body: 'Börja från ett färdigt upplägg och ändra fritt, eller skriv in ditt eget. Har du fått ett av en PT skriver du in det som det är.',
    },
  },

  settings: {
    title: 'Inställningar',
    done: 'Klar',
    sessionLength: 'Passets längd',
    travelTo: 'Restid till gymmet',
    travelFrom: 'Restid hem',
    travelMode: 'Färdsätt',
    travelModes: { walk: 'Gå', bike: 'Cykel', transit: 'Kollektivt', car: 'Bil' },
    windowLabel: 'När du vill träna',
    earliest: 'Tidigast',
    latest: 'Senast klar',
    gymLabel: 'Gymmets öppettider',
    /** Status, när dagen inte har några öppettider. */
    closed: 'Stängt',
    /** Vad knappen gör — inte vilket läge dagen är i. */
    markClosed: 'Stäng',
    markOpen: 'Öppna',
    mealLabel: 'Mat före passet',
    mealOn: 'Räkna med tid att äta',
    mealHelp: 'Gäller de åtaganden du markerat att du måste äta efter.',
    mealDuration: 'Tid att äta',
    pwoLabel: 'PWO',
    pwoModes: { off: 'Ingen', before: 'Före passet', during: 'Under passet' },
    pwoMargin: 'Minuter före passet',
    restLabel: 'Vilodagar',
    minRestDays: 'Minst antal vilodagar i veckan',
    noSameSessionBackToBack: 'Aldrig samma pass två dagar i rad',
    minutes: (amount: number) => `${amount} min`,
    days: (amount: number) => count(amount, 'dag', 'dagar'),
  },

  onboarding: {
    next: 'Nästa',
    start: 'Sätt igång',
    ownPlan: 'Skriv in eget upplägg',
    pickReady: 'Välj ett färdigt i stället',
    questions: {
      plan: 'Vilket upplägg kör du?',
      length: 'Hur långt är ett pass?',
      travel: 'Hur tar du dig till gymmet?',
      window: 'När på dygnet vill du träna?',
    },
    help: {
      travel: 'Restiden räknas åt båda hållen när appen letar efter en lucka.',
      window: 'Appen lägger passet så tidigt den kan inom det här spannet.',
    },
  },

  timeField: {
    from: 'Från',
    to: 'Till',
    hour: 'timme',
    minute: 'minut',
  },

  commitments: {
    title: 'Åtaganden',
    lead: 'Det som tar upp tid varje vecka. Enstaka dagar ändrar du i Veckan.',
    recurring: 'Återkommande',
    add: 'Lägg till åtagande',
    mealAfterBadge: 'Mat efter',
    empty: {
      title: 'Vad tar upp din tid?',
      body: 'Lägg in skola, jobb, pendling, hämtningar — det som ligger fast. Appen räknar ut när träningen får plats däremellan.',
      action: 'Lägg till åtagande',
    },
  },

  commitmentEditor: {
    newTitle: 'Nytt åtagande',
    /** Samma ruta, men det man lägger in är en händelse och inget åtagande. */
    newOnceTitle: 'Ny händelse',
    oncePlaceholder: 'Plugga, tandläkare, middag …',
    createOnce: 'Lägg till',
    editTitle: 'Ändra åtagande',
    done: 'Klar',
    cancel: 'Avbryt',
    remove: 'Ta bort åtagande',
    nameLabel: 'Namn',
    namePlaceholder: 'Skola, jobb, hämta Elsa …',
    whenLabel: 'När',
    repeats: 'Varje vecka',
    once: 'En gång',
    daysLabel: 'Dagar',
    dateLabel: 'Vilken dag',
    onceHelp: 'Händer bara den här gången och lägger sig inte i veckorna framåt.',
    timeLabel: 'Tid',
    mealLabel: 'Jag måste hinna äta efter det här innan jag kan träna',
    mealHelp: 'Gäller typiskt efter ett arbetspass. Från skolan går de flesta direkt till gymmet.',
    create: 'Lägg till åtagande',
    endBeforeStart: 'Sluttiden måste vara efter starttiden.',
  },



  weekdays: {
    long: weekdayNames,
    short: weekdayShort,
    initials: weekdayInitials,
    format: formatWeekdays,
  },

  /** "Måndag 8" — veckodag och datum, som i en kalender. */
  dayLabel(date: IsoDate): string {
    const name = weekdayNames[weekdayOf(date) - 1]!;
    return `${name[0]!.toUpperCase()}${name.slice(1)} ${dayOfMonth(date)}`;
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
