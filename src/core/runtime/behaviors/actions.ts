/** Impure nodes acting on the world: variables, printing, components, actors. */
import type { Vec3 } from '../../types/values';
import type { ActorRT, ComponentRT } from '../world';
import { copyValue } from '../values';
import type { Behavior } from './types';

function withChildren(actor: ActorRT, root: ComponentRT): ComponentRT[] {
  const out = [root];
  for (let i = 0; i < out.length; i++) {
    for (const c of actor.components) if (c.parent === out[i].id) out.push(c);
  }
  return out;
}

export const actionBehaviors: Record<string, Behavior> = {
  'var.set': {
    // UE copies arrays and vectors on Set: the variable never aliases another.
    exec: (cx) => {
      const v = copyValue(cx.in('value'));
      cx.actor.vars[String(cx.node.config.variable)] = v;
      cx.out('out', v);
      return ['then'];
    },
  },

  'var.setLocal': {
    exec: (cx) => {
      const v = copyValue(cx.in('value'));
      cx.setLocal(String(cx.node.config.variable), v);
      cx.out('out', v);
      return ['then'];
    },
  },

  'debug.printString': {
    exec: (cx) => {
      cx.world.print(cx.actor, cx.str('text'), {
        toScreen: cx.bool('toScreen'),
        toLog: cx.bool('toLog'),
        duration: cx.num('duration'),
      });
      return ['then'];
    },
  },

  'component.setVisibility': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      if (c) {
        const visible = cx.bool('visible');
        const owner = cx.world.ownerOf(c);
        const list = cx.bool('propagate') && owner ? withChildren(owner, c) : [c];
        for (const k of list) k.props.visible = visible;
      }
      return ['then'];
    },
  },

  'component.toggleVisibility': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      if (c) {
        const visible = !c.props.visible;
        const owner = cx.world.ownerOf(c);
        const list = cx.bool('propagate') && owner ? withChildren(owner, c) : [c];
        for (const k of list) k.props.visible = visible;
      }
      return ['then'];
    },
  },

  'component.setRelativeRotation': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      const r = cx.in('rotation') as Vec3 | null;
      if (c && r) c.props.yaw = Number(r.z) || 0;
      return ['then'];
    },
  },

  'component.setRelativeLocation': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      const v = cx.in('location') as Vec3 | null;
      if (c && v) {
        c.props.x = Number(v.x) || 0;
        c.props.y = Number(v.y) || 0;
      }
      return ['then'];
    },
  },

  'component.setIntensity': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      if (c) c.props.intensity = Math.max(0, cx.num('intensity'));
      return ['then'];
    },
  },

  'component.setText': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      if (c) c.props.text = cx.str('value');
      return ['then'];
    },
  },

  'component.isVisible': {
    pure: (cx) => ({ result: !!cx.world.component(cx.in('target'), 'Target')?.props.visible }),
  },

  'component.addRelativeRotation': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      const r = cx.in('delta') as Vec3 | null;
      if (c && r) c.props.yaw += Number(r.z) || 0;
      return ['then'];
    },
  },

  'component.setLightColor': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      if (c) c.props.color = cx.str('color') || '#ffffff';
      return ['then'];
    },
  },

  'component.setCollisionEnabled': {
    exec: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      if (c) c.props.collision = Math.max(0, Math.min(3, Math.trunc(cx.num('collision'))));
      return ['then'];
    },
  },

  'var.incrementInt': step(1, true),
  'var.decrementInt': step(-1, true),
  'var.incrementFloat': step(1, false),
  'var.decrementFloat': step(-1, false),
};

/** Increment / Decrement: the variable wired to Value changes by `delta`. */
function step(delta: number, asInt: boolean): Behavior {
  return {
    exec: (cx) => {
      const v = (asInt ? Math.trunc(cx.num('value')) : cx.num('value')) + delta;
      if (!cx.writeRef('value', v)) cx.world.runtimeError(`${cx.node.def.endsWith('Int') ? 'Increment Int' : 'Increment Float'} : Value doit être relié à une variable.`);
      cx.out('result', v);
      return ['then'];
    },
  };
}
