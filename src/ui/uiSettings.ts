/**
 * The learner's display settings, kept in this browser only: the text size of the app (UI-1, V7.75) and « Vue UE
 * pure », which hides what the app adds to UE's editor (UI-4, V7.76; see origins.ts). localStorage
 * may be missing or throw: the default then applies. The size scales the app's text (tokens.css, --ts); the graph,
 * the level and the widgets of the game keep theirs (they zoom with two fingers, or are the game's own sizes).
 */

const KEY = 'bp-trainer.textScale';
const PURE_KEY = 'bp-trainer.pureUe';
const listeners = new Set<() => void>();

export const TEXT_SCALES = [
  { value: 0.9, label: 'Petite' },
  { value: 1, label: 'Normale' },
  { value: 1.15, label: 'Grande' },
  { value: 1.3, label: 'Très grande' },
] as const;

export type TextScale = (typeof TEXT_SCALES)[number]['value'];

export function textScale(): TextScale {
  try {
    const v = Number(localStorage.getItem(KEY));
    return TEXT_SCALES.find((s) => s.value === v)?.value ?? 1;
  } catch {
    return 1;
  }
}

export function setTextScale(value: TextScale): void {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    /* not kept: the default applies next time */
  }
  applyUiSettings();
}

/** « Vue UE pure »: the editor without the app's additions (amber), to get used to UE's own. */
export function pureUe(): boolean {
  try {
    return localStorage.getItem(PURE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPureUe(on: boolean): void {
  try {
    localStorage.setItem(PURE_KEY, on ? '1' : '0');
  } catch {
    /* not kept: the default applies next time */
  }
  applyUiSettings();
}

/** Called after each change of a setting (the editor shows the way out of « Vue UE pure »). */
export function onUiSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Puts the saved settings on the page: called at start and after each change. */
export function applyUiSettings(): void {
  const root = document.documentElement;
  root.style.setProperty('--ts', String(textScale()));
  root.classList.toggle('ue-pure', pureUe());
  for (const fn of listeners) fn();
}
