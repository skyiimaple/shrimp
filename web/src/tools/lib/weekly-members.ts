const KEY = 'shrimp:weekly-members';

export function readWeeklyMembers() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value
          .filter((name): name is string => typeof name === 'string')
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}

export function writeWeeklyMembers(names: string[]) {
  localStorage.setItem(KEY, JSON.stringify(names));
}
