/**
 * Haptic feedback on phones (Vibration API): short pulses that confirm a
 * gesture was taken. Silent where the device or browser has no vibration,
 * and when turned off in the ⋮ menu.
 */
export type Haptic = 'tap' | 'press' | 'link' | 'refuse' | 'success' | 'fail' | 'stop';

/**
 * Milliseconds at the "light" strength: a pulse, or pulse / pause / pulse.
 * Many phone motors do not start on pulses this short: the default strength
 * ("normal") lengthens them, see SCALE.
 */
const PATTERNS: Record<Haptic, number | number[]> = {
  tap: 12,
  press: 22,
  link: 16,
  refuse: [14, 40, 14],
  success: [24, 70, 24, 70, 48],
  fail: [60, 60, 60],
  stop: 40,
};

const KEY = 'bp-trainer:haptics';

/** 'on' is the normal strength (the value stored before strengths existed). */
export type HapticLevel = 'off' | 'light' | 'on' | 'strong';

export const HAPTIC_LEVELS: HapticLevel[] = ['off', 'light', 'on', 'strong'];
export const HAPTIC_LABEL: Record<HapticLevel, string> = { off: 'coupées', light: 'légères', on: 'normales', strong: 'fortes' };

/** How much longer the pulses are than at the light strength. */
const SCALE: Record<HapticLevel, number> = { off: 0, light: 1, on: 2.5, strong: 5 };

export function hapticLevel(): HapticLevel {
  try {
    const v = localStorage.getItem(KEY) as HapticLevel | null;
    return v && HAPTIC_LEVELS.includes(v) ? v : 'on';
  } catch {
    return 'on';
  }
}

export function hapticsEnabled(): boolean {
  return hapticLevel() !== 'off';
}

/** Keeps the choice, and plays a long pulse so the new strength is felt at once. */
export function setHapticLevel(level: HapticLevel): void {
  try {
    localStorage.setItem(KEY, level);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  if (level !== 'off' && hapticsSupported()) {
    try {
      navigator.vibrate(60 * SCALE[level]);
    } catch {
      /* refused: nothing to do */
    }
  }
}

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function haptic(kind: Haptic): void {
  if (!hapticsSupported() || !hapticsEnabled()) return;
  try {
    const scale = SCALE[hapticLevel()];
    const p = PATTERNS[kind];
    // Pauses between pulses keep their length: only the pulses (even positions) grow.
    navigator.vibrate(typeof p === 'number' ? Math.round(p * scale) : p.map((ms, i) => (i % 2 === 0 ? Math.round(ms * scale) : ms)));
  } catch {
    /* refused without a user gesture: nothing to do */
  }
}
