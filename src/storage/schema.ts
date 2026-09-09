import { defaultPreferences } from '../scheduling/defaults';
import { MINUTES_PER_DAY } from '../scheduling/time';
import type {
  Commitment,
  CommitmentException,
  CompletedSession,
  Minutes,
  OpeningHours,
  Preferences,
  TrainingPlan,
  TrainingSession,
  Weekday,
} from '../scheduling/types';

/**
 * Formen på allt som sparas.
 *
 * `schemaVersion` finns från dag ett så att framtida ändringar kan migreras i
 * stället för att radera användarens data.
 */
export const SCHEMA_VERSION = 1;

export interface AppData {
  schemaVersion: number;
  commitments: Commitment[];
  plan: TrainingPlan;
  preferences: Preferences;
  completedSessions: CompletedSession[];
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    commitments: [],
    plan: { mode: 'rolling', sessions: [] },
    preferences: defaultPreferences(),
    completedSessions: [],
  };
}

// ---------------------------------------------------------------------------
// Validering
//
// Import är hela backup-lösningen och vägen in från en framtida native-app.
// Data utifrån får aldrig kunna sätta appen i ett trasigt läge, så allt byggs
// om från grunden och okända fält kastas. Går något inte att läsa avvisas hela
// filen — halva data är värre än ett tydligt felmeddelande.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function minutes(value: unknown): Minutes | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MINUTES_PER_DAY
    ? value
    : null;
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isoDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function weekday(value: unknown): Weekday | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
    ? (value as Weekday)
    : null;
}

function weekdays(value: unknown): Weekday[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: Weekday[] = [];
  for (const item of value) {
    const day = weekday(item);
    if (day === null) return null;
    if (!parsed.includes(day)) parsed.push(day);
  }
  return parsed.sort((a, b) => a - b);
}

function exception(value: unknown): CommitmentException | null {
  if (!isRecord(value)) return null;
  const date = isoDate(value['date']);
  if (date === null) return null;

  if (value['kind'] === 'off') return { date, kind: 'off' };
  if (value['kind'] !== 'moved' && value['kind'] !== 'extra') return null;

  const start = minutes(value['start']);
  const end = minutes(value['end']);
  if (start === null || end === null) return null;
  return { date, kind: value['kind'], start, end };
}

function commitment(value: unknown): Commitment | null {
  if (!isRecord(value)) return null;

  const id = text(value['id']);
  const label = text(value['label']);
  const days = weekdays(value['weekdays']);
  const start = minutes(value['start']);
  const end = minutes(value['end']);
  if (id === null || label === null || days === null || start === null || end === null) return null;
  if (typeof value['needsMealAfter'] !== 'boolean') return null;
  if (!Array.isArray(value['exceptions'])) return null;

  const exceptions: CommitmentException[] = [];
  for (const item of value['exceptions']) {
    const parsed = exception(item);
    if (parsed === null) return null;
    exceptions.push(parsed);
  }

  return { id, label, weekdays: days, start, end, needsMealAfter: value['needsMealAfter'], exceptions };
}

function session(value: unknown): TrainingSession | null {
  if (!isRecord(value)) return null;
  const id = text(value['id']);
  const name = text(value['name']);
  return id === null || name === null ? null : { id, name };
}

function plan(value: unknown): TrainingPlan | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value['sessions'])) return null;

  const sessions: TrainingSession[] = [];
  for (const item of value['sessions']) {
    const parsed = session(item);
    if (parsed === null) return null;
    sessions.push(parsed);
  }

  if (value['mode'] === 'rolling') return { mode: 'rolling', sessions };
  if (value['mode'] !== 'weekly') return null;
  if (!Array.isArray(value['bindings'])) return null;

  const bindings = [];
  for (const item of value['bindings']) {
    if (!isRecord(item)) return null;
    const day = weekday(item['weekday']);
    const sessionId = text(item['sessionId']);
    if (day === null || sessionId === null) return null;
    bindings.push({ weekday: day, sessionId });
  }

  return { mode: 'weekly', sessions, bindings };
}

function openingHours(value: unknown): OpeningHours | null {
  if (!isRecord(value)) return null;
  const open = minutes(value['open']);
  const close = minutes(value['close']);
  return open === null || close === null ? null : { open, close };
}

