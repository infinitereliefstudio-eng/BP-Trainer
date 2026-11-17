/**
 * Behaviour registry. To make a new node executable, add its behaviour to
 * one of these maps under the node definition's id.
 */
import { actionBehaviors } from './actions';
import { actorBehaviors } from './actors';
import { arrayBehaviors } from './arrays';
import { mathBehaviors } from './math';
import { timeBehaviors } from './time';
import { communicationBehaviors } from './communication';
import { flowBehaviors } from './flow';
import { pureBehaviors } from './pure';
import { dataBehaviors } from './data';
import { timelineBehaviors } from './timeline';
import { traceBehaviors } from './trace';
import { randomStreamBehaviors } from './randomStream';
import { transformBehaviors } from './transform';
import { dataTableBehaviors } from './dataTables';
import { saveGameBehaviors } from './saveGame';
import type { Behavior } from './types';

const ALL: Record<string, Behavior> = {
  ...flowBehaviors,
  ...dataTableBehaviors,
  ...saveGameBehaviors,
  ...actionBehaviors,
  ...actorBehaviors,
  ...arrayBehaviors,
  ...mathBehaviors,
  ...pureBehaviors,
  ...timeBehaviors,
  ...communicationBehaviors,
  ...dataBehaviors,
  ...timelineBehaviors,
  ...traceBehaviors,
  ...randomStreamBehaviors,
  ...transformBehaviors,
};

export function getBehavior(defId: string): Behavior | undefined {
  return ALL[defId];
}

export function hasBehavior(defId: string): boolean {
  return defId in ALL;
}
