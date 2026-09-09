import { useState } from 'react';
import { scenarios } from './dev/sampleData';
import { NextSessionView } from './features/next-session/NextSessionView';
import type { IsoDate } from './scheduling/types';

/**
 * Steg 2 visar bara flik 1, matad med hårdkodad testdata. Bottenflikarna och
 * lagringen kommer i senare steg.
 */
export function App() {
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [completedDates, setCompletedDates] = useState<ReadonlySet<IsoDate>>(new Set());

  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0]!;

  function showScenario(id: string) {
    setScenarioId(id);
    setCompletedDates(new Set());
  }

  return (
    <>
      <NextSessionView
        days={scenario.days}
        today={scenario.today}
        completedDates={completedDates}
        onComplete={() => setCompletedDates(new Set([...completedDates, scenario.today]))}
        // Flik 4 finns inte än. I dev-bygget hoppar knappen till ett scenario
        // som har ett upplägg; i steg 6 blir den riktig navigation.
        onChoosePlan={() => showScenario('skoldag')}
      />

      {import.meta.env.DEV && (
        <ScenarioSwitcher active={scenario.id} onPick={showScenario} />
      )}
    </>
  );
}

/** Bara i dev: låter alla vyns tillstånd granskas utan att mata in data. */
function ScenarioSwitcher({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  return (
    <aside className="mx-auto w-full max-w-[430px] border-t border-line px-6 py-7">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        Testdata
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onPick(scenario.id)}
            className={
              scenario.id === active
                ? 'rounded-tight bg-ink px-3 py-2 text-[13px] font-medium text-paper'
                : 'rounded-tight border border-line px-3 py-2 text-[13px] text-ink-soft'
            }
          >
            {scenario.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
