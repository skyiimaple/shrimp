const IPV4_MAX = 0xffffffff;

function parseIpv4(address: string): number {
  const parts = address.split('.');
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^(?:0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)
  ) {
    throw new Error('无效的 IPv4 地址');
  }
  return parts.reduce((value, part) => value * 256 + Number(part), 0);
}

function formatIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.');
}

export function calculateIpv4Subnet(cidr: string) {
  const match = /^([^/]+)\/(\d{1,2})$/.exec(cidr.trim());
  if (!match) throw new Error('无效的 IPv4 CIDR，请使用地址/前缀格式');
  const addressValue = parseIpv4(match[1]);
  const prefix = Number(match[2]);
  if (prefix > 32) throw new Error('无效的 IPv4 前缀，范围为 0–32');

  const totalAddresses = 2 ** (32 - prefix);
  const networkValue = Math.floor(addressValue / totalAddresses) * totalAddresses;
  const broadcastValue = networkValue + totalAddresses - 1;
  const usableHosts = prefix >= 31 ? totalAddresses : totalAddresses - 2;
  const firstHostValue = prefix >= 31 ? networkValue : networkValue + 1;
  const lastHostValue = prefix >= 31 ? broadcastValue : broadcastValue - 1;
  return {
    address: formatIpv4(addressValue),
    prefix,
    subnetMask: formatIpv4(IPV4_MAX - totalAddresses + 1),
    wildcardMask: formatIpv4(totalAddresses - 1),
    network: formatIpv4(networkValue),
    broadcast: formatIpv4(broadcastValue),
    firstHost: formatIpv4(firstHostValue),
    lastHost: formatIpv4(lastHostValue),
    totalAddresses,
    usableHosts,
  };
}

export function convertIpv4Address(input: string) {
  const value = input.trim();
  let addressValue: number;
  if (value.includes('.')) {
    addressValue = parseIpv4(value);
  } else if (/^0x[0-9a-f]{1,8}$/i.test(value)) {
    addressValue = Number.parseInt(value.slice(2), 16);
  } else if (/^0b[01]{1,32}$/i.test(value)) {
    addressValue = Number.parseInt(value.slice(2), 2);
  } else if (/^(?:0|[1-9]\d*)$/.test(value)) {
    addressValue = Number(value);
  } else {
    throw new Error('无效的 IPv4 地址或整数');
  }
  if (!Number.isSafeInteger(addressValue) || addressValue < 0 || addressValue > IPV4_MAX) {
    throw new Error('无效的 IPv4 整数，范围为 0–4294967295');
  }
  return {
    address: formatIpv4(addressValue),
    decimal: String(addressValue),
    hexadecimal: addressValue.toString(16).toUpperCase().padStart(8, '0'),
    binary: addressValue.toString(2).padStart(32, '0'),
  };
}

export function generateMacAddress(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  bytes[0] = (bytes[0] | 2) & 0xfe;
  return Array.from(bytes, (byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(':');
}
