/**
 * The learner's display settings (UI-1, V7.75), kept in this browser only: the text size of the app. localStorage
 * may be missing or throw: the default then applies. The size scales the app's text (tokens.css, --ts); the graph,
 * the level and the widgets of the game keep theirs (they zoom with two fingers, or are the game's own sizes).
 */

const KEY = 'bp-trainer.textScale';

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

/** Puts the saved settings on the page: called at start and after each change. */
export function applyUiSettings(): void {
  document.documentElement.style.setProperty('--ts', String(textScale()));
}
