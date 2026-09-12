import { weekdayOf } from '../../scheduling/date';
import { hhmm } from '../../scheduling/time';
import type {
  Commitment,
  CommitmentException,
  IsoDate,
  Minutes,
  Weekday,
} from '../../scheduling/types';

/**
 * Rena tillståndsövergångar för åtaganden.
 *
 * Ingen av funktionerna muterar sin indata och ingen av dem känner till React.
 * Vyn gör inga listoperationer själv — den anropar de här, och allt räknas om
 * direkt. Det finns ingen spara-knapp någonstans.
 */

let counter = 0;

/** Id behöver bara vara unikt i användarens egen data. */
function nextId(): string {
  counter += 1;
  return `c${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Ett nytt, tomt åtagande. Namnet fylls i av användaren. */
export function newCommitment(): Commitment {
  return {
    id: nextId(),
    label: '',
    weekdays: [],
    start: hhmm('08:00'),
    end: hhmm('16:00'),
    needsMealAfter: false,
    exceptions: [],
  };
}

/**
 * En tillfällig händelse på en bestämd dag — det plus-knappen i veckan skapar.
 *
 * Kvällen som förval: det man lägger in i efterhand är plugg, träffar och
 * ärenden efter dagen, inte något som krockar med skolan. Ett åtagandes förval
 * (08:00–16:00) beskriver en arbetsdag och vore fel gissning här.
 */
export function newOneOff(date: IsoDate): Commitment {
  const start = hhmm('18:00');
  const end = hhmm('19:00');
  return {
    ...newCommitment(),
    weekdays: [],
    start,
    end,
    exceptions: [{ date, kind: 'extra', start, end }],
  };
}

export function addCommitment(list: Commitment[], commitment: Commitment): Commitment[] {
  return [...list, commitment];
}

export function updateCommitment(
  list: Commitment[],
  id: string,
  patch: Partial<Omit<Commitment, 'id'>>,
): Commitment[] {
  return list.map((commitment) =>
    commitment.id === id ? { ...commitment, ...patch } : commitment,
  );
}

export function removeCommitment(list: Commitment[], id: string): Commitment[] {
  return list.filter((commitment) => commitment.id !== id);
}

export function toggleWeekday(weekdays: Weekday[], weekday: Weekday): Weekday[] {
  return weekdays.includes(weekday)
    ? weekdays.filter((day) => day !== weekday)
    : [...weekdays, weekday].sort((a, b) => a - b);
}

/**
 * Åtagandena som faktiskt återkommer.
 *
 * Ett åtagande utan fasta veckodagar är inte återkommande — det finns bara som
 * undantag för enskilda datum, vilket är formen en markering i veckovyn tar.
 * Att lista det under "Återkommande" påstår något som inte är sant, och gör
 * att samma sak dyker upp två gånger på samma skärm.
 */
export function recurringCommitments(list: Commitment[]): Commitment[] {
  return list.filter((commitment) => commitment.weekdays.length > 0);
}

/**
 * Ett åtagande duger när det har ett namn och tar upp tid någonstans — antingen
 * på fasta veckodagar eller vid ett enskilt datum. En engångshändelse har inga
 * fasta dagar, bara ett datum, och är lika giltig för det.
 */
export function isUsable(commitment: Commitment): boolean {
  if (commitment.label.trim() === '') return false;
  return commitment.weekdays.length > 0 || commitment.exceptions.length > 0;
}

/** Datumet för en engångshändelse, om åtagandet är en sådan. */
export function oneOffDate(commitment: Commitment): IsoDate | null {
  if (commitment.weekdays.length > 0) return null;
  return commitment.exceptions.find((exception) => exception.kind === 'extra')?.date ?? null;
}

/** Ett åtagande som bara händer en gång, vid ett datum. */
export function asOneOff(
  commitment: Commitment,
  date: IsoDate | null,
  start: Minutes,
  end: Minutes,
): Partial<Omit<Commitment, 'id'>> {
  return {
    weekdays: [],
    start,
    end,
    exceptions: date === null ? [] : [{ date, kind: 'extra', start, end }],
  };
}

// ---------------------------------------------------------------------------
// Att ändra en enskild dag
//
// Det här är den vanligaste ändringen som finns: veckan blev inte som vanligt.
// Den görs där man ser den, i veckovyn, och den ändrar bara den dagen. Att
// ändra regeln är ett eget val man får göra medvetet — aldrig något som händer
// för att man råkade stå på en onsdag.
//
// Under ytan är det fortfarande undantag, men ordet finns inte längre i UI:t.
// Det beskrev maskineriet, inte vad användaren gjorde.
// ---------------------------------------------------------------------------

/** Dagens undantag för åtagandet, om det finns något. */
export function exceptionOn(commitment: Commitment, date: IsoDate): CommitmentException | null {
  return commitment.exceptions.find((exception) => exception.date === date) ?? null;
}

/** Sant när åtagandet bara finns som enskilda händelser, utan återkommande regel. */
function isOneOff(commitment: Commitment): boolean {
  return commitment.weekdays.length === 0;
}

function withExceptions(
  list: Commitment[],
  commitmentId: string,
  change: (commitment: Commitment) => CommitmentException[],
): Commitment[] {
  return list
    .map((commitment) =>
      commitment.id === commitmentId
        ? { ...commitment, exceptions: change(commitment) }
        : commitment,
    )
    // Ett åtagande utan fasta dagar och utan undantag tar inte upp någon tid
    // och syns ingenstans. Det ska inte ligga kvar som osynligt skräp.
    .filter((commitment) => commitment.weekdays.length > 0 || commitment.exceptions.length > 0);
}

/** Allt utom dagens undantag. Ett datum bär aldrig mer än ett. */
function withoutDate(exceptions: CommitmentException[], date: IsoDate): CommitmentException[] {
  return exceptions.filter((exception) => exception.date !== date);
}

/**
 * Ger åtagandet tider just den dagen.
 *
 * Vilken sorts undantag det blir avgörs av om åtagandet brukar hända den
 * veckodagen: gör det det är det samma sak på annan tid, annars är det ett
 * tillfälle som inte skulle ha funnits. Motorn räknar olika på de två, och en
 * engångshändelse hamnar rätt av sig själv — den har inga fasta dagar alls.
 */
export function setDayTimes(
  list: Commitment[],
  commitmentId: string,
  date: IsoDate,
  start: Minutes,
  end: Minutes,
): Commitment[] {
  return withExceptions(list, commitmentId, (commitment) => [
    ...withoutDate(commitment.exceptions, date),
    {
      date,
      kind: commitment.weekdays.includes(weekdayOf(date)) ? 'moved' : 'extra',
      start,
      end,
    },
  ]);
}

/**
 * Åtagandet händer inte den dagen.
 *
 * För något återkommande betyder det ett inställt tillfälle. För en
 * engångshändelse finns inget kvar att ställa in — då är den bara borta, och
 * åtagandet städas bort med sitt sista undantag.
 */
export function setDayOff(list: Commitment[], commitmentId: string, date: IsoDate): Commitment[] {
  return withExceptions(list, commitmentId, (commitment) =>
    isOneOff(commitment)
      ? withoutDate(commitment.exceptions, date)
      : [...withoutDate(commitment.exceptions, date), { date, kind: 'off' }],
  );
}

/** Tillbaka till det vanliga den dagen. */
export function clearDay(list: Commitment[], commitmentId: string, date: IsoDate): Commitment[] {
  return withExceptions(list, commitmentId, (commitment) =>
    withoutDate(commitment.exceptions, date),
  );
}

/**
 * Gör dagens ändring till en regel: "och varje onsdag framöver".
 *
 * Ett åtagande bär en tid för alla sina veckodagar, så en onsdag med egna
 * tider går inte att uttrycka inuti det. Onsdagen bryts därför ut till en egen
 * rad med samma namn — två rader som båda är sanna, i stället för en datamodell
 * med tider per veckodag som skulle behöva migreras för något man gör ett par
 * gånger om året.
 *
 * Två fall behöver ingen delning: är dagen den enda veckodagen som finns
 * skrivs regeln bara om, och är dagen inställd tas veckodagen bort.
 */
export function makeWeeklyFromDay(
  list: Commitment[],
  commitmentId: string,
  date: IsoDate,
): Commitment[] {
  const commitment = list.find((item) => item.id === commitmentId);
  if (!commitment) return list;

  const exception = exceptionOn(commitment, date);
  if (!exception) return list;

  const weekday = weekdayOf(date);
  const rest = commitment.weekdays.filter((day) => day !== weekday);
  const kvar: Commitment = { ...commitment, weekdays: rest, exceptions: [] };

  if (exception.kind === 'off') {
    return list.map((item) => (item.id === commitmentId ? kvar : item));
  }

  const { start, end } = exception;

  // Inga andra veckodagar att bevara: regeln skrivs om i stället för att delas.
  if (rest.length === 0) {
    return list.map((item) =>
      item.id === commitmentId
        ? { ...commitment, weekdays: [weekday], start, end, exceptions: [] }
        : item,
    );
  }

  return list.flatMap((item) =>
    item.id === commitmentId
      ? [kvar, { ...commitment, id: nextId(), weekdays: [weekday], start, end, exceptions: [] }]
      : [item],
  );
}

/**
 * Samma sak en gång till, en dag den vanligtvis inte händer — ett extrapass på
 * jobbet. Tiderna kommer från det vanliga och går att ändra efteråt.
 */
export function repeatOnDate(
  list: Commitment[],
  commitmentId: string,
  date: IsoDate,
): Commitment[] {
  const commitment = list.find((item) => item.id === commitmentId);
  if (!commitment) return list;
  if (commitment.weekdays.includes(weekdayOf(date))) return list;
  if (exceptionOn(commitment, date)) return list;

  return setDayTimes(list, commitmentId, date, commitment.start, commitment.end);
}

/**
 * Veckans dagar som inte följer det vanliga.
 *
 * En ren engångshändelse räknas inte — den har inget vanligt att avvika från,
 * den är hela sitt eget innehåll. Ett extrapass på något återkommande räknas,
 * för där finns en regel som dagen bryter mot.
 */
export function deviatingDates(list: Commitment[], dates: IsoDate[]): Set<IsoDate> {
  const inWeek = new Set(dates);
  const found = new Set<IsoDate>();

  for (const commitment of list) {
    if (isOneOff(commitment)) continue;
    for (const exception of commitment.exceptions) {
      if (inWeek.has(exception.date)) found.add(exception.date);
    }
  }

  return found;
}
