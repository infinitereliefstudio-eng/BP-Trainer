/**
 * The learner's Play preferences, kept in this browser only (localStorage
 * may be missing or throw: the default then applies).
 */
import type { ActorOrder } from '@core/runtime/simulation';

const KEY = 'bp-trainer.fixedOrder';

/** Shuffled by default, like UE where the order between actors is not guaranteed. */
export function playOrder(): ActorOrder {
  try {
    return localStorage.getItem(KEY) === '1' ? 'level' : 'shuffled';
  } catch {
    return 'shuffled';
  }
}

export function setPlayOrder(order: ActorOrder): void {
  try {
    localStorage.setItem(KEY, order === 'level' ? '1' : '0');
  } catch {
    /* not kept: the default applies next time */
  }
}

const VIEW3D_KEY = 'bp-trainer.view3d';

/**
 * « Vue 3D (essai) » (3D-0, V7.77): Play draws the level in 3D, with a camera that follows the player. Off by
 * default while it is a prototype; the button « Dessus » of Play's toolbar goes back to the top view.
 */
export function view3d(): boolean {
  try {
    return localStorage.getItem(VIEW3D_KEY) === '1';
  } catch {
    return false;
  }
}

export function setView3d(on: boolean): void {
  try {
    localStorage.setItem(VIEW3D_KEY, on ? '1' : '0');
  } catch {
    /* not kept: the default applies next time */
  }
}
