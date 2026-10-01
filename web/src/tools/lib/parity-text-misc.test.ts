import { describe, expect, it } from 'vitest';
import {
  generateLoremIpsum,
  maskText,
  normalizeEmail,
  searchRegexCheatsheet,
} from './parity-text-misc';

describe('text miscellaneous tools', () => {
  it('generates the requested number of nonempty Lorem Ipsum paragraphs', () => {
    const paragraphs = generateLoremIpsum(3).split('\n\n');
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs.every((paragraph) => paragraph.startsWith('Lorem ipsum') || paragraph.length > 50)).toBe(true);
    expect(generateLoremIpsum(1).split('\n\n')).toHaveLength(1);
  });

  it('rejects invalid paragraph counts', () => {
    expect(() => generateLoremIpsum(0)).toThrow();
    expect(() => generateLoremIpsum(1.5)).toThrow();
    expect(() => generateLoremIpsum(21)).toThrow();
  });

  it('masks only the middle while keeping the requested Unicode characters', () => {
    expect(maskText('ab😀中xy', 2, 2)).toBe('ab**xy');
    expect(maskText('secret', 0, 0)).toBe('******');
    expect(maskText('abc', 2, 2)).toBe('abc');
  });

  it('rejects invalid visible character counts', () => {
    expect(() => maskText('abc', -1, 1)).toThrow();
    expect(() => maskText('abc', 1.5, 1)).toThrow();
  });

  it('trims email and lowercases only its domain', () => {
    expect(normalizeEmail('  User.Name+tag@GMAIL.COM  ')).toBe('User.Name+tag@gmail.com');
    expect(normalizeEmail(' Person@ExAmPlE.ORG ')).toBe('Person@example.org');
  });

  it('does not rewrite malformed email text beyond trimming', () => {
    expect(normalizeEmail('  no-at-symbol  ')).toBe('no-at-symbol');
    expect(normalizeEmail('  a@b@C.COM  ')).toBe('a@b@C.COM');
  });

  it('finds JavaScript regex syntax by token or Chinese description', () => {
    expect(searchRegexCheatsheet('\\d').some((entry) => entry.syntax === '\\d')).toBe(true);
    expect(searchRegexCheatsheet('量词').some((entry) => entry.syntax === '*')).toBe(true);
    expect(searchRegexCheatsheet('no-such-syntax')).toEqual([]);
  });
});
