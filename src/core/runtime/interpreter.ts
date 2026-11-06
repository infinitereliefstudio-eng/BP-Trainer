/**
 * The Blueprint interpreter: runs event graphs node by node.
 *
 * - Exec flow is single-threaded: a chain runs to its end, or to a latent
 *   node, before anything else happens.
 * - Data inputs are pulled when a node asks for them; pure nodes are
 *   recomputed for every read; impure nodes keep their last outputs.
 * - Latent nodes park an action on the actor; the simulation resumes it.
 */
import type { BlueprintClass, Graph, Link, NodeInstance, PinRef, Project } from '../model/project';
import type { NodeContext, PinSpec } from '../nodes/definition';
import { contextFor, findPin, getDefinition, nodeTitle, pinValue } from '../nodes/registry';
import { defaultValueFor } from '../types/values';
import { getBehavior } from './behaviors';
import { RESUME, type ExecCx, type ValueCx, type WorldApi } from './behaviors/types';
import type { ActorRT, RValue } from './world';

export interface NodeSite {
  actor: ActorRT;
  className: string;
  graphName: string;
  nodeTitle: string;
}

export interface InterpreterHost extends WorldApi {
  /** Called before each node runs, so errors can name it. */
  enterNode(site: NodeSite): void;
  runtimeError(message: string): void;
}

interface GraphIndex {
  graph: Graph;
  cls: BlueprintClass;
  ctx: NodeContext;
  /** "node:pin" of a data input → the link feeding it. */
  dataIn: Map<string, Link>;
  /** "node:pin" of an exec output → the exec inputs it drives. */
  execOut: Map<string, PinRef[]>;
}

/** Steps allowed for one event before UE-style "Infinite loop detected". */
export const MAX_STEPS = 100_000;
const MAX_PURE_DEPTH = 64;

export class Interpreter {
  private graphs = new Map<string, GraphIndex>();
  private byClass = new Map<string, GraphIndex[]>();

  constructor(
    project: Project,
    private readonly host: InterpreterHost,
  ) {
    for (const cls of project.classes) {
      const ctx = contextFor(cls);
      const list: GraphIndex[] = [];
      for (const graph of cls.graphs) {
        const gi: GraphIndex = { graph, cls, ctx, dataIn: new Map(), execOut: new Map() };
        for (const l of Object.values(graph.links)) {
          const fromNode = graph.nodes[l.from.node];
          const spec = fromNode && findPin(fromNode, l.from.pin, ctx);
          if (!spec) continue;
          if (spec.type.category === 'exec') {
            const key = `${l.from.node}:${l.from.pin}`;
            const arr = gi.execOut.get(key) ?? [];
            arr.push(l.to);
            gi.execOut.set(key, arr);
          } else {
            gi.dataIn.set(`${l.to.node}:${l.to.pin}`, l);
          }
        }
        this.graphs.set(graph.id, gi);
        list.push(gi);
      }
      this.byClass.set(cls.id, list);
    }
  }

  /** Does this actor's class contain a node matching `match`? */
  hasEvent(actor: ActorRT, match: (n: NodeInstance) => boolean): boolean {
    const list = actor.classId ? this.byClass.get(actor.classId) : undefined;
    return !!list?.some((gi) => gi.graph.kind === 'event' && Object.values(gi.graph.nodes).some(match));
  }

  /** Trigger every event node of the actor's class that matches. */
  fire(actor: ActorRT, match: (n: NodeInstance) => boolean, execPin: string, outputs: Record<string, RValue> = {}): void {
    if (actor.destroyed || !actor.classId) return;
    for (const gi of this.byClass.get(actor.classId) ?? []) {
      if (gi.graph.kind !== 'event') continue;
      for (const n of Object.values(gi.graph.nodes)) {
        if (!match(n)) continue;
        actor.outputs[n.id] = { ...outputs };
        this.run(actor, gi, n.id, execPin);
      }
    }
  }

  /** Count down latent actions and resume the ones that are due. */
  tickLatents(actor: ActorRT, dt: number): void {
    for (const [nodeId, action] of Object.entries(actor.latent)) {
      action.remaining -= dt;
      if (action.remaining > 1e-9) continue;
      delete actor.latent[nodeId];
      const gi = this.graphs.get(action.graphId);
      if (gi && !actor.destroyed) this.run(actor, gi, nodeId, action.outPin);
    }
  }

  // ---------------------------------------------------------------- exec

