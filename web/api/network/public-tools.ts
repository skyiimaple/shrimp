import type { IncomingMessage, ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { domainToASCII } from 'node:url';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const)
  blocked.addSubnet(address, prefix, 'ipv6');
export function isPublicAddress(address: string) {
  if (isIP(address) === 4) return !blocked.check(address, 'ipv4');
  return isIP(address) === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}
type Address = { address: string; family: number };
export function pinnedLookup(address: Address): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [address]);
    else callback(null, address.address, address.family);
  };
}
type Hop = { status: number; headers: Record<string, string>; body: string };
type Remote = Hop & { chain: { url: string; status: number }[] };
type Resolver = (hostname: string) => Promise<Address[]>;
export async function resolveHostname(
  hostname: string,
  system: Resolver = (host) => lookup(host, { all: true }),
  fetchDns: typeof fetch = fetch,
): Promise<Address[]> {
  const addresses = await system(hostname);
  if (!addresses.length || !addresses.every((item) => /^198\.(18|19)\./.test(item.address)))
    return addresses;
  const answers = await Promise.all(
    ['A', 'AAAA'].map(async (type) => {
      const response = await fetchDns(
        `https://cloudflare-dns.com/dns-query?${new URLSearchParams({ name: hostname, type })}`,
        {
          headers: { Accept: 'application/dns-json' },
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) throw new Error('公共 DNS 不可用');
      const data = object(await response.json());
      if (data.Status !== 0) throw new Error('公共 DNS 无法解析此域名');
      return list(data.Answer)
        .map(object)
        .filter((item) => item.type === (type === 'A' ? 1 : 28))
        .map((item) => ({ address: text(item.data), family: type === 'A' ? 4 : 6 }));
    }),
  );
  return answers.flat();
}
type Transport = (
  url: URL,
  address: Address,
  method: 'GET' | 'HEAD',
  signal: AbortSignal,
) => Promise<Hop>;

const transport: Transport = (url, address, method, signal) =>
  new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method,
        signal,
        agent: false,
        maxHeaderSize: 32768,
        headers: {
          Accept: 'application/json, application/rdap+json',
          'User-Agent': 'Shrimp-Public-Tools/1.0',
          'Accept-Encoding': 'identity',
        },
        lookup: pinnedLookup(address),
      },
      (res) => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers))
          if (value !== undefined && key !== 'set-cookie')
            headers[key] = Array.isArray(value) ? value.join(', ') : value;
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('error', reject);
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            req.destroy(new Error('响应数据过大'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 502,
            headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });

