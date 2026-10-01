import { describe, expect, it } from 'vitest';
import { calculateIpv4Subnet, convertIpv4Address, generateMacAddress } from './parity-network';

describe('IPv4 subnet calculator', () => {
  it('calculates network, broadcast, usable hosts and mask for a normal subnet', () => {
    expect(calculateIpv4Subnet('192.168.1.130/26')).toEqual({
      address: '192.168.1.130',
      prefix: 26,
      subnetMask: '255.255.255.192',
      wildcardMask: '0.0.0.63',
      network: '192.168.1.128',
      broadcast: '192.168.1.191',
      firstHost: '192.168.1.129',
      lastHost: '192.168.1.190',
      totalAddresses: 64,
      usableHosts: 62,
    });
  });

  it('handles /0, /31 and /32 boundaries without signed integer errors', () => {
    expect(calculateIpv4Subnet('203.0.113.7/0')).toMatchObject({ network: '0.0.0.0', broadcast: '255.255.255.255', totalAddresses: 4294967296, usableHosts: 4294967294 });
    expect(calculateIpv4Subnet('198.51.100.11/31')).toMatchObject({ network: '198.51.100.10', broadcast: '198.51.100.11', firstHost: '198.51.100.10', lastHost: '198.51.100.11', usableHosts: 2 });
    expect(calculateIpv4Subnet('255.255.255.255/32')).toMatchObject({ network: '255.255.255.255', broadcast: '255.255.255.255', firstHost: '255.255.255.255', lastHost: '255.255.255.255', usableHosts: 1 });
  });

  it('rejects malformed addresses and prefixes', () => {
    expect(() => calculateIpv4Subnet('256.1.1.1/24')).toThrow();
    expect(() => calculateIpv4Subnet('1.2.3.4/33')).toThrow();
    expect(() => calculateIpv4Subnet('1.2.3/24')).toThrow();
  });
});

describe('IPv4 address converter', () => {
  it('converts dotted IPv4 to unsigned decimal, hex and 32-bit binary', () => {
    expect(convertIpv4Address('255.255.255.255')).toEqual({ address: '255.255.255.255', decimal: '4294967295', hexadecimal: 'FFFFFFFF', binary: '11111111111111111111111111111111' });
    expect(convertIpv4Address('192.168.1.1')).toMatchObject({ decimal: '3232235777', hexadecimal: 'C0A80101' });
  });

  it('accepts decimal, hexadecimal and binary values', () => {
    expect(convertIpv4Address('3232235777').address).toBe('192.168.1.1');
    expect(convertIpv4Address('0xC0A80101').address).toBe('192.168.1.1');
    expect(convertIpv4Address('0b11000000101010000000000100000001').address).toBe('192.168.1.1');
  });

  it('rejects out-of-range and malformed input', () => {
    expect(() => convertIpv4Address('4294967296')).toThrow();
    expect(() => convertIpv4Address('192.168.001.1')).toThrow();
  });
});

describe('MAC generator', () => {
  it('creates locally administered unicast addresses with six octets', () => {
    for (let index = 0; index < 20; index++) {
      const mac = generateMacAddress();
      expect(mac).toMatch(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/);
      expect(parseInt(mac.slice(0, 2), 16) & 3).toBe(2);
    }
  });
});
