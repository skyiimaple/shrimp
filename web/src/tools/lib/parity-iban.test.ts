import { describe, expect, it } from 'vitest';
import { inspectIban } from './parity-iban';

describe('IBAN 校验', () => {
  it('忽略分组空格并通过已知德国与英国样例', () => {
    expect(inspectIban('DE89 3704 0044 0532 0130 00')).toEqual({
      valid: true,
      normalized: 'DE89370400440532013000',
      formatted: 'DE89 3704 0044 0532 0130 00',
      countryCode: 'DE',
    });
    expect(inspectIban('gb82 west 1234 5698 7654 32').valid).toBe(true);
  });

  it('拒绝错误校验位、标点与不合理长度', () => {
    expect(inspectIban('DE88 3704 0044 0532 0130 00').valid).toBe(false);
    expect(inspectIban('DE89-3704-0044-0532-0130-00').valid).toBe(false);
    expect(inspectIban('DE89').valid).toBe(false);
  });

  it('拒绝校验位正确但国家代码或固定长度错误的编号', () => {
    expect(inspectIban('DE813704004405320130000').valid).toBe(false);
    expect(inspectIban('ZZ22370400440532013000').valid).toBe(false);
  });
});
