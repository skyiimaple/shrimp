import { describe, expect, it } from 'vitest';
import { calculateEtaSeconds, evaluateMathExpression, formatElapsedTime } from './parity-math';

describe('math parity helpers', () => {
  it('evaluates precedence, grouping, unary operators and functions', () => {
    expect(evaluateMathExpression('2 + 3 * (4 - 1)')).toBe(11);
    expect(evaluateMathExpression('-2^2 + sqrt(9) + abs(-3)')).toBe(2);
    expect(evaluateMathExpression('sin(0) + cos(0)')).toBe(1);
    expect(evaluateMathExpression('2^3^2')).toBe(512);
  });

  it('rejects non-math input and non-finite results', () => {
    expect(() => evaluateMathExpression('alert(1)')).toThrow();
    expect(() => evaluateMathExpression('1 / 0')).toThrow();
    expect(() => evaluateMathExpression('sqrt(-1)')).toThrow();
    expect(() => evaluateMathExpression('2 +')).toThrow();
  });

  it('calculates travel duration and rejects invalid rates', () => {
    expect(calculateEtaSeconds(120, 60)).toBe(7200);
    expect(() => calculateEtaSeconds(100, 0)).toThrow();
    expect(() => calculateEtaSeconds(-1, 5)).toThrow();
  });

  it('formats elapsed stopwatch time', () => {
    expect(formatElapsedTime(61_230)).toBe('01:01.23');
  });
});
