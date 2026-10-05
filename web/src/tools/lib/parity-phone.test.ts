import { describe, expect, it } from 'vitest';
import { inspectPhoneNumber } from './parity-phone';

describe('phone number inspection', () => {
  it('formats an international number in E.164, international and national forms', () => {
    expect(inspectPhoneNumber('+1 202 555 0123', 'GB')).toEqual({
      valid: true,
      country: 'US',
      e164: '+12025550123',
      international: '+1 202 555 0123',
      national: '(202) 555-0123',
    });
  });

  it('uses the explicit region to parse a national number', () => {
    expect(inspectPhoneNumber('020 7946 0018', 'GB')).toEqual({
      valid: true,
      country: 'GB',
      e164: '+442079460018',
      international: '+44 20 7946 0018',
      national: '020 7946 0018',
    });
  });

  it('rejects invalid numbers and region codes', () => {
    expect(inspectPhoneNumber('123', 'US')).toMatchObject({ valid: false });
    expect(inspectPhoneNumber('2025550123', 'ZZ')).toMatchObject({ valid: false });
  });
});
