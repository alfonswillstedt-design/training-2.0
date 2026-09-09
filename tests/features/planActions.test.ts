import { describe, expect, it } from 'vitest';
import {
  addSession,
  bindWeekday,
  isPlanUsable,
  moveSession,
  removeSession,
  renameSession,
  sessionForWeekday,
  setMode,
} from '../../src/features/plan/planActions';
import type { TrainingPlan } from '../../src/scheduling/types';

const rolling: TrainingPlan = {
  mode: 'rolling',
  sessions: [
    { id: 'framsida', name: 'Framsida' },
    { id: 'baksida', name: 'Baksida' },
  ],
};

const weekly: TrainingPlan = {
  mode: 'weekly',
  sessions: rolling.sessions,
  bindings: [
    { weekday: 1, sessionId: 'framsida' },
    { weekday: 4, sessionId: 'baksida' },
  ],
};

describe('setMode', () => {
  it('behåller passen när läget byts', () => {
    expect(setMode(rolling, 'weekly').sessions).toEqual(rolling.sessions);
    expect(setMode(weekly, 'rolling').sessions).toEqual(rolling.sessions);
  });

  it('börjar utan bindningar i veckobundet läge', () => {
    const changed = setMode(rolling, 'weekly');
    expect(changed.mode === 'weekly' && changed.bindings).toEqual([]);
  });

  it('släpper bindningarna när man går tillbaka till rullande', () => {
    expect(setMode(weekly, 'rolling')).toEqual(rolling);
  });

  it('är oförändrad när läget redan stämmer', () => {
    expect(setMode(rolling, 'rolling')).toBe(rolling);
  });
});

describe('passen i upplägget', () => {
  it('läggs till med ett eget namn', () => {
    const changed = addSession(rolling, 'Ben');
    expect(changed.sessions.map((s) => s.name)).toEqual(['Framsida', 'Baksida', 'Ben']);
  });

  it('ger unika id även för samma namn', () => {
    const changed = addSession(addSession(rolling, 'Ben'), 'Ben');
    const ids = changed.sessions.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lägger inte till ett namnlöst pass', () => {
    expect(addSession(rolling, '   ')).toBe(rolling);
  });

  it('går att döpa om', () => {
    expect(renameSession(rolling, 'baksida', 'Rygg').sessions[1]!.name).toBe('Rygg');
  });

  it('tas bort', () => {
    expect(removeSession(rolling, 'framsida').sessions.map((s) => s.id)).toEqual(['baksida']);
  });

  it('tar med sig sina bindningar när det tas bort', () => {
    const changed = removeSession(weekly, 'framsida');
    expect(changed.mode === 'weekly' && changed.bindings).toEqual([
      { weekday: 4, sessionId: 'baksida' },
    ]);
  });
});

describe('ordningen är rotationen', () => {
  it('flyttar ett pass framåt och bakåt', () => {
    expect(moveSession(rolling, 'baksida', -1).sessions.map((s) => s.id)).toEqual([
      'baksida',
      'framsida',
    ]);
    expect(moveSession(rolling, 'framsida', 1).sessions.map((s) => s.id)).toEqual([
      'baksida',
      'framsida',
    ]);
  });

  it('gör ingenting utanför listans kanter', () => {
    expect(moveSession(rolling, 'framsida', -1)).toBe(rolling);
    expect(moveSession(rolling, 'baksida', 1)).toBe(rolling);
  });

  it('bryr sig inte om ett pass som inte finns', () => {
    expect(moveSession(rolling, 'saknas', 1)).toBe(rolling);
  });
});

describe('bindningar i veckobundet läge', () => {
  it('binder ett pass till en dag', () => {
    expect(sessionForWeekday(bindWeekday(weekly, 3, 'framsida'), 3)).toBe('framsida');
  });

  it('ersätter en dags tidigare bindning i stället för att lägga till', () => {
    const changed = bindWeekday(weekly, 1, 'baksida');
    expect(changed.mode === 'weekly' && changed.bindings.filter((b) => b.weekday === 1)).toHaveLength(1);
    expect(sessionForWeekday(changed, 1)).toBe('baksida');
  });

  it('lossar en dag med null', () => {
    expect(sessionForWeekday(bindWeekday(weekly, 1, null), 1)).toBeNull();
  });

  it('håller bindningarna sorterade på veckodag', () => {
    const changed = bindWeekday(weekly, 2, 'baksida');
    const days = changed.mode === 'weekly' ? changed.bindings.map((b) => b.weekday) : [];
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('gör ingenting i rullande läge', () => {
    expect(bindWeekday(rolling, 1, 'framsida')).toBe(rolling);
    expect(sessionForWeekday(rolling, 1)).toBeNull();
  });
});

describe('isPlanUsable', () => {
  it('kräver minst ett pass', () => {
    expect(isPlanUsable(rolling)).toBe(true);
    expect(isPlanUsable({ mode: 'rolling', sessions: [] })).toBe(false);
  });
});