  private run(actor: ActorRT, gi: GraphIndex, fromNode: string, outPin: string): void {
    const stack: { node: string; pin: string }[] = [];
    const pushTargets = (node: string, pin: string) => {
      const targets = gi.execOut.get(`${node}:${pin}`) ?? [];
      for (let i = targets.length - 1; i >= 0; i--) stack.push({ node: targets[i].node, pin: targets[i].pin });
    };
    pushTargets(fromNode, outPin);

    let steps = 0;
    while (stack.length) {
      if (actor.destroyed) return;
      if (++steps > MAX_STEPS) {
        this.host.runtimeError(
          `Infinite loop detected. Blueprint: ${gi.cls.name} — plus de ${MAX_STEPS.toLocaleString('fr-FR')} nœuds exécutés pour un seul événement.`,
        );
        return;
      }
      const frame = stack.pop()!;
      const node = gi.graph.nodes[frame.node];
      if (!node) continue;
      const behavior = getBehavior(node.def);
      this.host.enterNode({
        actor,
        className: gi.cls.name,
        graphName: gi.graph.name,
        nodeTitle: nodeTitle(node, gi.ctx),
      });
      if (!behavior?.exec) {
        this.host.runtimeError(`Le nœud ${nodeTitle(node, gi.ctx)} ne s'exécute pas encore dans cette version.`);
        continue;
      }
      let resume = false;
      const cx: ExecCx = {
        ...this.valueCx(actor, gi, node, 0),
        entry: frame.pin,
        out: (pin, value) => {
          (actor.outputs[node.id] ??= {})[pin] = value;
        },
        state: <T extends object>(init: () => T): T => {
          const st = actor.nodeState[node.id] as T | undefined;
          if (st) return st;
          const fresh = init();
          actor.nodeState[node.id] = fresh;
          return fresh;
        },
        resume: () => {
          resume = true;
        },
        latentActive: () => node.id in actor.latent,
        startLatent: (seconds, pin) => {
          actor.latent[node.id] = { graphId: gi.graph.id, remaining: seconds, outPin: pin };
        },
      };
      const outs = behavior.exec(cx);
      if (resume) stack.push({ node: node.id, pin: RESUME });
      for (let i = outs.length - 1; i >= 0; i--) pushTargets(node.id, outs[i]);
    }
  }

  // ---------------------------------------------------------------- data

  private valueCx(actor: ActorRT, gi: GraphIndex, node: NodeInstance, depth: number): ValueCx {
    const read = (pin: string) => this.readInput(actor, gi, node, pin, depth);
    return {
      actor,
      node,
      world: this.host,
      in: read,
      num: (pin) => Number(read(pin)) || 0,
      bool: (pin) => !!read(pin),
      str: (pin) => {
        const v = read(pin);
        return v === null || v === undefined ? '' : typeof v === 'object' ? this.host.displayName(v as RValue) : String(v);
      },
    };
  }

  private readInput(actor: ActorRT, gi: GraphIndex, node: NodeInstance, pin: string, depth: number): RValue {
    const spec = findPin(node, pin, gi.ctx);
    const link = gi.dataIn.get(`${node.id}:${pin}`);
    if (!link) {
      if (!spec) return null;
      if (spec.defaultsToSelf) return { ref: 'actor', id: actor.id };
      return structuredClone(pinValue(node, spec));
    }
    return this.readOutput(actor, gi, link.from.node, link.from.pin, depth + 1);
  }

  private readOutput(actor: ActorRT, gi: GraphIndex, nodeId: string, pin: string, depth: number): RValue {
    const src = gi.graph.nodes[nodeId];
    if (!src) return null;
    const def = getDefinition(src.def);
    switch (src.def) {
      case 'var.get':
        return actor.vars[String(src.config.variable)] ?? null;
      case 'var.component':
        return { ref: 'component', actor: actor.id, id: String(src.config.component) };
      case 'actor.self':
        return { ref: 'actor', id: actor.id };
    }
    if (def?.kind === 'pure') {
      if (depth > MAX_PURE_DEPTH) {
        this.host.runtimeError('Boucle de nœuds purs : un nœud pur dépend de lui-même.');
        return null;
      }
      const behavior = getBehavior(src.def);
      if (!behavior?.pure) return null;
      return behavior.pure(this.valueCx(actor, gi, src, depth))[pin] ?? null;
    }
    const stored = actor.outputs[nodeId]?.[pin];
    if (stored !== undefined) return stored;
    const spec: PinSpec | undefined = findPin(src, pin, gi.ctx);
    return spec ? defaultValueFor(spec.type) : null;
  }
}
