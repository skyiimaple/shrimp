import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { appendMessage, clearMessages, listMessages, readSettings, writeSettings } from './storage';
import type { ChatMessage } from './types';

const message = (id: string, createdAt: number): ChatMessage => ({
  id,
  role: 'user',
  content: id,
  createdAt,
  status: 'complete',
});

describe('agent local storage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearMessages();
  });

  it('stores separate provider keys and never mixes them', () => {
    writeSettings({
      provider: 'deepseek',
      models: { deepseek: 'deepseek-chat', glm: 'glm-4.5' },
      keys: { deepseek: 'key-a', glm: 'key-b' },
    });
    expect(readSettings().keys).toEqual({ deepseek: 'key-a', glm: 'key-b' });
    writeSettings({ ...readSettings(), keys: { deepseek: '', glm: 'key-b' } });
    expect(readSettings().keys).toEqual({ deepseek: '', glm: 'key-b' });
  });

  it('falls back to safe defaults for malformed settings', () => {
    localStorage.setItem('shrimp:agent:settings', '{bad');
    expect(readSettings().provider).toBe('deepseek');
    localStorage.setItem(
      'shrimp:agent:settings',
      JSON.stringify({ provider: 'arbitrary', keys: { deepseek: 4 } }),
    );
    expect(readSettings().keys.deepseek).toBe('');
  });

  it('appends a single ordered transcript and clears it without deleting keys', async () => {
    writeSettings({
      provider: 'glm',
      models: { deepseek: 'deepseek-chat', glm: 'glm-4.5' },
      keys: { deepseek: '', glm: 'secret' },
    });
    await appendMessage(message('later', 2));
    await appendMessage(message('earlier', 1));
    expect((await listMessages()).map((item) => item.id)).toEqual(['earlier', 'later']);
    await clearMessages();
    expect(await listMessages()).toEqual([]);
    expect(readSettings().keys.glm).toBe('secret');
  });

  it('marks an unfinished streamed message interrupted after reopening', async () => {
    await appendMessage({
      id: 'partial',
      role: 'assistant',
      content: '一半',
      createdAt: 5,
      status: 'streaming',
    });
    expect(await listMessages()).toMatchObject([
      { id: 'partial', content: '一半', status: 'interrupted' },
    ]);
    expect(await listMessages()).toMatchObject([{ id: 'partial', status: 'interrupted' }]);
  });
});
