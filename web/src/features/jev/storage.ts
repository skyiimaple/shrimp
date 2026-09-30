const KEY = 'shrimp:jev-api-key';

export function readJevApiKey(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function writeJevApiKey(value: string): void {
  localStorage.setItem(KEY, value.trim());
}

export function clearJevApiKey(): void {
  localStorage.removeItem(KEY);
}
