import { describe, expect, it } from 'vitest';
import { lastCompletedBefore, nextSessionId } from '../../src/scheduling/rotation';
import type { TrainingSession } from '../../src/scheduling/types';

const sessions: TrainingSession[] = [
  { id: 'framsida', name: 'Framsida' },
  { id: 'baksida', name: 'Baksida' },
];

describe('lastCompletedBefore', () => {
  it('ger inget ankare alls när inget pass är loggat', () => {
    expect(lastCompletedBefore([], '2025-09-01')).toBeNull();
  });

  it('utgår från det senast loggade passet före datumet', () => {
    expect(
      lastCompletedBefore(
        [
          { date: '2025-08-27', sessionId: 'framsida' },
          { date: '2025-08-29', sessionId: 'baksida' },
        ],
        '2025-09-01',
      ),
    ).toBe('baksida');
  });

  it('bryr sig om datum, inte om ordningen i listan', () => {
    expect(
      lastCompletedBefore(
        [
          { date: '2025-08-29', sessionId: 'baksida' },
          { date: '2025-08-27', sessionId: 'framsida' },
        ],
        '2025-09-01',
      ),
    ).toBe('baksida');
  });

  it('tar det sist tillagda när två pass loggats samma dag', () => {
    expect(
      lastCompletedBefore(
        [
          { date: '2025-08-29', sessionId: 'framsida' },
          { date: '2025-08-29', sessionId: 'baksida' },
        ],
        '2025-09-01',
      ),
    ).toBe('baksida');
  });

  it('räknar inte med datumet självt — det är dagen som ska planeras', () => {
    expect(lastCompletedBefore([{ date: '2025-09-01', sessionId: 'framsida' }], '2025-09-01')).toBeNull();
  });

  it('räknar inte med pass som ligger efter datumet', () => {
    expect(lastCompletedBefore([{ date: '2025-09-05', sessionId: 'framsida' }], '2025-09-01')).toBeNull();
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
