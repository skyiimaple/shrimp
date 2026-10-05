export interface IpLookupResult {
  ip: string;
  type: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
  organization: string;
  asn: string;
  timezone: string;
  utc: string;
}
export interface DnsLookupResult {
  name: string;
  status: number;
  records: { name: string; type: string; ttl: number; value: string }[];
}

export async function queryNetwork<T = unknown>(
  mode: 'ip' | 'dns',
  input: string,
  type = 'A',
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams({ mode, input: input.trim(), type });
  const response = await fetch(`/api/network/lookup?${query}`, { signal });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : '查询失败，请稍后重试';
    throw new Error(message);
  }
  if (!data || typeof data !== 'object') throw new Error('查询服务返回了无效数据');
  return data as T;
}
