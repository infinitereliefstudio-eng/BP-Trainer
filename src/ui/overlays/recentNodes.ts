/**
 * The last nodes placed from the palette, kept in this browser only
 * (localStorage may be missing or throw: the list is then empty).
 */
const KEY = 'bp-trainer.recentNodes';
const MAX = 6;

export function recentKeys(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberKey(key: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([key, ...recentKeys().filter((k) => k !== key)].slice(0, MAX)));
  } catch {
    /* not kept */
  }
}
