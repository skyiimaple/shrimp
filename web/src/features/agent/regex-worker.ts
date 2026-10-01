import { runRegex } from '../../tools/lib/regex';

self.onmessage = (event: MessageEvent<{ pattern: string; flags: string; text: string }>) => {
  const { pattern, flags, text } = event.data;
  const result = runRegex(pattern, flags, text);
  self.postMessage(result.ok ? { ok: true, value: result.value.slice(0, 100) } : result);
};