function gymHours(value: unknown): Preferences['gymHours'] | null {
  if (!isRecord(value)) return null;
  const hours = {} as Preferences['gymHours'];

  for (const day of [1, 2, 3, 4, 5, 6, 7] as Weekday[]) {
    // En dag som saknas är trasig data, inte en stängd dag. Att tolka den som
    // stängd hade tyst tagit bort en träningsdag ur användarens vecka.
    if (!(String(day) in value)) return null;

    const raw = value[String(day)];
    if (raw === null) {
      hours[day] = null;
      continue;
    }
    const parsed = openingHours(raw);
    if (parsed === null) return null;
    hours[day] = parsed;
  }

  return hours;
}

const TRAVEL_MODES = ['walk', 'bike', 'transit', 'car'];
const PWO_MODES = ['off', 'before', 'during'];

function preferences(value: unknown): Preferences | null {
  if (!isRecord(value)) return null;

  const sessionLength = positive(value['sessionLength']);
  const travelToGym = positive(value['travelToGym']);
  const travelFromGym = positive(value['travelFromGym']);
  const earliestStart = minutes(value['earliestStart']);
  const latestEnd = minutes(value['latestEnd']);
  const hours = gymHours(value['gymHours']);
  if (
    sessionLength === null ||
    travelToGym === null ||
    travelFromGym === null ||
    earliestStart === null ||
    latestEnd === null ||
    hours === null
  ) {
    return null;
  }

  const travelMode = text(value['travelMode']);
  if (travelMode === null || !TRAVEL_MODES.includes(travelMode)) return null;

  const meal = value['meal'];
  const pwo = value['pwo'];
  const rest = value['rest'];
  if (!isRecord(meal) || !isRecord(pwo) || !isRecord(rest)) return null;

  const mealDuration = positive(meal['duration']);
  const pwoMargin = positive(pwo['margin']);
  const minRestDays = positive(rest['minRestDays']);
  const pwoMode = text(pwo['mode']);
  if (
    mealDuration === null ||
    pwoMargin === null ||
    minRestDays === null ||
    pwoMode === null ||
    !PWO_MODES.includes(pwoMode) ||
    typeof meal['enabled'] !== 'boolean' ||
    typeof rest['noSameSessionBackToBack'] !== 'boolean'
  ) {
    return null;
  }

  return {
    sessionLength,
    travelToGym,
    travelFromGym,
    travelMode: travelMode as Preferences['travelMode'],
    gymHours: hours,
    earliestStart,
    latestEnd,
    meal: { enabled: meal['enabled'], duration: mealDuration },
    pwo: { mode: pwoMode as Preferences['pwo']['mode'], margin: pwoMargin },
    rest: { minRestDays, noSameSessionBackToBack: rest['noSameSessionBackToBack'] },
  };
}

function completedSession(value: unknown): CompletedSession | null {
  if (!isRecord(value)) return null;
  const date = isoDate(value['date']);
  const sessionId = text(value['sessionId']);
  return date === null || sessionId === null ? null : { date, sessionId };
}

/** Läser okänd data till `AppData`, eller null om något inte går att lita på. */
export function parseAppData(value: unknown): AppData | null {
  if (!isRecord(value)) return null;
  if (typeof value['schemaVersion'] !== 'number') return null;
  if (!Array.isArray(value['commitments']) || !Array.isArray(value['completedSessions'])) {
    return null;
  }

  const commitments: Commitment[] = [];
  for (const item of value['commitments']) {
    const parsed = commitment(item);
    if (parsed === null) return null;
    commitments.push(parsed);
  }

  const completedSessions: CompletedSession[] = [];
  for (const item of value['completedSessions']) {
    const parsed = completedSession(item);
    if (parsed === null) return null;
    completedSessions.push(parsed);
  }

  const trainingPlan = plan(value['plan']);
  const prefs = preferences(value['preferences']);
  if (trainingPlan === null || prefs === null) return null;

  return {
    schemaVersion: value['schemaVersion'],
    commitments,
    plan: trainingPlan,
    preferences: prefs,
    completedSessions,
  };
}
