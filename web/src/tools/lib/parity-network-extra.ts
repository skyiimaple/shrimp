import { convertIpv4Address } from './parity-network';

function ipv4Number(input: string) {
  if (!input.includes('.')) throw new Error('请输入点分十进制 IPv4 地址');
  return BigInt(convertIpv4Address(input).decimal);
}

function ipv4Text(value: bigint) {
  return convertIpv4Address(String(value)).address;
}

export function expandIpv4Range(start: string, end: string) {
  const first = ipv4Number(start.trim());
  const last = ipv4Number(end.trim());
  if (first > last) throw new Error('起始地址不能大于结束地址');
  const output: string[] = [];
  let current = first;
  while (current <= last) {
    let block = 1n;
    let prefix = 32;
    while (prefix > 0 && current % (block * 2n) === 0n && current + block * 2n - 1n <= last) {
      block *= 2n;
      prefix--;
    }
    output.push(`${ipv4Text(current)}/${prefix}`);
    current += block;
  }
  return output;
}

export function generateIpv6Ula() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `fd${hex.slice(0, 2)}:${hex.slice(2, 6)}:${hex.slice(6, 10)}::/48`;
}
