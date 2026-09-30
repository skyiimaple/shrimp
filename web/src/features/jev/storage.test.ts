import { afterEach, describe, expect, it } from 'vitest';
import { clearJevApiKey, readJevApiKey, writeJevApiKey } from './storage';

describe('Jev API Key 本地保存', () => {
  afterEach(() => localStorage.clear());

  it('保存后重新打开可读取，更换和清除立即生效', () => {
    expect(readJevApiKey()).toBe('');
    writeJevApiKey(' key-one ');
    expect(readJevApiKey()).toBe('key-one');
    writeJevApiKey('key-two');
    expect(readJevApiKey()).toBe('key-two');
    clearJevApiKey();
    expect(readJevApiKey()).toBe('');
  });
});
