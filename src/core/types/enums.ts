/**
 * Enum types: UE's built-in enums used by V1 nodes, plus the project's own
 * Enum assets. An enum value is the index of its entry, as in UE (a Byte).
 */
import type { Project } from '../model/project';

export const BUILTIN_ENUMS: Record<string, string[]> = {
  ECollisionEnabled: ['No Collision', 'Query Only (No Physics Collision)', 'Physics Only (No Query Collision)', 'Collision Enabled (Query and Physics)'],
  /** Direction output of a Timeline. */
  ETimelineDirection: ['Forward', 'Backward'],
  /** Trace Channel of a Line Trace: what the ray is blocked by. */
  ETraceTypeQuery: ['Visibility', 'Camera'],
  /** Draw Debug Type of a Line Trace. */
  EDrawDebugTrace: ['None', 'For One Frame', 'For Duration', 'Persistent'],
};

/** Entries of an enum by name, or undefined if it does not exist. */
export function enumEntries(name: string | undefined, project?: Project): string[] | undefined {
  if (!name) return undefined;
  return BUILTIN_ENUMS[name] ?? project?.enums?.find((e) => e.name === name)?.entries;
}

/** Display name of an enum value, falling back to its index. */
export function enumLabel(name: string | undefined, index: number, project?: Project): string {
  return enumEntries(name, project)?.[index] ?? String(index);
}

/** ECollisionEnabled helpers: does a component answer overlaps / block movement? */
export const collisionQueries = (c: number) => c === 1 || c === 3;
export const collisionBlocks = (c: number) => c === 2 || c === 3;
