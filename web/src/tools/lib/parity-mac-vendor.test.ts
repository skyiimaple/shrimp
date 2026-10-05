import { describe, expect, it, vi } from 'vitest';
import { createMacVendorLookup, createMacVendorStore } from './parity-mac-vendor';
const fixture = () => {
  const read = vi.fn(async () => ({ '00000C': 'Cisco Systems, Inc.' }));
  return { read, lookup: createMacVendorLookup(['0000'], read) };
};
describe('MAC 厂商查询', () => {
  it('repairs an invalid full database cache by downloading a validated replacement', async () => {
    let saved = new Response('invalid JSON');
    const storage = {
      open: async () => ({
        match: async (url: string) => (url.endsWith('offline.json') ? saved.clone() : undefined),
        put: async (_url: string, response: Response) => {
          saved = response.clone();
        },
      }),
    } as unknown as CacheStorage;
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response('{"00000C":"Cisco"}'));
    const store = createMacVendorStore('/assets/test/', ['0000'], fetcher, storage);
    await expect(store.lookup('00000C123456')).rejects.toThrow('加载失败');
    await store.prepareOffline();
    expect(await store.lookup('00000C123456')).toBe('Cisco');
  });
  it('saves loaded shards and the complete offline database across sessions', async () => {
    const saved = new Map<string, Response>();
    const storage = {
      open: async () => ({
        match: async (url: string) => saved.get(url)?.clone(),
        put: async (url: string, response: Response) => {
          saved.set(url, response.clone());
        },
      }),
    } as unknown as CacheStorage;
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ '00000C': 'Cisco', AABBCC: 'Vendor' })),
    );
    const first = createMacVendorStore('/assets/test/', ['0000', 'AAB'], fetcher, storage);
    expect(await first.lookup('00000C123456')).toBe('Cisco');
    const offline = vi.fn().mockRejectedValue(new Error('offline'));
    expect(
      await createMacVendorStore('/assets/test/', ['0000', 'AAB'], offline, storage).lookup(
        '00000C123456',
      ),
    ).toBe('Cisco');
    await first.prepareOffline();
    const reopened = createMacVendorStore('/assets/test/', ['0000', 'AAB'], offline, storage);
    expect(await reopened.offlineReady()).toBe(true);
    expect(await reopened.lookup('AABBCC123456')).toBe('Vendor');
    expect(offline).not.toHaveBeenCalled();
  });
  it('does not report offline readiness when persistent storage is unavailable', async () => {
    const broken = {
      open: async () => {
        throw new Error('storage blocked');
      },
    } as unknown as CacheStorage;
    const store = createMacVendorStore(
      '/assets/test/',
      ['0000'],
      async () => new Response('{"00000C":"Cisco"}'),
      broken,
    );
    expect(await store.lookup('00000C123456')).toBe('Cisco');
    expect(await store.offlineReady()).toBe(false);
    await expect(store.prepareOffline()).rejects.toThrow('离线缓存');
  });
  it.each([
    '00:00:0c:12:34:56',
    '00-00-0C-12-34-56',
    '0000.0c12.3456',
    '00000C123456',
    ' 00000c123456 ',
  ])('supports %s and reads only its shard', async (input) => {
    const { lookup, read } = fixture();
    expect(await lookup(input)).toContain('Cisco');
    expect(read).toHaveBeenCalledWith('0000');
  });
  it.each(['00:00:0C:12:34', '00:00-0C:12:34:56', '00000C12345G', '', '0000.0C12.3456.'])(
    'rejects %s without loading data',
    async (input) => {
      const { lookup, read } = fixture();
      await expect(lookup(input)).rejects.toThrow('MAC');
      expect(read).not.toHaveBeenCalled();
    },
  );
  it('returns null for unknown prefixes without network requests', async () => {
    const { lookup, read } = fixture();
    expect(await lookup('FF:FF:FF:FF:FF:FF')).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(await lookup('00:00:FF:12:34:56')).toBeNull();
  });
  it('deduplicates concurrent queries and retries failed shard loads', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error('加载失败'))
      .mockResolvedValue({ '00000C': 'Cisco' });
    const lookup = createMacVendorLookup(['0000'], read);
    await expect(lookup('00000C123456')).rejects.toThrow('加载失败');
    expect(await Promise.all([lookup('00000C123456'), lookup('00000C654321')])).toEqual([
      'Cisco',
      'Cisco',
    ]);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
