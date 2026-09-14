import { ShrimpApiError, type ShrimpClient } from './types.ts'

const DEFAULT_BASE = 'http://localhost:8080'

export function defaultApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/+$/, '')
  }
  return DEFAULT_BASE
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`
}

async function readError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
    ) {
      return (body as { error: string }).error
    }
  } catch {
    /* ignore non-JSON */
  }
  return res.statusText || `HTTP ${res.status}`
}

async function request<T>(
  base: string,
  path: string,
  init: RequestInit & { parse?: 'json' | 'empty' } = {},
): Promise<T> {
  const { parse = 'json', ...rest } = init
  let res: Response
  try {
    res = await fetch(joinUrl(base, path), rest)
  } catch {
    throw new ShrimpApiError(0, `无法连接 runtime（${base}）`)
  }
  if (!res.ok) {
    throw new ShrimpApiError(res.status, await readError(res))
  }
  if (parse === 'empty' || res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

function jsonInit(method: string, body?: unknown): RequestInit {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return init
}

/** HTTP client for the four OpenAPI resources. Does not call /v1/*. */
export function createHttpClient(baseUrl: string = defaultApiBase()): ShrimpClient {
  const base = baseUrl.replace(/\/+$/, '') || DEFAULT_BASE

  return {
    listAgents: () => request(base, '/agents'),
    createAgent: (body) => request(base, '/agents', jsonInit('POST', body)),
    getAgent: (id) => request(base, `/agents/${encodeURIComponent(id)}`),
    deleteAgent: (id) =>
      request(base, `/agents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        parse: 'empty',
      }),
    chat: (agentId, body) =>
      request(base, `/agents/${encodeURIComponent(agentId)}/chat`, jsonInit('POST', body)),
    listRoutines: () => request(base, '/routines'),
    createRoutine: (body) => request(base, '/routines', jsonInit('POST', body)),
    getRoutine: (id) => request(base, `/routines/${encodeURIComponent(id)}`),
    deleteRoutine: (id) =>
      request(base, `/routines/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        parse: 'empty',
      }),
    search: (body) => request(base, '/tools/search', jsonInit('POST', body)),
  }
}
