/**
 * Wildcard pins, as in UE: a generic node (array functions, Select,
 * Reroute…) takes the type of the first wire connected to one of its
 * wildcard pins, and becomes generic again when its last such wire goes.
 * The adopted type is stored on the node, in `node.wild[<group>]`; a node
 * with independent generic pins (Select: options and index) has a group each.
 */
import type { NodeInstance } from '../model/project';
import type { PinCategory, PinType } from './pins';

/** The group a wildcard pin belongs to. */
export const groupOf = (group?: string) => group ?? 'default';

/** Encoded type adopted by a group of a node's wildcard pins, if any. */
export function adoptedBy(node: Pick<NodeInstance, 'wild'>, group?: string): string | undefined {
  return node.wild?.[groupOf(group)];
}

export function adopt(node: NodeInstance, group: string | undefined, encoded: string): void {
  node.wild = { ...node.wild, [groupOf(group)]: encoded };
}

export function release(node: NodeInstance, group: string): void {
  if (!node.wild) return;
  delete node.wild[group];
  if (!Object.keys(node.wild).length) delete node.wild;
}

/** "int", "object:BP_Lampe", "enum:E_Etat"… (the container is not part of it). */
export function encodeType(t: PinType): string {
  return t.subtype ? `${t.category}:${t.subtype}` : t.category;
}

export function decodeType(s: string): PinType {
  const i = s.indexOf(':');
  return i < 0 ? { category: s as PinCategory } : { category: s.slice(0, i) as PinCategory, subtype: s.slice(i + 1) };
}

/** The type a wildcard pin shows once its node adopted `wild`. */
export function adoptedType(pin: PinType, wild: string): PinType {
  const base = decodeType(wild);
  // A wildcard exec (Reroute on a white wire) has no container.
  if (base.category === 'exec') return base;
  return pin.container ? { ...base, container: pin.container } : base;
}
