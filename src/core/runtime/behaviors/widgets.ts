/**
 * UMG functions. One local player here: a widget's owner is the player's
 * controller (Create Widget without Owning Player takes the first local
 * player, as UE does), its pawn the player. Only the Designer's preview
 * makes a widget with no owner.
 * The work is done by core/umg/runtime; life-cycle events (On Initialized,
 * Construct, Destruct) run as synchronous calls, before the chain goes on.
 */
import type { NodeInstance } from '../../model/project';
import { spawnPins } from '../../model/project';
import { VIS_COLLAPSED, VIS_HIDDEN, type WidgetProps } from '../../model/widgets';
import type { UmgEvent } from '../../umg/runtime';
import { copyValue } from '../values';
import type { ActorRT, RValue } from '../world';
import { RESUME, type Behavior, type ExecCx, type ValueCx } from './types';

/** Run life-cycle events as calls of this node: they finish before its exec output continues. */
function call(cx: ExecCx, events: UmgEvent[]): number {
  let n = 0;
  for (const e of events) n += cx.callEvents(e.obj, (x: NodeInstance) => x.def === e.def, e.outputs);
  return n;
}

/** The widget object behind Target (or a pin), logging Accessed None when empty. */
function widgetObj(cx: ValueCx, pin = 'target', label = 'Target'): ActorRT | null {
  const o = cx.world.actor(cx.in(pin), label);
  if (o && !o.widget && !o.widgetEl) {
    cx.world.runtimeError(`${o.label} n’est pas un widget.`);
    return null;
  }
  return o;
}

/** A widget of a Designer or a widget object, as the UMG runtime targets it. */
function target(cx: ValueCx) {
  const o = widgetObj(cx);
  return o ? cx.world.umg.target(o) : undefined;
}

function setter(build: (cx: ExecCx) => Partial<WidgetProps>): Behavior {
  return {
    exec: (cx) => {
      const t = target(cx);
      if (t) cx.world.umg.setProp(t, build(cx));
      return ['then'];
    },
  };
}

function getter<K extends keyof WidgetProps>(key: K, map: (v: WidgetProps[K]) => RValue = (v) => v as RValue): Behavior {
  return {
    pure: (cx) => {
      const t = target(cx);
      return { result: t ? map(cx.world.umg.prop(t, key)) : null };
    },
  };
}

export const widgetBehaviors: Record<string, Behavior> = {
  'widget.getOwningPlayer': {
    pure: (cx) => {
      const o = cx.world.tryActor(cx.in('target'));
      const owner = o?.widget?.owner ?? (o?.widgetEl ? cx.world.tryActor({ ref: 'actor', id: o.widgetEl.host })?.widget?.owner : null);
      return { result: owner ? { ref: 'actor', id: owner } : null };
    },
  },
  'widget.getOwningPlayerPawn': {
    pure: (cx) => {
      const o = cx.world.tryActor(cx.in('target'));
      const owner = o?.widget?.owner ?? (o?.widgetEl ? cx.world.tryActor({ ref: 'actor', id: o.widgetEl.host })?.widget?.owner : null);
      return { result: owner ? { ref: 'actor', id: 'player' } : null };
    },
  },

  'widget.create': {
    // As UE's Create Widget: the object, then On Initialized (a synchronous call), then the Expose on Spawn values.
    exec: (cx) => {
      const st = cx.state(() => ({ pending: '' }));
      const expose = (o: ActorRT) => {
        const cls = cx.node.defaults.class === o.classId ? cx.world.classOf(o) : undefined;
        for (const v of cls ? spawnPins(cls) : []) o.vars[v.id] = copyValue(cx.in(`expose:${v.id}`));
      };
      if (cx.entry === RESUME) {
        const o = cx.world.tryActor({ ref: 'actor', id: st.pending });
        st.pending = '';
        if (o) expose(o);
        return ['then'];
      }
      const id = cx.in('class');
      if (typeof id !== 'string' || !id) {
        cx.world.runtimeError('Create Widget failed because no class was specified');
        cx.out('result', null);
        return ['then'];
      }
      // Owning Player left empty: UE gives the widget the first local player (GetFirstGamePlayer), here the only one.
      const made = cx.world.umg.create(id, cx.world.playerController().id);
      if (!made) {
        cx.world.runtimeError('Create Widget : la classe choisie n’est pas un Widget Blueprint.');
        cx.out('result', null);
        return ['then'];
      }
      cx.out('result', { ref: 'actor', id: made.obj.id });
      if (call(cx, made.events) > 0) {
        st.pending = made.obj.id;
        cx.resume();
        return [];
      }
      expose(made.obj);
      return ['then'];
    },
  },

  'widget.addToViewport': {
    exec: (cx) => {
      const o = widgetObj(cx);
      if (o?.widget) call(cx, cx.world.umg.addToViewport(o, cx.num('zOrder')));
      else if (o) cx.world.runtimeError(`${o.label} est un widget du Designer : seul un widget créé par Create Widget s’ajoute au viewport.`);
      return ['then'];
    },
  },
  'widget.removeFromParent': {
    exec: (cx) => {
      const t = target(cx);
      if (t) call(cx, cx.world.umg.removeFromParent(t));
      return ['then'];
    },
  },
  'widget.isInViewport': {
    pure: (cx) => {
      const o = widgetObj(cx);
      return { result: !!o && cx.world.umg.isInViewport(o) };
    },
  },

  'widget.setVisibility': setter((cx) => ({ visibility: Math.trunc(cx.num('visibility')) })),
  'widget.getVisibility': getter('visibility'),
  'widget.isVisible': getter('visibility', (v) => v !== VIS_COLLAPSED && v !== VIS_HIDDEN),
  'widget.setIsEnabled': setter((cx) => ({ enabled: cx.bool('enabled') })),
  'widget.getIsEnabled': getter('enabled', (v) => v !== false),
  'widget.setText': setter((cx) => ({ text: cx.str('text') })),
  'widget.getText': getter('text'),
  'widget.setTextColor': setter((cx) => ({ color: String(cx.in('color') ?? '#ffffff') })),
  // The value is kept as given; the bar only draws 0 to 1.
  'widget.setPercent': setter((cx) => ({ percent: cx.num('percent') })),
  'widget.getPercent': getter('percent'),
  'widget.setFillColor': setter((cx) => ({ fillColor: String(cx.in('color') ?? '#ffffff') })),

  'widget.addChildToVerticalBox': { exec: addChild },
  'widget.addChildToHorizontalBox': { exec: addChild },
  'widget.removeChild': {
    exec: (cx) => {
      const t = target(cx);
      const content = widgetObj(cx, 'content', 'Content');
      const r = t && content ? cx.world.umg.removeChild(t, content) : { found: false, events: [] };
      cx.out('result', r.found);
      call(cx, r.events);
      return ['then'];
    },
  },
  'widget.clearChildren': {
    exec: (cx) => {
      const t = target(cx);
      if (t) call(cx, cx.world.umg.clearChildren(t));
      return ['then'];
    },
  },
  'widget.getChildrenCount': {
    pure: (cx) => {
      const t = target(cx);
      return { result: (t && cx.world.umg.childrenOf(t)?.length) ?? 0 };
    },
  },
};

function addChild(cx: ExecCx): string[] {
  const t = target(cx);
  const content = widgetObj(cx, 'content', 'Content');
  if (!t || !content) return ['then'];
  const r = cx.world.umg.addChild(t, content);
  if (r.ok) call(cx, r.events);
  else cx.world.runtimeError(r.reason);
  return ['then'];
}
