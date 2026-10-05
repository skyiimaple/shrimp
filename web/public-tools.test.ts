import { describe, expect, it } from 'vitest';
import {
  isPublicAddress,
  readPublicUrl,
  lookupPublicTool,
  pinnedLookup,
  resolveHostname,
} from './api/network/public-tools';

describe('public lookup safety', () => {
  it('resolves Fake-IP through public DNS without treating reserved addresses as public', async () => {
    const fetchDns = async (url: string | URL | Request) =>
      new Response(
        JSON.stringify({
          Status: 0,
          Answer: [
            {
              type: String(url).includes('type=AAAA') ? 28 : 1,
              data: String(url).includes('type=AAAA') ? '2606:4700:4700::1111' : '1.1.1.1',
            },
          ],
        }),
      );
    const result = await resolveHostname(
      'example.com',
      async () => [{ address: '198.18.0.1', family: 4 }],
      fetchDns,
    );
    expect(result).toEqual([
      { address: '1.1.1.1', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ]);
    expect(
      await resolveHostname(
        'example.com',
        async () => [{ address: '10.0.0.1', family: 4 }],
        fetchDns,
      ),
    ).toEqual([{ address: '10.0.0.1', family: 4 }]);
  });
  it('returns the pinned address for both Node DNS callback modes', () => {
    const values: unknown[] = [];
    const callback = (...args: unknown[]) => values.push(args);
    const resolver = pinnedLookup({ address: '8.8.8.8', family: 4 });
    resolver('example.com', { all: true }, callback);
    resolver('example.com', {}, callback);
    expect(values).toEqual([
      [null, [{ address: '8.8.8.8', family: 4 }]],
      [null, '8.8.8.8', 4],
    ]);
  });
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '192.0.2.1',
    '198.18.0.1',
    '224.0.0.1',
    '::1',
    '::ffff:8.8.8.8',
    'fc00::1',
    '2001:db8::1',
  ])('rejects non-public address %s', (address) => expect(isPublicAddress(address)).toBe(false));
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('accepts public address %s', (address) =>
    expect(isPublicAddress(address)).toBe(true),
  );
  it('rejects mixed public/private DNS answers before connecting', async () => {
    await expect(
      readPublicUrl('https://example.com', 'HEAD', async () => [
        { address: '8.8.8.8', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ]),
    ).rejects.toThrow();
  });
  it('checks every redirect and preserves a public redirect chain', async () => {
    const resolve = async () => [{ address: '8.8.8.8', family: 4 }];
    const good = await readPublicUrl('https://example.com', 'HEAD', resolve, async (url) => ({
      status: url.pathname === '/' ? 301 : 200,
      headers: url.pathname === '/' ? { location: '/next' } : { 'cache-control': 'max-age=60' },
      body: '',
    }));
    expect(good.chain.map((item) => item.status)).toEqual([301, 200]);
    await expect(
      readPublicUrl('https://example.com', 'HEAD', resolve, async () => ({
        status: 302,
        headers: { location: 'https://127.0.0.1/' },
        body: '',
      })),
    ).rejects.toThrow();
  });
  it.each([
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com:8080',
    'https://localhost',
    'https://2130706433',
  ])('rejects unsafe URLs %s', async (url) => {
    await expect(readPublicUrl(url)).rejects.toThrow();
  });
});

describe('public query normalization', () => {
  it.each(['example.com/path', 'example.com?x', 'example.com#x'])(
    'rejects malformed RDAP domain %s before normalization',
    async (input) => {
      expect(
        (
          await lookupPublicTool('rdap', input, async () => ({
            status: 200,
            headers: {},
            body: '{}',
            chain: [],
          }))
        ).status,
      ).toBe(400);
    },
  );
  it('returns GitHub metadata and tolerates no release', async () => {
    const result = await lookupPublicTool(
      'github',
      'https://github.com/octocat/Hello-World',
      async (url) => ({
        status: url.includes('/releases/') ? 404 : 200,
        body: JSON.stringify({
          full_name: 'octocat/Hello-World',
          stargazers_count: 42,
          license: { spdx_id: 'MIT' },
        }),
        headers: {},
        chain: [],
      }),
    );
    expect(result.body).toMatchObject({
      repository: 'octocat/Hello-World',
      stars: 42,
      license: 'MIT',
      release: null,
    });
  });
  it('encodes scoped npm packages and exposes dependencies', async () => {
    const urls: string[] = [];
    const result = await lookupPublicTool('npm', '@scope/pkg', async (url) => {
      urls.push(url);
      return {
        status: 200,
        body: JSON.stringify(
          url.includes('downloads')
            ? { downloads: 100 }
            : { name: '@scope/pkg', version: '1.2.3', dependencies: { react: '^19' } },
        ),
        headers: {},
        chain: [],
      };
    });
    expect(urls[0]).toBe('https://registry.npmjs.org/%40scope%2Fpkg/latest');
    expect(result.body).toMatchObject({
      version: '1.2.3',
      downloadsLastWeek: 100,
      dependencies: { react: '^19' },
    });
  });
  it('normalizes RDAP dates, registrar and nameservers', async () => {
    const result = await lookupPublicTool('rdap', 'EXAMPLE.COM', async () => ({
      status: 200,
      headers: {},
      chain: [],
      body: JSON.stringify({
        ldhName: 'EXAMPLE.COM',
        status: ['active'],
        events: [{ eventAction: 'expiration', eventDate: '2027-01-01' }],
        nameservers: [{ ldhName: 'ns.example.com' }],
        entities: [
          { roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Registrar']]] },
        ],
      }),
    }));
    expect(result.body).toMatchObject({
      domain: 'EXAMPLE.COM',
      registrar: 'Registrar',
      nameservers: ['ns.example.com'],
      events: [{ event: 'expiration', date: '2027-01-01' }],
    });
  });
  it('returns provider quotas and rejects invalid queries without network access', async () => {
    const limited = await lookupPublicTool('github', 'a/b', async () => ({
      status: 403,
      headers: { 'x-ratelimit-remaining': '0' },
      body: '',
      chain: [],
    }));
    expect(limited.status).toBe(429);
    expect((await lookupPublicTool('npm', 'https://evil.test')).status).toBe(400);
    expect((await lookupPublicTool('rdap', 'https://example.com')).status).toBe(400);
  });
});
