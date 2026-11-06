/**
 * Behaviour registry. To make a new node executable, add its behaviour to
 * one of these maps under the node definition's id.
 */
import { actionBehaviors } from './actions';
import { communicationBehaviors } from './communication';
import { flowBehaviors } from './flow';
import { pureBehaviors } from './pure';
import type { Behavior } from './types';

const ALL: Record<string, Behavior> = { ...flowBehaviors, ...actionBehaviors, ...pureBehaviors, ...communicationBehaviors };

export function getBehavior(defId: string): Behavior | undefined {
  return ALL[defId];
}

export function hasBehavior(defId: string): boolean {
  return defId in ALL;
}
