/** Behaviour of the Widget Component's node (V7.42). */
import type { Behavior } from './types';

export const widgetComponentBehaviors: Record<string, Behavior> = {
  'widgetComponent.getUserWidgetObject': {
    // UE gives None, without an error, when the component has no widget (Widget Class None, or not begun yet).
    pure: (cx) => {
      const c = cx.world.component(cx.in('target'), 'Target');
      return { result: c?.widget ? { ref: 'actor', id: c.widget } : null };
    },
  },
};
