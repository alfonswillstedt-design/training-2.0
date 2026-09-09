import { describe, expect, it } from 'vitest';
import { starterPlans } from '../../src/scheduling/defaults';
import { nextSessionId } from '../../src/scheduling/rotation';
import { strings } from '../../src/strings';

describe('färdiga upplägg', () => {
  it('har unika id', () => {
    const ids = starterPlans.map((starter) => starter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('har unika pass-id inom varje upplägg', () => {
    for (const starter of starterPlans) {
      const ids = starter.plan.sessions.map((session) => session.id);
      expect(new Set(ids).size, starter.id).toBe(ids.length);
    }
  });

  it('har unika pass-id även mellan upplägg', () => {
    const ids = starterPlans.flatMap((starter) =>
      starter.plan.sessions.map((session) => session.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('innehåller minst ett pass var', () => {
    for (const starter of starterPlans) {
      expect(starter.plan.sessions.length, starter.id).toBeGreaterThan(0);
    }
  });

  it('har en etikett i språkmodulen', () => {
    for (const starter of starterPlans) {
      expect(strings.plan.starters[starter.id], starter.id).toBeTruthy();
    }
  });

  it('börjar i rullande läge — veckodagar väljer användaren själv', () => {
    for (const starter of starterPlans) {
      expect(starter.plan.mode, starter.id).toBe('rolling');
    }
  });

  it('ger inga två likadana pass i rad när rotationen cyklar', () => {
    // Ett upplägg med samma pass två gånger i följd hade gett samma pass två
    // dagar i rad utan att användaren bett om det.
    for (const starter of starterPlans) {
      const sessions = starter.plan.sessions;
      if (sessions.length < 2) continue;

      for (let index = 0; index < sessions.length; index += 1) {
        const current = sessions[index]!.id;
        expect(nextSessionId(sessions, current), starter.id).not.toBe(current);
      }
    }
  });
});