export async function readPublicUrl(
  input: string,
  method: 'GET' | 'HEAD' = 'GET',
  resolve: Resolver = resolveHostname,
  send: Transport = transport,
): Promise<Remote> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('请输入完整的 HTTPS URL');
  }
  const chain: Remote['chain'] = [];
  const signal = AbortSignal.timeout(15_000);
  for (let hop = 0; hop < 4; hop++) {
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    )
      throw new Error('只允许无凭据、默认端口的公网 HTTPS 地址');
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      (!hostname.includes('.') && !isIP(hostname))
    )
      throw new Error('不允许查询本地地址');
    const addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await Promise.race([
          resolve(hostname),
          new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => reject(new Error('域名解析超时')), {
              once: true,
            });
            if (signal.aborted) reject(new Error('域名解析超时'));
          }),
        ]);
    if (!addresses.length || addresses.some((item) => !isPublicAddress(item.address)))
      throw new Error('不允许访问内网、保留或非公网地址');
    // Pin the connection to the validated address: a second DNS lookup must not bypass validation.
    const result = await send(url, addresses[0], method, signal);
    chain.push({ url: url.href, status: result.status });
    if ([301, 302, 303, 307, 308].includes(result.status) && result.headers.location) {
      url = new URL(result.headers.location, url);
      continue;
    }
    return { ...result, chain };
  }
  throw new Error('重定向次数过多');
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === 'string' ? value.slice(0, 4096) : '');
const number = (value: unknown) => (typeof value === 'number' ? value : 0);
const list = (value: unknown) => (Array.isArray(value) ? value.slice(0, 100) : []);
class ProviderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
type Reader = (url: string, method?: 'GET' | 'HEAD') => Promise<Remote>;
export async function lookupPublicTool(
  mode: string,
  input: string,
  read: Reader = readPublicUrl,
): Promise<{ status: number; body: unknown }> {
  const json = async (url: string, optional = false) => {
    const res = await read(url);
    if (optional && res.status === 404) return null;
    if (res.status === 429 || (res.status === 403 && res.headers['x-ratelimit-remaining'] === '0'))
      throw new ProviderError(429, '查询服务限流，请稍后重试');
    if (res.status === 404) throw new ProviderError(404, '未找到查询对象，或此服务不支持该对象');
    if (res.status < 200 || res.status >= 300)
      throw new ProviderError(502, '上游查询服务暂时不可用');
    const data: unknown = JSON.parse(res.body);
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error('查询服务返回了无效数据');
    return object(data);
  };
  const fail = (status: number, message: string) => ({ status, body: { message } });
  const value = input.trim();
  if (!value || value.length > 2048) return fail(400, '请输入有效的查询内容');
  try {
    if (mode === 'headers') {
      const res = await read(value, 'HEAD');
      return {
        status: 200,
        body: {
          method: 'HEAD',
          url: res.chain.at(-1)?.url,
          status: res.status,
          redirects: res.chain,
          headers: res.headers,
        },
      };
    }
    if (mode === 'github') {
      const repo = value.replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '');
      if (
        !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]{1,100}$/.test(repo) ||
        repo.split('/')[1] === '..'
      )
        return fail(400, '请输入 owner/repo 或 GitHub 仓库 URL');
      const base = `https://api.github.com/repos/${repo.split('/').map(encodeURIComponent).join('/')}`;
      const data = (await json(base))!;
      const release = await json(`${base}/releases/latest`, true);
      return {
        status: 200,
        body: {
          repository: text(data.full_name),
          description: text(data.description),
          stars: number(data.stargazers_count),
          forks: number(data.forks_count),
          openIssues: number(data.open_issues_count),
          license: text(object(data.license).spdx_id),
          language: text(data.language),
          defaultBranch: text(data.default_branch),
          updatedAt: text(data.updated_at),
          archived: data.archived === true,
          release: release
            ? {
                tag: text(release.tag_name),
                name: text(release.name),
                publishedAt: text(release.published_at),
              }
            : null,
        },
      };
    }
    if (mode === 'npm') {
      if (value.length > 214 || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(value))
        return fail(400, '请输入 npm 包名，例如 react 或 @types/node');
      const encoded = encodeURIComponent(value);
      const data = (await json(`https://registry.npmjs.org/${encoded}/latest`))!;
      let downloads: Record<string, unknown> | null = null;
      try {
        downloads = await json(`https://api.npmjs.org/downloads/point/last-week/${encoded}`);
      } catch {
        /* Metadata remains usable when download statistics are unavailable. */
      }
      return {
        status: 200,
        body: {
          name: text(data.name),
          version: text(data.version),
          description: text(data.description),
          license: text(data.license),
          dependencies: object(data.dependencies),
          peerDependencies: object(data.peerDependencies),
          engines: object(data.engines),
          downloadsLastWeek: downloads ? number(downloads.downloads) : null,
        },
      };
    }
    if (mode === 'rdap') {
      if (/[\s/\\?#:@]/.test(value)) return fail(400, '请输入域名，不要填写 URL');
      const domain = domainToASCII(value.replace(/\.$/, '')).toLowerCase();
      if (
        domain.length > 253 ||
        !domain.includes('.') ||
        isIP(domain) ||
        !domain.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
      )
        return fail(400, '请输入域名，不要填写 URL');
      const data = (await json(`https://rdap.org/domain/${encodeURIComponent(domain)}`))!;
      const registrar = list(data.entities)
        .map(object)
        .find((entity) => list(entity.roles).includes('registrar'));
      const vcard = list(registrar?.vcardArray)[1];
      const fn = list(vcard).find((item) => Array.isArray(item) && item[0] === 'fn');
      return {
        status: 200,
        body: {
          domain: text(data.ldhName) || domain,
          registrar: Array.isArray(fn) ? text(fn[3]) : '',
          status: list(data.status).filter((item) => typeof item === 'string'),
          events: list(data.events).map((item) => {
            const event = object(item);
            return { event: text(event.eventAction), date: text(event.eventDate) };
          }),
          nameservers: list(data.nameservers).map((item) => text(object(item).ldhName)),
          notices: list(data.notices).map((item) =>
            list(object(item).description)
              .filter((line) => typeof line === 'string')
              .join('\n'),
          ),
        },
      };
    }
    return fail(400, '不支持的查询类型');
  } catch (error) {
    if (error instanceof ProviderError) return fail(error.status, error.message);
    return fail(502, '查询失败：目标地址不可访问、不满足安全限制或服务响应异常');
  }
}
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'GET') {
    send(405, { message: '只支持 GET 请求' });
    return;
  }
  const query = new URL(req.url ?? '/', 'http://localhost').searchParams;
  const result = await lookupPublicTool(query.get('mode') ?? '', query.get('input') ?? '');
  send(result.status, result.body);
}
