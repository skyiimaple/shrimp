import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { lookupNetwork } from './api/network/lookup';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('network lookup proxy', () => {
  it('queries a fixed HTTPS provider and normalizes IP details', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          ip: '8.8.8.8',
          type: 'IPv4',
          country: 'United States',
          country_code: 'US',
          region: 'California',
          city: 'Mountain View',
          connection: { asn: 15169, isp: 'Google LLC', org: 'Google' },
          timezone: { id: 'America/Los_Angeles', utc: '-07:00' },
        }),
      ),
    );
    const result = await lookupNetwork('ip', '8.8.8.8', '', 'A', fetcher);
    expect(fetcher.mock.calls[0][0]).toBe('https://ipwho.is/8.8.8.8');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ip: '8.8.8.8',
      asn: 'AS15169',
      isp: 'Google LLC',
      timezone: 'America/Los_Angeles',
    });
  });

  it('uses the supplied client IP for the current IP lookup', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, ip: '2001:4860:4860::8888', type: 'IPv6' })),
      );
    await lookupNetwork('ip', '', '2001:4860:4860::8888', 'A', fetcher);
    expect(fetcher.mock.calls[0][0]).toBe('https://ipwho.is/2001%3A4860%3A4860%3A%3A8888');
  });

  it('rejects URLs and invalid IPs before calling upstream', async () => {
    const fetcher = vi.fn();
    expect((await lookupNetwork('ip', 'https://127.0.0.1/', '', 'A', fetcher)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reports quota and upstream failures without exposing raw responses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, message: 'Reserved range' })),
      );
    expect((await lookupNetwork('ip', '8.8.8.8', '', 'A', fetcher)).status).toBe(429);
    expect((await lookupNetwork('ip', '127.0.0.1', '', 'A', fetcher)).status).toBe(400);
  });

  it('queries DNS records and preserves response codes for nonexistent domains', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Status: 0,
          Answer: [{ name: 'example.com', type: 1, TTL: 300, data: '93.184.216.34' }],
        }),
      ),
    );
    const result = await lookupNetwork('dns', 'example.com', '', 'A', fetcher);
    expect(fetcher.mock.calls[0][1].headers.Accept).toBe('application/dns-json');
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://cloudflare-dns.com/dns-query?name=example.com&type=A',
    );
    expect(result.body).toMatchObject({
      name: 'example.com',
      status: 0,
      records: [{ type: 'A', ttl: 300, value: '93.184.216.34' }],
    });
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ Status: 3 })));
    expect((await lookupNetwork('dns', 'missing.example', '', 'A', fetcher)).body).toMatchObject({
      status: 3,
      records: [],
    });
    expect((await lookupNetwork('dns', 'https://example.com/path', '', 'A', fetcher)).status).toBe(
      400,
    );
  });

  it('uses Vercel client headers rather than looking up the function server IP', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (url: string) =>
          new Response(
            JSON.stringify({
              success: true,
              ip: decodeURIComponent(url.split('/').at(-1)!),
              type: 'IPv6',
            }),
          ),
      ),
    );
    let status = 0;
    let body = '';
    const response = {
      writeHead: (code: number) => {
        status = code;
      },
      end: (value: string) => {
        body = value;
      },
    } as unknown as ServerResponse;
    await handler(
      {
        method: 'GET',
        url: '/api/network/lookup?mode=ip',
        headers: { 'x-vercel-forwarded-for': '2001:4860:4860::8888' },
      } as IncomingMessage,
      response,
    );
    expect(status).toBe(200);
    expect(JSON.parse(body).ip).toBe('2001:4860:4860::8888');
    await handler(
      { method: 'GET', url: '/api/network/lookup?mode=ip', headers: {} } as IncomingMessage,
      response,
    );
    expect(status).toBe(400);
  });
});
