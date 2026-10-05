import { describe, expect, it } from 'vitest';
import { expandIpv4Range, generateIpv6Ula } from './parity-network-extra';

describe('IPv4 范围与 IPv6 ULA', () => {
  it('把任意 IPv4 范围拆成最少的 CIDR 块', () => {
    expect(expandIpv4Range('192.168.1.10', '192.168.1.20')).toEqual([
      '192.168.1.10/31',
      '192.168.1.12/30',
      '192.168.1.16/30',
      '192.168.1.20/32',
    ]);
    expect(expandIpv4Range('0.0.0.0', '255.255.255.255')).toEqual(['0.0.0.0/0']);
  });

  it('拒绝倒序和无效 IP', () => {
    expect(() => expandIpv4Range('10.0.0.2', '10.0.0.1')).toThrow('起始');
    expect(() => expandIpv4Range('10.0.0.999', '10.0.0.1')).toThrow('IPv4');
  });

  it('生成 RFC 4193 的本地 IPv6 /48 前缀', () => {
    expect(generateIpv6Ula()).toMatch(/^fd[0-9a-f]{2}:[0-9a-f]{4}:[0-9a-f]{4}::\/48$/);
  });
});
