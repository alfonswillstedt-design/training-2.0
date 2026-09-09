import { starterPlans } from '../../scheduling/defaults';
import type { TrainingPlan } from '../../scheduling/types';
import { strings } from '../../strings';

/**
 * Väljaren för färdiga upplägg.
 *
 * En scrollande lista snarare än en knapp per upplägg: de är för många för att
 * få plats, och att lägga till fler ska inte spränga skärmen. Varje rad visar
 * vilka pass den faktiskt innehåller, så valet går att göra utan att gissa.
 */
export function StarterPicker({ onPick }: { onPick: (plan: TrainingPlan) => void }) {
  return (
    <ul className="max-h-[50vh] overflow-y-auto overscroll-contain rounded-soft border border-line bg-raised">
      {starterPlans.map((starter) => {
        const label = strings.plan.starters[starter.id] ?? starter.id;
        const sessions = starter.plan.sessions.map((session) => session.name).join(' · ');

        return (
          <li key={starter.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onPick(starter.plan)}
              className="w-full px-4 py-3.5 text-left"
            >
              <span className="block text-[16px] font-semibold">{label}</span>
              {/* Ett upplägg med ett enda pass heter samma sak som passet. */}
              {sessions !== label && (
                <span className="mt-0.5 block text-[14px] text-ink-soft">{sessions}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
