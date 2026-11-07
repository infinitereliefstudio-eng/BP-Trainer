/**
 * Wildcard pins, as in UE: a generic node (array functions, Select,
 * Reroute…) takes the type of the first wire connected to one of its
 * wildcard pins, and becomes generic again when its last such wire goes.
 * The adopted type is stored on the node, in `config["wild"]` (or
 * `config["wild:<group>"]` when a node has several independent groups).
 */
import type { PinCategory, PinType } from './pins';

export function wildKey(group?: string): string {
  return group ? `wild:${group}` : 'wild';
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
