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
