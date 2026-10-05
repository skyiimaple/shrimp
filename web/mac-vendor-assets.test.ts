import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createMacVendorAssets } from './build/mac-vendor-assets';
describe('OUI asset generation', () => {
  it('preserves every original 24-bit record while keeping all shards below 25 KB', () => {
    const require = createRequire(import.meta.url);
    const source: Record<string, string> = JSON.parse(
      readFileSync(require.resolve('oui-data'), 'utf8'),
    );
    const assets = createMacVendorAssets(source);
    const flattened = Object.assign({}, ...Object.values(assets.shards));
    expect(flattened).toEqual(
      Object.fromEntries(Object.entries(source).filter(([key]) => key.length === 6)),
    );
    expect(
      Math.max(
        ...Object.values(assets.shards).map((data) => Buffer.byteLength(JSON.stringify(data))),
      ),
    ).toBeLessThan(25_000);
  });
  it('preserves 24-bit lookup records and splits only oversized buckets', () => {
    const assets = createMacVendorAssets(
      {
        '00000C': 'Cisco',
        '00000D': 'Other',
        AABBCC: 'Vendor',
        AABBCCD: 'Not used by the original lookup',
      },
      25,
    );
    expect(assets.shards['0000']).toEqual({ '00000C': 'Cisco', '00000D': 'Other' });
    expect(assets.shards.AAB).toEqual({ AABBCC: 'Vendor' });
    expect(assets.records).toEqual({ '00000C': 'Cisco', '00000D': 'Other', AABBCC: 'Vendor' });
  });
});
