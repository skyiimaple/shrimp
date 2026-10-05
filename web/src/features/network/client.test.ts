import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryNetwork } from './client';

afterEach(() => vi.unstubAllGlobals());
describe('network lookup client', () => {
  it('encodes the input and reports service errors', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ip: '8.8.8.8' })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: '查询额度已用完' }), { status: 429 }),
      );
    vi.stubGlobal('fetch', fetcher);
    expect(await queryNetwork('ip', '8.8.8.8')).toEqual({ ip: '8.8.8.8' });
    expect(fetcher.mock.calls[0][0]).toBe('/api/network/lookup?mode=ip&input=8.8.8.8&type=A');
    await expect(queryNetwork('ip', '')).rejects.toThrow('查询额度已用完');
  });
});
