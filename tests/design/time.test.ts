import { describe, expect, it } from 'vitest';
import { clock, clockRange, duration } from '../../src/design/time';

describe('clock', () => {
  it('formaterar klockslag med ledande nolla', () => {
    expect(clock(0)).toBe('00:00');
    expect(clock(545)).toBe('09:05');
    expect(clock(950)).toBe('15:50');
  });
});

describe('clockRange', () => {
  it('använder tankstreck, inte bindestreck', () => {
    expect(clockRange(950, 1040)).toBe('15:50–17:20');
  });
});

describe('duration', () => {
  it('skriver minuter under en timme', () => {
    expect(duration(45)).toBe('45 min');
    expect(duration(0)).toBe('0 min');
  });

  it('utelämnar minuterna på jämna timmar', () => {
    expect(duration(60)).toBe('1 h');
    expect(duration(120)).toBe('2 h');
  });

  it('skriver timmar och minuter', () => {
    expect(duration(90)).toBe('1 h 30 min');
    expect(duration(130)).toBe('2 h 10 min');
  });
});
