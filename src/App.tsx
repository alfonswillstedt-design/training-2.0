import { useEffect, useMemo, useState } from 'react';
import { TabBar, type TabId } from './design';
import { CommitmentsView } from './features/commitments/CommitmentsView';
import { NextSessionView } from './features/next-session/NextSessionView';
import { WeekView } from './features/week/WeekView';
import { fromIsoDate, startOfWeek, toIsoDate, weekDates } from './scheduling/date';
import { starterPlans } from './scheduling/defaults';
import { planWeek } from './scheduling/planWeek';
import type { Commitment, CompletedSession } from './scheduling/types';
import { load, save, type AppData } from './storage';
import { strings } from './strings';
import { BackupSection } from './features/backup/BackupSection';

/**
 * Steg 4: allt sparas i localStorage under en enda nyckel och läses tillbaka
 * när appen öppnas. Ingen spara-knapp — varje ändring skrivs direkt.
 */

// Tills flik 4 finns kör appen ett standardupplägg. Steg 6 gör det valbart.
const STARTER_PLAN = starterPlans.find((starter) => starter.id === 'framsida-baksida')!.plan;

export function App() {
  const [tab, setTab] = useState<TabId>('next');

  // Läses en gång. Gick sparad data inte att läsa startar appen tom, men
  // säger ifrån — och den olässbara datan ligger kvar i karantän.
  const [initial] = useState(() => load(window.localStorage));
  const [data, setData] = useState<AppData>(() => ({
    ...initial.data,
    plan: initial.data.plan.sessions.length > 0 ? initial.data.plan : STARTER_PLAN,
  }));
  const [saving, setSaving] = useState(true);

  useEffect(() => {
    setSaving(save(window.localStorage, data));
  }, [data]);

  const { commitments, completedSessions, preferences, plan } = data;

  const setCommitments = (next: Commitment[]) =>
    setData((current) => ({ ...current, commitments: next }));
  const setCompletedSessions = (next: CompletedSession[]) =>
    setData((current) => ({ ...current, completedSessions: next }));

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
        preferences,
        plan,
        completedSessions,
        weekStarting: fromIsoDate(weekStart),
      }),
    [commitments, completedSessions, preferences, plan, weekStart],
  );

  const completedDates = useMemo(
    () => new Set(completedSessions.map((done) => done.date)),
    [completedSessions],
  );

  return (
    <>
      {tab === 'next' && (
        <NextSessionView
          days={days}
          today={today}
          now={now}
          completedDates={completedDates}
          onComplete={(sessionId) =>
            setCompletedSessions([...completedSessions, { date: today, sessionId }])
          }
          // Nås först när upplägget går att tömma, vilket det gör i steg 6.
          onChoosePlan={() => setTab('commitments')}
        />
      )}

      {tab === 'week' && (
        <WeekView days={days} today={today} commitments={commitments} onChange={setCommitments} />
      )}

      {tab === 'commitments' && (
        <CommitmentsView
          commitments={commitments}
          dates={dates}
          today={today}
          onChange={setCommitments}
          note={
            initial.status === 'unreadable'
              ? strings.storage.unreadable
              : saving
                ? undefined
                : strings.storage.notSaving
          }
          footer={<BackupSection data={data} today={today} onReplace={setData} />}
        />
      )}

      <TabBar active={tab} onChange={setTab} />
    </>
  );
}
