import { directory, prefixes } from 'virtual:mac-vendor-assets';

function macPrefix(input: string): string {
  const value = input.trim().toUpperCase();
  const valid =
    /^(?:[0-9A-F]{2}([:-]))(?:[0-9A-F]{2}\1){4}[0-9A-F]{2}$/.test(value) ||
    /^(?:[0-9A-F]{4}\.){2}[0-9A-F]{4}$/.test(value) ||
    /^[0-9A-F]{12}$/.test(value);
  if (!valid) throw new Error('MAC 地址格式无效');
  return value.replace(/[:.-]/g, '').slice(0, 6);
}

type Vendors = Record<string, string>;
export function createMacVendorLookup(shards: string[], read: (shard: string) => Promise<Vendors>) {
  const available = new Set(shards);
  const pending = new Map<string, Promise<Vendors>>();
  return async (input: string): Promise<string | null> => {
    const prefix = macPrefix(input);
    const shard = available.has(prefix.slice(0, 4)) ? prefix.slice(0, 4) : prefix.slice(0, 3);
    if (!available.has(shard)) return null;
    let data = pending.get(shard);
    if (!data) {
      data = read(shard).catch((error) => {
        pending.delete(shard);
        throw error;
      });
      pending.set(shard, data);
    }
    return (await data)[prefix] ?? null;
  };
}

function validate(data: unknown): Vendors {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Object.entries(data).every(
      ([key, value]) => /^[0-9A-F]{6}$/.test(key) && typeof value === 'string',
    )
  )
    throw new Error('本地 OUI 数据格式无效');
  return data as Vendors;
}
export function createMacVendorStore(
  base: string,
  shards: string[],
  fetchData: typeof fetch = (input, init) => fetch(input, init),
  storage: CacheStorage | undefined = globalThis.caches,
) {
  const fullUrl = `${base}offline.json`;
  let full: Vendors | null = null;
  let checkedFull: Promise<void> | null = null;
  const cache = async () => {
    try {
      return await storage?.open('shrimp-mac-vendors-v1');
    } catch {
      return undefined;
    }
  };
  const cachedFull = async () => {
    if (!checkedFull)
      checkedFull = (async () => {
        try {
          const response = await (await cache())?.match(fullUrl);
          if (response) full = validate(await response.json());
        } catch {
          /* An invalid cache must not prevent online recovery. */
        }
      })();
    await checkedFull;
  };
  const download = async (url: string) => {
    let response: Response;
    try {
      response = await fetchData(url, { signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new Error('本地 OUI 数据加载失败，请联网后重试或先下载离线数据库');
    }
    if (!response.ok) throw new Error('本地 OUI 数据加载失败，请重试');
    return response;
  };
  const lookup = createMacVendorLookup(shards, async (shard) => {
    await cachedFull();
    if (full) return full;
    const url = `${base}${shard}.json`;
    const store = await cache();
    const saved = await store?.match(url).catch(() => undefined);
    if (saved) {
      try {
        return validate(await saved.json());
      } catch {
        /* Fetch a fresh copy. */
      }
    }
    const response = await download(url);
    const copy = response.clone();
    const data = validate(await response.json());
    try {
      await store?.put(url, copy);
    } catch {
      /* Current-session lookup still works if storage is full. */
    }
    return data;
  });
  return {
    lookup,
    async offlineReady() {
      const store = await cache();
      return Boolean(await store?.match(fullUrl).catch(() => undefined));
    },
    async prepareOffline() {
      const store = await cache();
      if (!store) throw new Error('浏览器不支持离线缓存，请使用 HTTPS 或 localhost 并允许站点存储');
      const response = await download(fullUrl);
      const copy = response.clone();
      const data = validate(await response.json());
      try {
        await store.put(fullUrl, copy);
      } catch {
        throw new Error('无法保存离线数据库，请检查浏览器存储空间');
      }
      full = data;
      checkedFull = Promise.resolve();
    },
  };
}
const store = createMacVendorStore(directory, prefixes);
export const lookupMacVendor = store.lookup;
export const prepareMacVendorOffline = store.prepareOffline;
export const macVendorOfflineReady = store.offlineReady;
