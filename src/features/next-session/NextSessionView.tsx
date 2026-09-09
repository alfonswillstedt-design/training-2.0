import { clock, duration, EmptyState, Screen } from '../../design';
import type { IsoDate, Minutes, PlannedDay, PlannedSession } from '../../scheduling/types';
import { strings } from '../../strings';
import { selectNextSession } from './selectNextSession';

export interface NextSessionViewProps {
  days: PlannedDay[];
  today: IsoDate;
  /** Minuter från midnatt just nu, så ett passerat pass inte visas som nästa. */
  now: Minutes;
  /** Datum där passet redan är avklarat. */
  completedDates: ReadonlySet<IsoDate>;
  onComplete: (sessionId: string) => void;
  onChoosePlan: () => void;
}

/**
 * Flik 1 — startvyn.
 *
 * Svaret användaren kom för är ett klockslag, så klockslaget är det största på
 * skärmen. Allt annat är stödinformation. Vyn frågar aldrig något och laddar
 * aldrig något — allt finns redan.
 */
export function NextSessionView({
  days,
  today,
  now,
  completedDates,
  onComplete,
  onChoosePlan,
}: NextSessionViewProps) {
  const { today: todayPlan, todayCompleted, next, missedToday } = selectNextSession(
    days,
    today,
    completedDates,
    now,
  );

  if (days.length > 0 && days.every((day) => day.reason?.kind === 'no-plan')) {
    return (
      <Screen>
        <EmptyState
          title={strings.empty.noPlan.title}
          body={strings.empty.noPlan.body}
          action={strings.empty.noPlan.action}
          onAction={onChoosePlan}
        />
      </Screen>
    );
  }

  if (!next) {
    return (
      <Screen>
        <EmptyState
          title={strings.empty.noSessionThisWeek.title}
          body={strings.empty.noSessionThisWeek.body}
        >
          {todayPlan?.reason && (
            <TodayNote className="mt-6">{strings.reason(todayPlan.reason)}</TodayNote>
          )}
        </EmptyState>
      </Screen>
    );
  }

  const isToday = next.date === today;
  const session = next.session;

  // Ligger passet en annan dag har användaren rätt att få veta varför.
  const todayNote = todayCompleted
    ? strings.today.completed
    : !isToday && todayPlan?.reason
      ? strings.reason(todayPlan.reason)
      : null;

  return (
    <Screen>
      {missedToday && (
        <div className="mb-7 rounded-tight bg-accent-wash px-4 py-3.5">
          <p className="text-[14px] leading-snug text-ink">
            {strings.nextSession.missed(missedToday.start)}
          </p>
          <button
            type="button"
            onClick={() => onComplete(missedToday.sessionId)}
            className="mt-2 min-h-11 text-[15px] font-semibold text-accent"
          >
            {strings.nextSession.confirmMissed}
          </button>
        </div>
      )}

      {todayNote && <TodayNote>{todayNote}</TodayNote>}

      {/* Svaret ligger i skärmens optiska mitt, inte klistrat mot överkanten. */}
      <div className="flex flex-1 flex-col justify-center pb-4">
        <section>
          <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            {strings.nextSession.eyebrow} · {strings.relativeDay(next.date, today)}
          </p>

          <time
            dateTime={clock(session.start)}
            className="mt-3 block text-[clamp(4.5rem,23vw,6.25rem)] leading-[0.92] font-medium tracking-[-0.045em]"
          >
            {clock(session.start)}
          </time>

          <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.01em]">
            {session.sessionName}
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {strings.nextSession.endsAt(session.end)} · {duration(session.end - session.start)}
          </p>
        </section>

        <HoldPoints session={session} />
      </div>

      {isToday && (
        <button
          type="button"
          onClick={() => onComplete(session.sessionId)}
          className="mt-8 w-full rounded-tight bg-accent px-5 py-4 text-[16px] font-semibold text-accent-ink active:scale-[0.99]"
        >
          {strings.nextSession.complete}
        </button>
      )}
    </Screen>
  );
}

function TodayNote({
  children,
  className = 'mb-7',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`rounded-tight bg-accent-wash px-4 py-3 text-[14px] leading-snug text-ink ${className}`}
    >
      <span className="font-semibold">{strings.today.label}</span> · {children}
    </p>
  );
}

interface HoldPoint {
  key: string;
  at: Minutes;
  label: string;
  note?: string;
  emphasis?: boolean;
}

/** Hållpunkterna runt passet: när man äter, går hemifrån, tar PWO. */
function HoldPoints({ session }: { session: PlannedSession }) {
  const points: HoldPoint[] = [];

  if (session.meal) {
    points.push({
      key: 'meal',
      at: session.meal.start,
      label: strings.holdPoints.meal,
      note: duration(session.meal.end - session.meal.start),
    });
  }

  points.push({ key: 'leave', at: session.leaveHome, label: strings.holdPoints.leaveHome });

  if (session.pwo !== null && session.pwo < session.start) {
    points.push({ key: 'pwo', at: session.pwo, label: strings.holdPoints.pwoBefore });
  }

  // Ingen längd här — den står redan i rubriken ovanför.
  points.push({ key: 'session', at: session.start, label: session.sessionName, emphasis: true });

  // PWO som dricks under passet är en hållpunkt utan egen tid.
  if (session.pwo === session.start) {
    points.push({ key: 'pwo-during', at: session.start, label: strings.holdPoints.pwoDuring });
  }

  points.push({ key: 'home', at: session.homeAgain, label: strings.holdPoints.homeAgain });

  // Stabil sortering — hållpunkter på samma minut behåller sin ordning.
  points.sort((a, b) => a.at - b.at);

  return (
    <ol className="mt-9 rounded-soft border border-line bg-raised px-5 py-3">
      {points.map((point) => (
        <li
          key={point.key}
          className="grid grid-cols-[4.5ch_1fr_auto] items-baseline gap-x-4 border-b border-line py-3 last:border-b-0"
        >
          <time dateTime={clock(point.at)} className="text-[15px] text-ink-soft">
            {clock(point.at)}
          </time>
          <span className={point.emphasis ? 'text-[15px] font-semibold text-accent' : 'text-[15px]'}>
            {point.label}
          </span>
          <span className="text-[13px] text-ink-faint">{point.note}</span>
        </li>
      ))}
    </ol>
  );
}
