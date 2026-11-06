/** Flow control and latent nodes, following UE's documented behaviour. */
import { RESUME, type Behavior } from './types';

export const flowBehaviors: Record<string, Behavior> = {
  'flow.branch': {
    exec: (cx) => (cx.bool('condition') ? ['true'] : ['false']),
  },

  'flow.sequence': {
    exec: (cx) => {
      const n = Math.max(1, Number(cx.node.config.outputs ?? 2));
      return Array.from({ length: n }, (_, i) => `then${i}`);
    },
  },

  'flow.doOnce': {
    exec: (cx) => {
      const st = cx.state(() => ({ ready: false, closed: false }));
      if (!st.ready) {
        st.ready = true;
        st.closed = cx.bool('startClosed');
      }
      if (cx.entry === 'reset') {
        st.closed = false;
        return [];
      }
      if (st.closed) return [];
      st.closed = true;
      return ['completed'];
    },
  },

  'flow.flipFlop': {
    exec: (cx) => {
      const st = cx.state(() => ({ nextIsA: true }));
      const isA = st.nextIsA;
      st.nextIsA = !isA;
      cx.out('isA', isA);
      return [isA ? 'a' : 'b'];
    },
  },

  'flow.gate': {
    exec: (cx) => {
      const st = cx.state(() => ({ ready: false, open: true }));
      if (!st.ready) {
        st.ready = true;
        st.open = !cx.bool('startClosed');
      }
      switch (cx.entry) {
        case 'open':
          st.open = true;
          return [];
        case 'close':
          st.open = false;
          return [];
        case 'toggle':
          st.open = !st.open;
          return [];
        default:
          return st.open ? ['exit'] : [];
      }
    },
  },

  'flow.forLoop': {
    // Like UE's macro: Last Index is re-read at every iteration, and the
    // whole loop runs before anything else (a Delay inside fires once).
    exec: (cx) => {
      const st = cx.state(() => ({ i: 0 }));
      if (cx.entry === RESUME) st.i += 1;
      else st.i = Math.trunc(cx.num('first'));
      if (st.i <= Math.trunc(cx.num('last'))) {
        cx.out('index', st.i);
        cx.resume();
        return ['body'];
      }
      return ['completed'];
    },
  },

  'time.delay': {
    // A Delay already counting ignores new calls.
    exec: (cx) => {
      if (!cx.latentActive()) cx.startLatent(Math.max(0, cx.num('duration')), 'completed');
      return [];
    },
  },

  'time.retriggerableDelay': {
    // Each new call restarts the countdown.
    exec: (cx) => {
      cx.startLatent(Math.max(0, cx.num('duration')), 'completed');
      return [];
    },
  },
};
