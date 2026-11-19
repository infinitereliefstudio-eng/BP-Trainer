/**
 * Who hears the player's input, as UE routes it (APlayerController's
 * BuildInputStack), taken out of simulation.ts (V7.24).
 *
 * - Key events (Input Key) go down the stack from the top; the first actor
 *   that binds the key with Consume Input keeps it.
 * - Enhanced Input action events reach every actor of the stack that binds
 *   the action: an action event has no Consume Input in UE. Which key
 *   triggers which action is settled earlier, between Mapping Contexts
 *   (runtime/enhancedInput.ts).
 */
import type { Interpreter } from './interpreter';
import type { ActorRT, RValue } from './world';

/**
 * UE's input stack, from the top: the actors that receive input, the last
 * registered first (the last placed in the level, then the spawned ones),
 * then the PlayerController, then the possessed pawn, which "gets last
 * dibs". Not shuffled by the actor order option: UE's stack order is fixed.
 */
export function buildInputStack(actors: readonly ActorRT[], controller: ActorRT, player: ActorRT): ActorRT[] {
  const listening = actors.filter((a) => a.receivesInput && !a.destroyed).reverse();
  const pc = controller.classId ? [controller] : [];
  const pawn = player.classId && player.receivesInput ? [player] : [];
  return [...listening, ...pc, ...pawn];
}

/** A key event down the stack, until an actor keeps it. */
export function sendKey(stack: readonly ActorRT[], interp: Interpreter, key: string, pin: 'pressed' | 'released'): void {
  for (const a of stack) if (interp.fireKey(a, key, pin)) return;
}

/** An action event to every actor of the stack that binds it, from the top. */
export function sendAction(stack: readonly ActorRT[], interp: Interpreter, action: string, event: string, outputs: Record<string, RValue>): void {
  for (const a of stack) interp.fireAction(a, action, event, outputs);
}

/**
 * When an actor keeps a key (Consume Input), the actors below it on the
 * stack that also bind it: they will not hear it.
 */
export function keyKept(stack: readonly ActorRT[], interp: Interpreter, key: string): { by: ActorRT; missed: ActorRT[] } | undefined {
  const i = stack.findIndex((a) => interp.keyBinding(a, key, 'pressed') === 'consume');
  if (i < 0) return undefined;
  const missed = stack.slice(i + 1).filter((a) => interp.keyBinding(a, key, 'pressed') !== 'none');
  return missed.length ? { by: stack[i], missed } : undefined;
}
