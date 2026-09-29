const KEY = 'shrimp:favorites';
export function readFavorites(validSlugs: Set<string>) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value.filter((slug): slug is string => typeof slug === 'string' && validSlugs.has(slug)),
      ),
    ];
  } catch {
    return [];
  }
}
export function writeFavorites(slugs: string[]) {
  localStorage.setItem(KEY, JSON.stringify(slugs));
}
