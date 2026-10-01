import type { AgentSettings, ChatMessage } from './types';

const SETTINGS_KEY = 'shrimp:agent:settings';
const DB_NAME = 'shrimp-agent';
const STORE = 'messages';

const defaults: AgentSettings = {
  provider: 'deepseek',
  models: { deepseek: 'deepseek-chat', glm: 'glm-4.5' },
  keys: { deepseek: '', glm: '' },
};

export function readSettings(): AgentSettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return structuredClone(defaults);
    const value = raw as Record<string, unknown>;
    const keys =
      value.keys && typeof value.keys === 'object' ? (value.keys as Record<string, unknown>) : {};
    const models =
      value.models && typeof value.models === 'object'
        ? (value.models as Record<string, unknown>)
        : {};
    return {
      provider: value.provider === 'glm' ? 'glm' : 'deepseek',
      keys: {
        deepseek: typeof keys.deepseek === 'string' ? keys.deepseek : '',
        glm: typeof keys.glm === 'string' ? keys.glm : '',
      },
      models: {
        deepseek:
          typeof models.deepseek === 'string' && models.deepseek.trim()
            ? models.deepseek
            : defaults.models.deepseek,
        glm: typeof models.glm === 'string' && models.glm.trim() ? models.glm : defaults.models.glm,
      },
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function writeSettings(settings: AgentSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开聊天记录存储'));
  });
}

async function runStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error('聊天记录存储失败'));
      transaction.onabort = () => reject(transaction.error ?? new Error('聊天记录存储已中止'));
    });
  } finally {
    db.close();
  }
}

export async function appendMessage(message: ChatMessage): Promise<void> {
  await runStore('readwrite', (store) => store.put(message));
}

export async function listMessages(): Promise<ChatMessage[]> {
  const messages = await runStore<ChatMessage[]>('readonly', (store) => store.getAll());
  for (const message of messages) {
    if (message.status === 'streaming') {
      message.status = 'interrupted';
      await appendMessage(message);
    }
  }
  return messages.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export async function clearMessages(): Promise<void> {
  await runStore('readwrite', (store) => store.clear());
}
