import { describe, expect, it } from 'vitest';
import { deriveRotationState, nextSessionId } from '../../src/scheduling/rotation';
import type { TrainingSession } from '../../src/scheduling/types';

const sessions: TrainingSession[] = [
  { id: 'framsida', name: 'Framsida' },
  { id: 'baksida', name: 'Baksida' },
];

describe('deriveRotationState', () => {
  it('ger inget läge alls när inget pass är loggat', () => {
    expect(deriveRotationState([])).toEqual({ lastCompletedSessionId: null });
  });

  it('utgår från det senast loggade passet', () => {
    expect(
      deriveRotationState([
        { date: '2025-09-01', sessionId: 'framsida' },
        { date: '2025-09-03', sessionId: 'baksida' },
      ]),
    ).toEqual({ lastCompletedSessionId: 'baksida' });
  });

  it('bryr sig om datum, inte om ordningen i listan', () => {
    expect(
      deriveRotationState([
        { date: '2025-09-03', sessionId: 'baksida' },
        { date: '2025-09-01', sessionId: 'framsida' },
      ]),
    ).toEqual({ lastCompletedSessionId: 'baksida' });
  });

  it('tar det sist tillagda när två pass loggats samma dag', () => {
    expect(
      deriveRotationState([
        { date: '2025-09-03', sessionId: 'framsida' },
        { date: '2025-09-03', sessionId: 'baksida' },
      ]),
    ).toEqual({ lastCompletedSessionId: 'baksida' });
  });
});

describe('nextSessionId', () => {
  it('börjar på första passet när inget är loggat', () => {
    expect(nextSessionId(sessions, null)).toBe('framsida');
  });

  it('stegar framåt i listan', () => {
    expect(nextSessionId(sessions, 'framsida')).toBe('baksida');
  });

  it('rullar runt till början', () => {
    expect(nextSessionId(sessions, 'baksida')).toBe('framsida');
  });

  it('börjar om från början om passet inte längre finns i upplägget', () => {
    expect(nextSessionId(sessions, 'borttaget-pass')).toBe('framsida');
  });

  it('ger null när upplägget är tomt', () => {
    expect(nextSessionId([], null)).toBeNull();
  });
});
