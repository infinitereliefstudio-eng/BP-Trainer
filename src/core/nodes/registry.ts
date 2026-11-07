/**
 * The node library: every definition, indexed by id.
 *
 * To add a node: write its definition in the matching file of `library/`
 * (or a new file) and list that array below. Nothing else needs to change.
 */
import { findVariable, type BlueprintClass, type NodeInstance, type Project } from '../model/project';
import { makeHierarchy } from '../types/pins';
import { adoptedBy, adoptedType } from '../types/wildcard';
import { defaultValueFor, type Value } from '../types/values';
import type { NodeContext, NodeDefinition, PinSpec } from './definition';
import { actorNodes } from './library/actor';
import { communicationNodes } from './library/communication';
import { functionNodes } from './library/functions';
import { componentNodes } from './library/components';
import { conversionNodes } from './library/conversions';
import { debugNodes } from './library/debug';
import { eventNodes } from './library/events';
import { flowNodes } from './library/flow';
import { mathNodes } from './library/math';
import { timeNodes } from './library/time';
import { variableNodes } from './library/variables';
import { arrayNodes } from './library/arrays';
import { organizationNodes } from './library/organization';
import { switchNodes } from './library/switch';
import { textNodes } from './library/text';

const ALL: NodeDefinition[] = [
  ...eventNodes,
  ...flowNodes,
  ...switchNodes,
  ...timeNodes,
  ...variableNodes,
  ...actorNodes,
  ...componentNodes,
  ...communicationNodes,
  ...functionNodes,
  ...mathNodes,
  ...textNodes,
  ...arrayNodes,
  ...conversionNodes,
  ...debugNodes,
  ...organizationNodes,
];

const BY_ID = new Map<string, NodeDefinition>();
for (const d of ALL) {
  if (BY_ID.has(d.id)) throw new Error(`Duplicate node definition id: ${d.id}`);
  BY_ID.set(d.id, d);
}

export function getDefinition(id: string): NodeDefinition | undefined {
  return BY_ID.get(id);
}

export function allDefinitions(): readonly NodeDefinition[] {
  return ALL;
}

/** Context needed to resolve dynamic pins and titles for nodes of a class. */
export function contextFor(cls: BlueprintClass, project?: Project): NodeContext {
  const parents: Record<string, string> = { [cls.name]: cls.parent };
  for (const c of project?.classes ?? []) parents[c.name] = c.parent;
  return { cls, hierarchy: makeHierarchy(parents), project };
}

/** Pins as the definition declares them, wildcards unresolved. */
export function declaredPins(node: NodeInstance, ctx: NodeContext): PinSpec[] {
  const def = BY_ID.get(node.def);
  if (!def) return [];
  return typeof def.pins === 'function' ? def.pins(node, ctx) : def.pins;
}

/** Pins of a node, with the wildcard pins typed by what is connected to them. */
export function resolvePins(node: NodeInstance, ctx: NodeContext): PinSpec[] {
  return declaredPins(node, ctx).map((p) => {
    if (p.type.category !== 'wildcard') return p;
    const wild = adoptedBy(node, p.wildGroup);
    return wild ? { ...p, type: adoptedType(p.type, wild), wild: true } : { ...p, wild: true };
  });
}

export function findPin(node: NodeInstance, pinId: string, ctx: NodeContext): PinSpec | undefined {
  return resolvePins(node, ctx).find((p) => p.id === pinId);
}

export function nodeTitle(node: NodeInstance, ctx: NodeContext): string {
  const def = BY_ID.get(node.def);
  if (!def) return `Nœud inconnu (${node.def})`;
  return typeof def.title === 'function' ? def.title(node, ctx) : def.title;
}

/** Value of an unconnected input: what the user typed, else the pin default. */
export function pinValue(node: NodeInstance, pin: PinSpec): Value {
  if (pin.id in node.defaults) return node.defaults[pin.id];
  if (pin.default !== undefined) return pin.default;
  return defaultValueFor(pin.type);
}

/** Does the class still own the variable a Get/Set node points to? */
export function variableNodeIsValid(node: NodeInstance, cls: BlueprintClass): boolean {
  if (node.def !== 'var.get' && node.def !== 'var.set') return true;
  return !!findVariable(cls, String(node.config.variable));
}
