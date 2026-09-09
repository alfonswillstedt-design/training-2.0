import { useMemo, useState } from 'react';
import { TabBar, type TabId } from './design';
import { CommitmentsView } from './features/commitments/CommitmentsView';
import { NextSessionView } from './features/next-session/NextSessionView';
import { fromIsoDate, startOfWeek, toIsoDate, weekDates } from './scheduling/date';
import { defaultPreferences, starterPlans } from './scheduling/defaults';
import { planWeek } from './scheduling/planWeek';
import type { Commitment, IsoDate } from './scheduling/types';

/**
 * Steg 3: åtaganden kan matas in på riktigt, och veckan räknas om vid varje
 * ändring. Tillståndet lever i minnet — lagringen kommer i steg 4.
 */

// Tills flik 4 finns kör appen ett standardupplägg och standardinställningar.
// Steg 6 gör båda valbara.
const PREFERENCES = defaultPreferences();
const PLAN = starterPlans.find((starter) => starter.id === 'framsida-baksida')!.plan;

export function App() {
  const [tab, setTab] = useState<TabId>('next');
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [completedDates, setCompletedDates] = useState<ReadonlySet<IsoDate>>(new Set());

  // Klockan läses när appen monteras. Den tickar inte — appen öppnas, svarar
  // och stängs igen.
  const { today, now } = useMemo(() => {
    const clock = new Date();
    return { today: toIsoDate(clock), now: clock.getHours() * 60 + clock.getMinutes() };
  }, []);

  const weekStart = startOfWeek(today);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const days = useMemo(
    () =>
      planWeek({
        commitments,
        preferences: PREFERENCES,
        plan: PLAN,
        // Rotationen härleds inte ur avklarade pass än: motorn planerar hela
        // veckan från ett läge, så en loggning skulle räkna om dagar som redan
        // varit. Det avgörs i steg 4, tillsammans med historiken.
        rotationState: { lastCompletedSessionId: null },
        weekStarting: fromIsoDate(weekStart),
      }),
    [commitments, weekStart],
  );

  return (
    <>
      {tab === 'next' ? (
        <NextSessionView
          days={days}
          today={today}
          now={now}
          completedDates={completedDates}
          onComplete={() => setCompletedDates(new Set([...completedDates, today]))}
          // Nås först när upplägget går att tömma, vilket det gör i steg 6.
          onChoosePlan={() => setTab('commitments')}
        />
      ) : (
        <CommitmentsView
          commitments={commitments}
          dates={dates}
          today={today}
          onChange={setCommitments}
        />
      )}

      <TabBar active={tab} onChange={setTab} />
    </>
  );
}
