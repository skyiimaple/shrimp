import { describe, expect, it } from 'vitest';
import {
  decodeOutlookSafeLink,
  findCommonEmojis,
  findGitCommands,
  fromNatoAlphabet,
  toNatoAlphabet,
} from './parity-reference-more';

describe('additional reference tools', () => {
  it('converts letters to NATO words while retaining punctuation and case-insensitive decoding', () => {
    expect(toNatoAlphabet('Hi, Z!')).toBe('Hotel India, Zulu!');
    expect(fromNatoAlphabet('hotel INDIA, Zulu!')).toBe('HI, Z!');
  });

  it('extracts only an HTTP target from a valid Outlook Safe Link', () => {
    expect(
      decodeOutlookSafeLink(
        'https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1&data=abc',
      ),
    ).toBe('https://example.com/a?x=1');
  });

  it('rejects lookalike hosts, missing targets, and unsafe schemes', () => {
    expect(() =>
      decodeOutlookSafeLink(
        'https://safelinks.protection.outlook.com.evil.test/?url=https%3A%2F%2Fexample.com',
      ),
    ).toThrow();
    expect(() =>
      decodeOutlookSafeLink('https://nam01.safelinks.protection.outlook.com/?data=x'),
    ).toThrow();
    expect(() =>
      decodeOutlookSafeLink(
        'https://nam01.safelinks.protection.outlook.com/?url=javascript%3Aalert(1)',
      ),
    ).toThrow();
    expect(() =>
      decodeOutlookSafeLink(
        'http://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com',
      ),
    ).toThrow();
    expect(() =>
      decodeOutlookSafeLink(
        'https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com&url=https%3A%2F%2Fevil.test',
      ),
    ).toThrow();
    expect(() =>
      decodeOutlookSafeLink(
        'https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2F%ZZ',
      ),
    ).toThrow();
  });

  it('filters practical Git command reference by command and Chinese description', () => {
    expect(findGitCommands('status').map((item) => item.command)).toContain('git status');
    expect(findGitCommands('提交').some((item) => item.command.startsWith('git commit'))).toBe(
      true,
    );
  });

  it('finds common emoji by name and Chinese keyword', () => {
    expect(findCommonEmojis('smile').some((item) => item.emoji === '😀')).toBe(true);
    expect(findCommonEmojis('爱心').some((item) => item.emoji === '❤️')).toBe(true);
  });
});
