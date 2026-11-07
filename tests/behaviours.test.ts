/**
 * A node is a definition (its pins) and a behaviour (what it does), joined
 * only by an id. This test runs every behaviour with stand-in values and
 * records the pins it reads and writes: each must exist on the definition,
 * or a typo would silently read an empty value.
 */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder } from '../src/core/lessons/builder';
import { allDefinitions, contextFor, resolvePins } from '../src/core/nodes/registry';
import { getBehavior } from '../src/core/runtime/behaviors';
import type { ExecCx, WorldApi } from '../src/core/runtime/behaviors/types';
import type { ActorRT, RValue } from '../src/core/runtime/world';

/** Settings a node needs before its pins exist (Switch on Enum lists an Enum's entries). */
const CONFIG: Record<string, Record<string, string>> = {
  'flow.switchEnum': { enum: 'ECollisionEnabled' },
};

/** A world that answers every question with "nothing": behaviours take their None paths. */
const nullWorld = new Proxy({} as WorldApi, {
  get: (_t, key) => (key === 'time' ? 0 : key === 'random' ? () => 0.5 : key === 'allActors' ? () => [] : () => null),
});

function touchedPins(defId: string): { declared: Set<string>; touched: string[] } {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP');
  const node = b.graph.nodes[b.node(defId, CONFIG[defId] ?? {})];
  const ctx = contextFor(b.cls, pb.project);
  const declared = new Set(resolvePins(node, ctx).map((p) => p.id));
  const touched: string[] = [];
  const read = (pin: string): RValue => {
    touched.push(pin);
    return null;
  };
  const actor = { id: 'a', vars: {}, outputs: {}, nodeState: {}, latent: {} } as unknown as ActorRT;
  const cx: ExecCx = {
    actor,
    node,
    world: nullWorld,
    ctx,
    entry: 'exec',
    in: read,
    num: (p) => {
      read(p);
      return 0;
    },
    bool: (p) => {
      read(p);
      return false;
    },
    str: (p) => {
      read(p);
      return '';
    },
    out: (p) => void touched.push(p),
    state: <T extends object>(init: () => T) => init(),
    resume: () => undefined,
    latentActive: () => false,
    startLatent: (_s, p) => void touched.push(p),
    params: () => ({}),
    callEvents: () => 0,
    callFunction: () => undefined,
    writeRef: (p) => {
      touched.push(p);
      return true;
    },
  };
  const behavior = getBehavior(defId)!;
  if (behavior.exec) touched.push(...behavior.exec(cx));
  if (behavior.pure) touched.push(...Object.keys(behavior.pure(cx)));
  return { declared, touched };
}

describe('node behaviours match their definitions', () => {
  const runnable = allDefinitions().filter((d) => getBehavior(d.id));

  it('covers every runnable node', () => {
    expect(runnable.length).toBeGreaterThan(130);
  });

  for (const d of runnable) {
    it(`${d.id} only reads and writes its own pins`, () => {
      const { declared, touched } = touchedPins(d.id);
      expect(touched.filter((p) => !declared.has(p))).toEqual([]);
    });
  }
});
