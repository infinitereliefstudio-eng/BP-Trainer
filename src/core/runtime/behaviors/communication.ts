/**
 * Communication between Blueprints: Cast, references, variables of another
 * actor, Event Dispatchers, Custom Event calls and Blueprint Interfaces.
 */
import { isRef, type ActorRT, type RValue } from '../world';
import { copyValue } from '../values';
import { RESUME, type Behavior, type ExecCx } from './types';

const isCustom = (name: string) => (n: { def: string; config: Record<string, unknown> }) => n.def === 'event.custom' && n.config.name === name;

/** The actor whose dispatcher a node targets (Target pin, self by default). */
function dispatcherOwner(cx: ExecCx): ActorRT | null {
  return cx.world.actor(cx.in('target'), 'Target');
}

export const communicationBehaviors: Record<string, Behavior> = {
  'cast.to': {
    // A failed cast is normal flow, never an error — even on None.
    exec: (cx) => {
      const a = cx.world.tryActor(cx.in('object'));
      if (a && a.classId === cx.node.config.class) {
        cx.out('as', { ref: 'actor', id: a.id });
        return ['then'];
      }
      cx.out('as', null);
      return ['failed'];
    },
  },

  'actor.getPlayerPawn': {
    pure: () => ({ result: { ref: 'actor', id: 'player' } }),
  },

  'flow.isValid': {
    exec: (cx) => (cx.world.isValid(cx.in('object')) ? ['valid'] : ['notValid']),
  },

  'util.isValid': {
    pure: (cx) => ({ result: cx.world.isValid(cx.in('object')) }),
  },

  'actor.getOverlappingActors': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const list: RValue[] = [];
      if (a) for (const id of a.overlaps) if (cx.world.isValid({ ref: 'actor', id })) list.push({ ref: 'actor', id });
      cx.out('actors', list);
      return ['then'];
    },
  },

  'flow.forEachLoop': {
    // Like UE's macro, the array is read again at every iteration.
    exec: (cx) => {
      const st = cx.state(() => ({ i: 0 }));
      st.i = cx.entry === RESUME ? st.i + 1 : 0;
      const arr = cx.in('array');
      const list = Array.isArray(arr) ? arr : [];
      if (st.i < list.length) {
        cx.out('element', list[st.i]);
        cx.out('index', st.i);
        cx.resume();
        return ['body'];
      }
      return ['completed'];
    },
  },

  'array.length': {
    pure: (cx) => {
      const arr = cx.in('array');
      return { result: Array.isArray(arr) ? arr.length : 0 };
    },
  },

  'var.getExternal': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      if (a) cx.world.varRead(a, String(cx.node.config.variable));
      return { value: a ? (a.vars[String(cx.node.config.variable)] ?? null) : null };
    },
  },

  'var.setExternal': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const v = copyValue(cx.in('value'));
      if (a) {
        a.vars[String(cx.node.config.variable)] = v;
        cx.world.varWritten(a, String(cx.node.config.variable));
      }
      cx.out('out', v);
      return ['then'];
    },
  },

  // ------------------------------------------------------- dispatchers

  'dispatcher.bind': {
    exec: (cx) => {
      const owner = dispatcherOwner(cx);
      const ev = cx.in('event');
      if (!owner) return ['then'];
      if (!isRef(ev) || ev.ref !== 'delegate') {
        cx.world.runtimeError("Bind Event : la pin Event n'est reliée à aucun Custom Event.");
        return ['then'];
      }
      const key = String(cx.node.config.dispatcher);
      owner.bindings[key] ??= [];
      const list = owner.bindings[key];
      // UE's AddUnique: binding the same event twice has no effect.
      if (!list.some((b) => b.actor === ev.actor && b.node === ev.node)) list.push({ actor: ev.actor, node: ev.node });
      return ['then'];
    },
  },

  'dispatcher.unbind': {
    exec: (cx) => {
      const owner = dispatcherOwner(cx);
      const ev = cx.in('event');
      const key = String(cx.node.config.dispatcher);
      if (owner && isRef(ev) && ev.ref === 'delegate' && owner.bindings[key]) {
        owner.bindings[key] = owner.bindings[key].filter((b) => !(b.actor === ev.actor && b.node === ev.node));
      }
      return ['then'];
    },
  },

  'dispatcher.unbindAll': {
    exec: (cx) => {
      const owner = dispatcherOwner(cx);
      if (owner) owner.bindings[String(cx.node.config.dispatcher)] = [];
      return ['then'];
    },
  },

  'dispatcher.call': {
    // Every bound event runs now, in binding order; nobody bound = nothing happens.
    exec: (cx) => {
      const owner = dispatcherOwner(cx);
      if (!owner) return ['then'];
      const params = cx.params();
      const list = owner.bindings[String(cx.node.config.dispatcher)] ?? [];
      if (!list.length) cx.world.note('dispatcher.noListener', owner.label);
      for (const b of [...list]) {
        const listener = cx.world.tryActor({ ref: 'actor', id: b.actor });
        if (listener) cx.callEvents(listener, (n) => n.id === b.node, params);
      }
      return ['then'];
    },
  },

  // ---------------------------------------------------- custom events

  'call.custom': {
    exec: (cx) => {
      const target = cx.world.actor(cx.in('target'), 'Target');
      if (target && !cx.callEvents(target, isCustom(String(cx.node.config.event)), cx.params())) cx.world.note('call.noTarget', target.label);
      return ['then'];
    },
  },

  'call.function': {
    exec: (cx) => {
      const target = cx.world.actor(cx.in('target'), 'Target');
      if (target) cx.callFunction(target, String(cx.node.config.graph), cx.params());
      return ['then'];
    },
  },

  // -------------------------------------------------------- interfaces

  'iface.message': {
    // Sent to anything: if the target does not implement the interface,
    // nothing happens and no error is logged. That is the point of it.
    exec: (cx) => {
      const target = cx.world.tryActor(cx.in('target'));
      const cls = target && cx.world.classOf(target);
      const { interface: iface, fn } = cx.node.config;
      if (target && cls?.interfaces.includes(String(iface))) {
        cx.callEvents(target, (n) => n.def === 'event.interface' && n.config.interface === iface && n.config.fn === fn, {});
      } else if (target) cx.world.note('iface.notImplemented', target.label);
      else cx.world.note('iface.noTarget');
      return ['then'];
    },
  },

  'iface.doesImplement': {
    pure: (cx) => {
      const a = cx.world.tryActor(cx.in('object'));
      const cls = a && cx.world.classOf(a);
      return { result: !!cls?.interfaces.includes(String(cx.node.config.interface)) };
    },
  },
};
