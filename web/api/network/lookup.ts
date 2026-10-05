import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

const DNS_TYPES: Record<string, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  NS: 2,
  SOA: 6,
  CAA: 257,
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) => (typeof value === 'string' ? value.slice(0, 2048) : '');

async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Empty response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65_536) {
        await reader.cancel();
        throw new Error('Large response');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function lookupNetwork(
  mode: string,
  input: string,
  clientIp = '',
  type = 'A',
  fetchUpstream: typeof fetch = fetch,
): Promise<{ status: number; body: unknown }> {
  const fail = (status: number, message: string) => ({ status, body: { message } });
  let endpoint: string;
  const value = input.trim();
  let name = '';
  if (mode === 'ip') {
    const ip = value || clientIp;
    if (ip && !isIP(ip)) return fail(400, '请输入有效的 IPv4 或 IPv6 地址');
    endpoint = `https://ipwho.is/${encodeURIComponent(ip)}`;
  } else if (mode === 'dns') {
    name = domainToASCII(value.replace(/\.$/, '')).toLowerCase();
    if (
      name.length > 253 ||
      !name ||
      !name.split('.').every((label) => /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/.test(label))
    )
      return fail(400, '请输入域名，例如 example.com，不要填写 URL');
    if (!Object.hasOwn(DNS_TYPES, type)) return fail(400, '不支持的 DNS 记录类型');
    endpoint = `https://cloudflare-dns.com/dns-query?${new URLSearchParams({ name, type })}`;
  } else return fail(400, '不支持的查询类型');

  try {
    const response = await fetchUpstream(endpoint, {
      headers: { Accept: mode === 'dns' ? 'application/dns-json' : 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) return fail(429, '查询服务额度已用完，请稍后重试');
    if (!response.ok) return fail(502, '查询服务暂时不可用，请稍后重试');
    const data = record(await readJson(response));
    if (mode === 'ip') {
      if (data.success !== true) return fail(400, '该 IP 无法查询归属地，可能属于内网或保留地址');
      if (!isIP(string(data.ip))) return fail(502, '查询服务返回了无效数据');
      const connection = record(data.connection);
      const timezone = record(data.timezone);
      return {
        status: 200,
        body: {
          ip: string(data.ip),
          type: string(data.type),
          country: string(data.country),
          countryCode: string(data.country_code),
          region: string(data.region),
          city: string(data.city),
          isp: string(connection.isp),
          organization: string(connection.org),
          asn: typeof connection.asn === 'number' ? `AS${connection.asn}` : '',
          timezone: string(timezone.id),
          utc: string(timezone.utc),
        },
      };
    }
    if (typeof data.Status !== 'number') return fail(502, 'DNS 服务返回了无效数据');
    const records = (Array.isArray(data.Answer) ? data.Answer : []).slice(0, 100).map((answer) => {
      const item = record(answer);
      return {
        name: string(item.name),
        type:
          Object.keys(DNS_TYPES).find((key) => DNS_TYPES[key] === item.type) ?? String(item.type),
        ttl: typeof item.TTL === 'number' ? item.TTL : 0,
        value: string(item.data),
      };
    });
    return { status: 200, body: { name, status: data.Status, records } };
  } catch {
    return fail(502, '无法连接查询服务，请稍后重试');
  }
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const send = (status: number, body: unknown) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(body));
  };
  if (request.method !== 'GET') {
    send(405, { message: '只支持 GET 请求' });
    return;
  }
  const query = new URL(request.url ?? '/', 'http://localhost').searchParams;
  const mode = query.get('mode') ?? 'ip';
  const input = query.get('input') ?? '';
  const forwarded = request.headers['x-vercel-forwarded-for'];
  const clientIp =
    process.env.VERCEL === '1' && typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : '';
  if (mode === 'ip' && !input.trim() && process.env.VERCEL === '1' && !isIP(clientIp)) {
    send(400, { message: '无法识别当前 IP，请手动输入要查询的地址' });
    return;
  }
  const result = await lookupNetwork(mode, input, clientIp, query.get('type') ?? 'A');
  send(result.status, result.body);
}
