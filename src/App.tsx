import { useEffect, useMemo, useState } from 'react';
import { TabBar, type TabId } from './design';
import { BackupSection } from './features/backup/BackupSection';
import { CommitmentsView } from './features/commitments/CommitmentsView';
import { NextSessionView } from './features/next-session/NextSessionView';
import { Onboarding } from './features/plan/Onboarding';
import { PlanView } from './features/plan/PlanView';
import { SettingsSheet } from './features/plan/SettingsSheet';
import { WeekView } from './features/week/WeekView';
import { fromIsoDate, startOfWeek, toIsoDate, weekDates } from './scheduling/date';
import { planWeek } from './scheduling/planWeek';
import type { Commitment, CompletedSession, Preferences, TrainingPlan } from './scheduling/types';
import { load, save, type AppData } from './storage';
import { strings } from './strings';

/**
 * Steg 6: upplägget och inställningarna är valbara, och första besöket går
 * rakt in i fyra frågor ställda i appens riktiga UI.
 */
export function App() {
  const [tab, setTab] = useState<TabId>('next');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Läses en gång. Gick sparad data inte att läsa startar appen tom, men
  // säger ifrån — och den oläsbara datan ligger kvar i karantän.
  const [initial] = useState(() => load(window.localStorage));
  const [data, setData] = useState<AppData>(initial.data);
  const [saving, setSaving] = useState(true);

  useEffect(() => {
    setSaving(save(window.localStorage, data));
  }, [data]);

  const { commitments, completedSessions, preferences, plan } = data;

  const setCommitments = (next: Commitment[]) =>
    setData((current) => ({ ...current, commitments: next }));
  const setCompletedSessions = (next: CompletedSession[]) =>
    setData((current) => ({ ...current, completedSessions: next }));
  const setPlan = (next: TrainingPlan) => setData((current) => ({ ...current, plan: next }));
  const patchPreferences = (patch: Partial<Preferences>) =>
    setData((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));

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

  // Första besöket går rakt in i frågorna — ingen karusell, ingen flikrad.
  if (!data.onboarded) {
    return (
      <Onboarding
        plan={plan}
        preferences={preferences}
        onChangePreferences={patchPreferences}
        onChangePlan={setPlan}
        onDone={() => setData((current) => ({ ...current, onboarded: true }))}
      />
    );
  }

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
          onChoosePlan={() => setTab('plan')}
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
        />
      )}

      {tab === 'plan' && (
        <PlanView plan={plan} onChange={setPlan} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      <TabBar active={tab} onChange={setTab} />

      {settingsOpen && (
        <SettingsSheet
          preferences={preferences}
          onChange={patchPreferences}
          onClose={() => setSettingsOpen(false)}
          footer={<BackupSection data={data} today={today} onReplace={setData} />}
        />
      )}
    </>
  );
}
