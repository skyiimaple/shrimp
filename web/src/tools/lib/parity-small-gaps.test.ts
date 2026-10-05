import { describe, expect, it, vi } from 'vitest';
import { analyzePasswordStrength, drawAsciiText, generateToken } from './parity-small-gaps';

describe('small parity tools', () => {
  it('uses secure random bytes and rejects biased samples', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint8Array)[0] = spy.mock.calls.length === 1 ? 255 : 1;
      return array;
    });
    try {
      expect(generateToken(1, 'ABC')).toBe('B');
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

  it('validates token alphabet and length', () => {
    expect(() => generateToken(0, 'abc')).toThrow();
    expect(() => generateToken(5, '')).toThrow();
    expect(() => generateToken(5, 'aab')).toThrow();
  });

  it('reports password strength as a heuristic with actionable feedback', () => {
    expect(analyzePasswordStrength('password123').level).toBe('弱');
    expect(analyzePasswordStrength('correct horse battery staple').level).not.toBe('弱');
    expect(analyzePasswordStrength('abc').feedback.length).toBeGreaterThan(0);
  });

  it('draws supported letters and rejects unsupported characters', () => {
    const rows = drawAsciiText('A1').split('\n');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toContain(' # ');
    expect(() => drawAsciiText('你好')).toThrow(/不支持/);
  });
});
