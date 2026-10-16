const KEY = 'shrimp:weekly-projects';

export interface WeeklyProject {
  key: string;
  name: string;
}

function normalize(value: unknown): WeeklyProject[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const projects: WeeklyProject[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.key !== 'string' || typeof record.name !== 'string') continue;
    const key = record.key.trim();
    const name = record.name.trim();
    if (!key || !name || seen.has(key)) continue;
    seen.add(key);
    projects.push({ key, name });
  }
  return projects;
}

export function readWeeklyProjects() {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function writeWeeklyProjects(projects: WeeklyProject[]) {
  localStorage.setItem(KEY, JSON.stringify(normalize(projects)));
}
