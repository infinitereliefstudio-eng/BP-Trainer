/**
 * Haptic feedback on phones (Vibration API): short pulses that confirm a
 * gesture was taken. Silent where the device or browser has no vibration,
 * and when turned off in the ⋮ menu.
 */
export type Haptic = 'tap' | 'press' | 'link' | 'refuse' | 'success' | 'fail' | 'stop';

/** Milliseconds: a pulse, or pulse / pause / pulse. Under ~10 ms most motors stay silent. */
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

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHaptics(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  if (on) haptic('press');
}

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function haptic(kind: Haptic): void {
  if (!hapticsSupported() || !hapticsEnabled()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* refused without a user gesture: nothing to do */
  }
}
