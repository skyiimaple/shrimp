import { describe, expect, it } from 'vitest';
import {
  deriveMnemonicSeed,
  generateBcryptHash,
  generateMnemonicPhrase,
  validateMnemonicPhrase,
  verifyBcryptHash,
} from './parity-crypto-advanced';

const vector =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Bcrypt', () => {
  it('creates a compatible salted hash and verifies the password', async () => {
    const hash = await generateBcryptHash('secret', 4);
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(await verifyBcryptHash('secret', hash)).toBe(true);
    expect(await verifyBcryptHash('wrong', hash)).toBe(false);
  });

  it('rejects excessive cost for both creation and verification', async () => {
    await expect(generateBcryptHash('secret', 13)).rejects.toThrow(/成本/);
    await expect(verifyBcryptHash('secret', '$2b$13$' + 'a'.repeat(53))).rejects.toThrow(/成本/);
  });
});

describe('BIP39 English mnemonic', () => {
  it('generates valid 12 and 24 word phrases', () => {
    for (const count of [12, 24] as const) {
      const words = generateMnemonicPhrase(count).split(' ');
      expect(words).toHaveLength(count);
      expect(validateMnemonicPhrase(words.join(' '))).toBe(true);
    }
  });

  it('checks the BIP39 checksum', () => {
    expect(validateMnemonicPhrase(vector)).toBe(true);
    expect(validateMnemonicPhrase('abandon '.repeat(12).trim())).toBe(false);
  });

  it('derives the official test vector seed using a passphrase', async () => {
    expect(await deriveMnemonicSeed(vector, 'TREZOR')).toBe(
      'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04',
    );
    await expect(deriveMnemonicSeed('abandon '.repeat(12).trim())).rejects.toThrow(/助记词/);
  });
});
