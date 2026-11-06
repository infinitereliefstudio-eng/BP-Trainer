/** Impure nodes acting on the world: variables, printing, components, actors. */
import type { Vec3 } from '../../types/values';
import type { ActorRT, ComponentRT } from '../world';
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
    exec: (cx) => {
      const v = cx.in('value');
      cx.actor.vars[String(cx.node.config.variable)] = v;
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

  'actor.destroy': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      if (a) cx.world.destroy(a);
      return ['then'];
    },
  },
};
