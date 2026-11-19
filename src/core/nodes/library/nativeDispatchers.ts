/**
 * An actor's own Event Dispatchers that a Blueprint can bind to, as UE's
 * OnActorBeginOverlap and OnActorEndOverlap, with their parameters as UE
 * names them. A Custom Event made for one (Add Custom Event) gets these
 * parameters; the simulation broadcasts them after the matching event.
 */
import type { Param } from '../../model/project';
import { T } from '../../types/pins';

export interface NativeDispatcher {
  name: string;
  /** As UE titles its Bind node: "Bind Event to On Actor Begin Overlap". */
  title: string;
  params: Param[];
}

const overlapParams = (): Param[] => [
  { id: 'overlapped', name: 'Overlapped Actor', type: T.object('Actor') },
  { id: 'other', name: 'Other Actor', type: T.object('Actor') },
];

export const NATIVE_DISPATCHERS: Record<string, NativeDispatcher> = {
  OnActorBeginOverlap: { name: 'OnActorBeginOverlap', title: 'On Actor Begin Overlap', params: overlapParams() },
  OnActorEndOverlap: { name: 'OnActorEndOverlap', title: 'On Actor End Overlap', params: overlapParams() },
};

/** `signatureOwner` of a Custom Event made for one of NATIVE_DISPATCHERS (an actor's own dispatcher). */
export const NATIVE_SIGNATURE_OWNER = 'Actor';
